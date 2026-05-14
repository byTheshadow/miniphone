/* ============================================================
   modal.js — 全局弹窗组件
   支持标题、内容、确认/取消按钮、onMount 钩子
   ============================================================ */

/* [MODAL-CORE START] Modal 核心 */
const Modal = (() => {

  let _root      = null;
  let _overlay   = null;
  let _onConfirm = null;
  let _onCancel  = null;

  function _ensureRoot() {
    _root = document.getElementById('modal-root');
  }

  /**
   * 显示弹窗
   * @param {Object}   opts
   * @param {string}   opts.title
   * @param {string}   opts.content        - HTML 字符串
   * @param {string}   [opts.confirmText]  - 默认 '确认'
   * @param {string}   [opts.cancelText]   - 默认 '取消'
   * @param {boolean}  [opts.showConfirm]  - 默认 true
   * @param {boolean}  [opts.showCancel]   - 默认 true
   * @param {Function} [opts.onConfirm]
   * @param {Function} [opts.onCancel]
   * @param {Function} [opts.onMount]      - (modalEl) => void，DOM 挂载后调用
   */
  function show(opts = {}) {
    _ensureRoot();
    if (!_root) return;

    const {
      title       = '',
      content     = '',
      confirmText = '确认',
      cancelText  = '取消',
      showConfirm = true,
      showCancel  = true,
      onConfirm   = null,
      onCancel    = null,
      onMount     = null,
    } = opts;

    _onConfirm = onConfirm;
    _onCancel  = onCancel;

    /* [MODAL-RENDER START] 渲染弹窗 HTML */
    _root.innerHTML = `
      <div id="modal-overlay"
        style="position:fixed;inset:0;z-index:1000;
               display:flex;align-items:flex-end;justify-content:center;
               background:rgba(0,0,0,0.55);
               backdrop-filter:blur(4px);
               -webkit-backdrop-filter:blur(4px);
               animation:fadeIn 0.2s ease;">
        <div id="modal-box"
          role="dialog" aria-modal="true" aria-label="${_escHtml(title)}"
          style="width:100%;max-width:390px;
                 background:var(--bg-secondary);
                 border-radius:24px 24px 0 0;
                 padding:0 0 env(safe-area-inset-bottom,16px);
                 animation:slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94);
                 max-height:85dvh;display:flex;flex-direction:column;">
          <!-- 拖动把手 -->
          <div style="width:36px;height:4px;border-radius:2px;
                      background:var(--border-default);
                      margin:10px auto 0;flex-shrink:0;"></div>
          <!-- 标题 -->
          ${title ? `
            <div style="padding:16px 20px 0;font-size:17px;font-weight:700;
                        color:var(--text-primary);flex-shrink:0;">
              ${_escHtml(title)}
            </div>` : ''}
          <!-- 内容 -->
          <div id="modal-content"
            style="padding:16px 20px;overflow-y:auto;flex:1;
                   -webkit-overflow-scrolling:touch;">
            ${content}
          </div>
          <!-- 按钮区 -->
          ${(showConfirm || showCancel) ? `
            <div style="display:flex;gap:10px;padding:0 20px 16px;flex-shrink:0;">
              ${showCancel ? `
                <button id="modal-cancel" class="btn btn-secondary"
                  style="flex:1;" aria-label="${_escHtml(cancelText)}">
                  ${_escHtml(cancelText)}
                </button>` : ''}
              ${showConfirm ? `
                <button id="modal-confirm" class="btn btn-primary"
                  style="flex:2;" aria-label="${_escHtml(confirmText)}">
                  ${_escHtml(confirmText)}
                </button>` : ''}
            </div>` : ''}
        </div>
      </div>`;
    /* [MODAL-RENDER END] */

    _overlay = _root.querySelector('#modal-overlay');
    const modalBox = _root.querySelector('#modal-box');

    /* [MODAL-EVENTS START] 事件绑定 */
    _root.querySelector('#modal-confirm')?.addEventListener('click', () => {
      _onConfirm?.();
      close();
    });

    _root.querySelector('#modal-cancel')?.addEventListener('click', () => {
      _onCancel?.();
      close();
    });

    // 点击遮罩关闭
    _overlay?.addEventListener('click', (e) => {
      if (e.target === _overlay) {
        _onCancel?.();
        close();
      }
    });

    // ESC 关闭
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { _onCancel?.(); close(); }
    };
    document.addEventListener('keydown', onKeyDown);
    modalBox._removeKeyDown = () => document.removeEventListener('keydown', onKeyDown);
    /* [MODAL-EVENTS END] */

    // onMount 钩子
    onMount?.(_root.querySelector('#modal-content'));
  }

  /**
   * 关闭弹窗
   */
  function close() {
    _ensureRoot();
    const modalBox = _root?.querySelector('#modal-box');
    modalBox?._removeKeyDown?.();
    if (_overlay) {
      _overlay.style.animation = 'fadeIn 0.18s ease reverse';
      setTimeout(() => {
        if (_root) _root.innerHTML = '';
      }, 180);
    } else {
      if (_root) _root.innerHTML = '';
    }
    _onConfirm = null;
    _onCancel  = null;
  }

  return { show, close };

})();
/* [MODAL-CORE END] */

/* ============================================================
   modal.js END
   ============================================================ */
