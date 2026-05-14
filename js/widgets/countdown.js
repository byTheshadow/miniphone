
/* ============================================================
   countdown.js — 倒数日小组件
   尺寸：2×1，支持用户自定义事件名和目标日期
   ============================================================ */

/* [WIDGET-COUNTDOWN START] 倒数日小组件注册 */
WidgetRegistry.register({
  id:          'countdown',
  name:        '倒数日',
  emoji:       '📅',
  sizes:       ['2x1', '2x2'],
  defaultSize: '2x1',
  desc:        '重要日期倒计时',

  mount(container, config = {}) {
    /* [COUNTDOWN-RENDER START] 渲染结构 */
    container.classList.add('widget-countdown');

    // 从 Storage 读取配置，config 优先
    const savedKey = `widget_countdown_${container.dataset?.widgetId ?? 'default'}`;
    const saved    = Storage.lsGet(savedKey, {});
    const cfg = {
      eventName:  config.eventName  ?? saved.eventName  ?? '新年快乐',
      targetDate: config.targetDate ?? saved.targetDate ?? `${new Date().getFullYear() + 1}-01-01`,
      prefix:     config.prefix     ?? saved.prefix     ?? '还有',
      suffix:     config.suffix     ?? saved.suffix     ?? '天',
    };

    container.innerHTML = `
      <div class="widget-inner">
        <div class="countdown-prefix">${cfg.prefix}</div>
        <div class="countdown-days" id="wg-cd-days">--</div>
        <div class="countdown-event">${cfg.eventName}<span style="color:var(--text-tertiary);margin-left:4px">${cfg.suffix}</span></div>
      </div>`;
    /* [COUNTDOWN-RENDER END] */

    /* [COUNTDOWN-CALC START] 计算天数 */
    function update() {
      const daysEl = container.querySelector('#wg-cd-days');
      if (!daysEl) return;
      const now    = new Date();
      const target = new Date(cfg.targetDate);
      const diff   = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        daysEl.textContent = diff;
      } else if (diff === 0) {
        daysEl.textContent = '今天';
        daysEl.style.fontSize = '22px';
      } else {
        daysEl.textContent = Math.abs(diff);
        container.querySelector('.countdown-prefix').textContent = '已过';
      }
    }

    update();
    // 每分钟更新一次（天数不需要秒级）
    const timer = setInterval(update, 60 * 1000);
    /* [COUNTDOWN-CALC END] */

    /* [COUNTDOWN-CLICK START] 点击编辑配置 */
    container.addEventListener('click', () => {
      if (Store.get('isEditMode')) return;
      _showCountdownEditor(cfg, savedKey, container);
    });
    /* [COUNTDOWN-CLICK END] */

    return () => clearInterval(timer);
  },
});

/* [COUNTDOWN-EDITOR START] 倒数日编辑弹窗 */
function _showCountdownEditor(cfg, savedKey, container) {
  if (typeof Modal === 'undefined') return;
  Modal.show({
    title: '编辑倒数日',
    content: `
      <div class="app-input-group">
        <label class="app-input-label">事件名称</label>
        <input class="app-input" id="cd-name"   value="${cfg.eventName}"  placeholder="如：生日、纪念日" />
      </div>
      <div class="app-input-group">
        <label class="app-input-label">目标日期</label>
        <input class="app-input" id="cd-date" type="date" value="${cfg.targetDate}" />
      </div>`,
    confirmText: '保存',
    onConfirm: () => {
      const name = document.getElementById('cd-name')?.value.trim();
      const date = document.getElementById('cd-date')?.value;
      if (!name || !date) return;
      cfg.eventName  = name;
      cfg.targetDate = date;
      Storage.lsSet(savedKey, cfg);
      // 重新渲染
      WidgetRegistry.unmount(container);
      WidgetRegistry.mount('countdown', container, cfg);
    },
  });
}
/* [COUNTDOWN-EDITOR END] */

/* ============================================================
   countdown.js END
   ============================================================ */
