/* ============================================================
   clock.js — 时钟小组件
   尺寸：2×2，实时更新时间和日期
   ============================================================ */

/* [WIDGET-CLOCK START] 时钟小组件注册 */
WidgetRegistry.register({
  id:          'clock',
  name:        '时钟',
  emoji:       '🕐',
  sizes:       ['2x2'],
  defaultSize: '2x2',
  desc:        '实时时钟与日期',

  mount(container) {
    /* [CLOCK-RENDER START] 渲染结构 */
    container.classList.add('widget-clock', 'glass-dark');
    container.innerHTML = `
      <div class="widget-inner">
        <div class="widget-label">现在时刻</div>
        <div class="clock-time" id="wg-clock-time">00:00</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px;">
          <div class="clock-date"  id="wg-clock-date">--</div>
          <div class="clock-seconds" id="wg-clock-sec">:00</div>
        </div>
      </div>`;
    /* [CLOCK-RENDER END] */

    /* [CLOCK-TICK START] 时钟更新逻辑 */
    const timeEl = container.querySelector('#wg-clock-time');
    const dateEl = container.querySelector('#wg-clock-date');
    const secEl  = container.querySelector('#wg-clock-sec');

    const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];

    function tick() {
      const now  = new Date();
      const hh   = String(now.getHours()).padStart(2, '0');
      const mm   = String(now.getMinutes()).padStart(2, '0');
      const ss   = String(now.getSeconds()).padStart(2, '0');
      const M    = now.getMonth() + 1;
      const D    = now.getDate();
      const wd   = WEEKDAYS[now.getDay()];

      if (timeEl) timeEl.textContent = `${hh}:${mm}`;
      if (secEl)  secEl.textContent  = `:${ss}`;
      if (dateEl) dateEl.textContent = `${M}月${D}日 ${wd}`;
    }

    tick();
    const timer = setInterval(tick, 1000);
    /* [CLOCK-TICK END] */

    // 返回 cleanup 函数
    return () => clearInterval(timer);
  },
});
/* [WIDGET-CLOCK END] */

/* ============================================================
   clock.js END
   ============================================================ */
