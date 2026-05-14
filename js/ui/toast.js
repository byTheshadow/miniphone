/* ============================================================
   toast.js — 全局 Toast 提示组件
   ============================================================ */

/* [TOAST-CORE START] Toast 核心 */
const Toast = (() => {

  let _root  = null;
  let _queue = [];
  let _showing = false;

  function _ensureRoot() {
    _root = document.getElementById('toast-root');
    if (_root) {
      _root.style.cssText = `
        position:fixed;top:60px;left:50%;transform:translateX(-50%);
        z-index:2000;display:flex;flex-direction:column;
        align-items:center;gap:8px;pointer-events:none;`;
    }
  }

  /**
   * 显示 Toast
   * @param {string} message
   * @param {'info'|'success'|'error'|'warning'} [type]
   * @param {number} [duration] - ms，默认 2500
   */
  function show(message, type = 'info', duration = 2500) {
    _queue.push({ message, type, duration });
    if (!_showing) _processQueue();
  }

  function _processQueue() {
    if (_queue.length === 0) { _showing = false; return; }
    _showing = true;
    const { message, type, duration } = _queue.shift();
    _ensureRoot();
    if (!_root) return;

        /* [TOAST-RENDER START] 渲染 Toast */
    const ICONS = {
      info:    'ℹ️',
      success: '✅',
      error:   '❌',
      warning: '⚠️',
    };

    const COLORS = {
      info:    'rgba(123,140,255,0.18)',
      success: 'rgba(94,255,160,0.18)',
      error:   'rgba(255,107,107,0.18)',
      warning: 'rgba(255,209,102,0.18)',
    };

    const toastEl = document.createElement('div');
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:10px 18px;border-radius:20px;
      background:${COLORS[type] ?? COLORS.info};
      backdrop-filter:blur(20px) saturate(180%);
      -webkit-backdrop-filter:blur(20px) saturate(180%);
      border:1px solid rgba(255,255,255,0.12);
      box-shadow:0 4px 20px rgba(0,0,0,0.4);
      color:var(--text-primary);
      font-size:13px;font-weight:500;
      max-width:300px;text-align:center;
      pointer-events:none;
      animation:slideUp 0.22s cubic-bezier(0.25,0.46,0.45,0.94);`;

    toastEl.innerHTML = `
      <span aria-hidden="true">${ICONS[type] ?? ICONS.info}</span>
      <span>${_escHtml(message)}</span>`;

    _root.appendChild(toastEl);
    /* [TOAST-RENDER END] */

    /* [TOAST-DISMISS START] 自动消失 */
    setTimeout(() => {
      toastEl.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      toastEl.style.opacity    = '0';
      toastEl.style.transform  = 'translateY(-8px)';
      setTimeout(() => {
        toastEl.remove();
        _processQueue();
      }, 220);
    }, duration);
    /* [TOAST-DISMISS END] */
  }

  // 快捷方法
  const success = (msg, dur) => show(msg, 'success', dur);
  const error   = (msg, dur) => show(msg, 'error',   dur);
  const warning = (msg, dur) => show(msg, 'warning', dur);
  const info    = (msg, dur) => show(msg, 'info',    dur);

  return { show, success, error, warning, info };

})();
/* [TOAST-CORE END] */

/* ============================================================
   toast.js END
   ============================================================ */
