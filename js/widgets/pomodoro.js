/* ============================================================
   pomodoro.js — 番茄钟小组件
   尺寸：2×2，25分钟专注 + 5分钟休息循环
   ============================================================ */

/* [WIDGET-POMODORO START] 番茄钟小组件注册 */
WidgetRegistry.register({
  id:          'pomodoro',
  name:        '番茄钟',
  emoji:       '🍅',
  sizes:       ['2x2'],
  defaultSize: '2x2',
  desc:        '专注计时器',

  mount(container) {
    container.classList.add('widget-pomodoro');

    /* [POMODORO-STATE START] 状态 */
    const FOCUS_SEC = 25 * 60;
    const BREAK_SEC = 5  * 60;
    let totalSec    = FOCUS_SEC;
    let remaining   = FOCUS_SEC;
    let isRunning   = false;
    let isBreak     = false;
    let timer       = null;
    const CIRCUMFERENCE = 2 * Math.PI * 30; // r=30
    /* [POMODORO-STATE END] */

    /* [POMODORO-RENDER START] 渲染结构 */
    container.innerHTML = `
      <div class="widget-inner" style="align-items:center;">
        <div class="widget-label" id="wg-pomo-label">专注时间</div>
        <div class="pomodoro-ring">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle class="ring-bg"   cx="36" cy="36" r="30"/>
            <circle class="ring-fill" cx="36" cy="36" r="30"
              stroke-dasharray="${CIRCUMFERENCE}"
              stroke-dashoffset="0"
              id="wg-pomo-ring"/>
          </svg>
          <div class="pomodoro-time" id="wg-pomo-time">25:00</div>
        </div>
        <div class="pomodoro-label" id="wg-pomo-sublabel">点击开始</div>
        <button class="pomodoro-btn" id="wg-pomo-btn">开始</button>
      </div>`;
    /* [POMODORO-RENDER END] */

    const timeEl     = container.querySelector('#wg-pomo-time');
    const ringEl     = container.querySelector('#wg-pomo-ring');
    const btnEl      = container.querySelector('#wg-pomo-btn');
    const labelEl    = container.querySelector('#wg-pomo-label');
    const sublabelEl = container.querySelector('#wg-pomo-sublabel');

    /* [POMODORO-LOGIC START] 计时逻辑 */
    function updateDisplay() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      if (timeEl) timeEl.textContent =
        `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

      // 环形进度
      const progress = remaining / totalSec;
      const offset   = CIRCUMFERENCE * (1 - progress);
      if (ringEl) {
        ringEl.style.strokeDashoffset = offset;
        ringEl.style.stroke = isBreak
          ? 'var(--accent-success)'
          : 'var(--accent-danger)';
      }
    }

    function startTimer() {
      if (isRunning) return;
      isRunning = true;
      if (btnEl) btnEl.textContent = '暂停';
      timer = setInterval(() => {
        remaining--;
        updateDisplay();
        if (remaining <= 0) {
          clearInterval(timer);
          isRunning = false;
          // 切换模式
          isBreak    = !isBreak;
          totalSec   = isBreak ? BREAK_SEC : FOCUS_SEC;
          remaining  = totalSec;
                    if (labelEl)    labelEl.textContent    = isBreak ? '休息时间' : '专注时间';
          if (sublabelEl) sublabelEl.textContent = isBreak ? '好好休息一下 ☕' : '点击开始';
          if (btnEl)      btnEl.textContent      = '开始';
          updateDisplay();
        }
      }, 1000);
    }

    function pauseTimer() {
      clearInterval(timer);
      isRunning = false;
      if (btnEl) btnEl.textContent = '继续';
    }

    function resetTimer() {
      clearInterval(timer);
      isRunning  = false;
      isBreak    = false;
      totalSec   = FOCUS_SEC;
      remaining  = FOCUS_SEC;
      if (labelEl)    labelEl.textContent    = '专注时间';
      if (sublabelEl) sublabelEl.textContent = '点击开始';
      if (btnEl)      btnEl.textContent      = '开始';
      updateDisplay();
    }
    /* [POMODORO-LOGIC END] */

    /* [POMODORO-EVENTS START] 按钮事件 */
    btnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    // 长按重置
    let resetTimer_ = null;
    btnEl?.addEventListener('mousedown',  () => { resetTimer_ = setTimeout(resetTimer, 800); });
    btnEl?.addEventListener('touchstart', () => { resetTimer_ = setTimeout(resetTimer, 800); }, { passive: true });
    btnEl?.addEventListener('mouseup',    () => clearTimeout(resetTimer_));
    btnEl?.addEventListener('touchend',   () => clearTimeout(resetTimer_), { passive: true });
    /* [POMODORO-EVENTS END] */

    updateDisplay();

    return () => clearInterval(timer);
  },
});
/* [WIDGET-POMODORO END] */

/* ============================================================
   pomodoro.js END
   ============================================================ */

