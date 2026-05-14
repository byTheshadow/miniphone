/* ============================================================
   sticky-note.js — 便签贴纸小组件
   尺寸：2×2，支持四种颜色，点击编辑内容
   ============================================================ */

/* [WIDGET-STICKY-NOTE START] 便签小组件注册 */
WidgetRegistry.register({
  id:          'sticky-note',
  name:        '便签',
  emoji:       '📝',
  sizes:       ['2x2', '4x2'],
  defaultSize: '2x2',
  desc:        '随手记便签',

  mount(container, config = {}) {
    /* [STICKY-DATA START] 数据 */
    const savedKey = `widget_sticky_${config.instanceId ?? 'default'}`;
    const saved    = Storage.lsGet(savedKey, {});
    const cfg = {
      content:   config.content   ?? saved.content   ?? '点击编辑便签内容 ✏️',
      colorClass: config.colorClass ?? saved.colorClass ?? 'note-yellow',
    };
    /* [STICKY-DATA END] */

    /* [STICKY-RENDER START] 渲染 */
    function render() {
      container.className = container.className
        .replace(/note-\w+/g, '')
        .trim();
      container.classList.add('widget-sticky-note', cfg.colorClass);

      const now     = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;

      container.innerHTML = `
        <div class="widget-inner">
          <div class="note-content">${_escHtml(cfg.content)}</div>
          <div class="note-date">${dateStr}</div>
        </div>`;
    }
    /* [STICKY-RENDER END] */

    render();

    /* [STICKY-CLICK START] 点击编辑 */
    container.addEventListener('click', () => {
      if (Store.get('isEditMode')) return;
      if (typeof Modal === 'undefined') return;

      Modal.show({
        title: '编辑便签',
        content: `
          <div class="app-input-group">
            <label class="app-input-label">内容</label>
            <textarea class="app-input" id="sn-content" rows="4"
              style="resize:none;line-height:1.6;"
              placeholder="写点什么...">${_escHtml(cfg.content)}</textarea>
          </div>
          <div class="app-input-group">
            <label class="app-input-label">颜色</label>
            <div style="display:flex;gap:10px;margin-top:4px;">
              ${[
                { cls: 'note-yellow', color: 'rgba(255,230,100,0.5)',  label: '黄' },
                { cls: 'note-pink',   color: 'rgba(255,150,180,0.5)',  label: '粉' },
                { cls: 'note-blue',   color: 'rgba(100,160,255,0.5)',  label: '蓝' },
                { cls: 'note-green',  color: 'rgba(100,220,160,0.5)',  label: '绿' },
              ].map(c => `
                <button class="sn-color-btn" data-cls="${c.cls}"
                  style="width:32px;height:32px;border-radius:50%;
                         background:${c.color};border:2px solid ${
                           cfg.colorClass === c.cls
                             ? 'var(--text-primary)'
                             : 'transparent'};
                         cursor:pointer;transition:border 0.15s;"
                  aria-label="${c.label}色便签">
                </button>`).join('')}
            </div>
          </div>`,
        confirmText: '保存',
        onMount: (modalEl) => {
          modalEl.querySelectorAll('.sn-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              cfg.colorClass = btn.dataset.cls;
              // 更新选中状态
              modalEl.querySelectorAll('.sn-color-btn').forEach(b => {
                b.style.border = b === btn
                  ? '2px solid var(--text-primary)'
                  : '2px solid transparent';
              });
            });
          });
        },
        onConfirm: () => {
          cfg.content = document.getElementById('sn-content')?.value ?? cfg.content;
          Storage.lsSet(savedKey, cfg);
          render();
        },
      });
    });
    /* [STICKY-CLICK END] */

    return () => {};
  },
});
/* [WIDGET-STICKY-NOTE END] */

/* ============================================================
   sticky-note.js END
   ============================================================ */
