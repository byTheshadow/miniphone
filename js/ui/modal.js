/* ========== [BLOCK: MiniPhone Modal 模块] ========== */
/**
 * MiniPhone.Modal
 * 通用弹窗组件，支持 alert / confirm / custom
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Modal = (function() {
  'use strict';

  var modalRoot = null;

  /* ========== [BLOCK: 样式注入] ========== */
  function injectStyles() {
    if (document.getElementById('modal-styles')) return;
    var style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = [
      '.modal-overlay {',
      '  position: fixed; inset: 0; z-index: var(--z-modal, 500);',
      '  background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);',
      '  display: flex; align-items: center; justify-content: center;',
      '  padding: 24px; animation: modalBgIn 0.2s ease forwards;',
      '}',
      '.modal-overlay.modal--exit { animation: modalBgOut 0.2s ease forwards; }',
      '.modal-box {',
      '  background: var(--bg-secondary, #1C1C1E);',
      '  border-radius: var(--radius-lg, 20px);',
      '  border: 1px solid var(--border-secondary, rgba(255,255,255,0.08));',
      '  width: 100%; max-width: 320px; overflow: hidden;',
      '  box-shadow: 0 20px 60px rgba(0,0,0,0.5);',
      '  animation: modalBoxIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;',
      '}',
      '.modal--exit .modal-box { animation: modalBoxOut 0.2s ease forwards; }',
      '.modal-body { padding: 24px 20px 16px; text-align: center; }',
      '.modal-body__title { font-size: 17px; font-weight: 600; color: var(--text-primary, #fff); margin-bottom: 8px; }',
      '.modal-body__message { font-size: 14px; color: var(--text-secondary, rgba(255,255,255,0.6)); line-height: 1.5; }',
      '.modal-body__input {',
      '  width: 100%; margin-top: 14px; padding: 10px 14px;',
      '  background: var(--bg-tertiary, #2C2C2E); border-radius: var(--radius-sm, 10px);',
      '  border: 1px solid var(--border-primary, rgba(255,255,255,0.18));',
      '  color: var(--text-primary, #fff); font-size: 15px;',
      '}',
      '.modal-body__input:focus { border-color: var(--color-primary, #007AFF); }',
      '.modal-actions { display: flex; border-top: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); }',
      '.modal-actions__btn {',
      '  flex: 1; padding: 14px; font-size: 16px; text-align: center;',
      '  color: var(--color-primary, #007AFF); cursor: pointer;',
      '  transition: background 0.15s;',
      '}',
      '.modal-actions__btn:active { background: var(--bg-tertiary, #2C2C2E); }',
      '.modal-actions__btn + .modal-actions__btn { border-left: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); }',
      '.modal-actions__btn--danger { color: var(--color-danger, #FF3B30); }',
      '.modal-actions__btn--bold { font-weight: 600; }',
      '.modal-custom-content { padding: 20px; }',
      '@keyframes modalBgIn { from{opacity:0} to{opacity:1} }',
      '@keyframes modalBgOut { from{opacity:1} to{opacity:0} }',
      '@keyframes modalBoxIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }',
      '@keyframes modalBoxOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.9)} }'
    ].join('\n');
    document.head.appendChild(style);
  }
  /* ========== [/BLOCK: 样式注入] ========== */

  /* ========== [BLOCK: 获取容器] ========== */
  function getRoot() {
    if (!modalRoot) {
      injectStyles();
      modalRoot = document.getElementById('modal-root');
      if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.id = 'modal-root';
        document.body.appendChild(modalRoot);
      }
    }
    return modalRoot;
  }
  /* ========== [/BLOCK: 获取容器] ========== */

  /* ========== [BLOCK: 关闭弹窗] ========== */
  function close(overlay) {
    if (!overlay) return;
    overlay.classList.add('modal--exit');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }
  /* ========== [/BLOCK: 关闭弹窗] ========== */

  /* ========== [BLOCK: Alert 弹窗] ========== */
  function alert(title, message) {
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-box">' +
          '<div class="modal-body">' +
            '<div class="modal-body__title">' + (title || '') + '</div>' +
            (message ? '<div class="modal-body__message">' + message + '</div>' : '') +
          '</div>' +
          '<div class="modal-actions">' +
            '<div class="modal-actions__btn modal-actions__btn--bold" data-action="ok">好的</div>' +
          '</div>' +
        '</div>';

      overlay.querySelector('[data-action="ok"]').addEventListener('click', function() {
        close(overlay);
        resolve();
      });

      getRoot().appendChild(overlay);
    });
  }
  /* ========== [/BLOCK: Alert 弹窗] ========== */

  /* ========== [BLOCK: Confirm 弹窗] ========== */
  function confirm(title, message, options) {
    options = options || {};
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-box">' +
          '<div class="modal-body">' +
            '<div class="modal-body__title">' + (title || '') + '</div>' +
            (message ? '<div class="modal-body__message">' + message + '</div>' : '') +
          '</div>' +
          '<div class="modal-actions">' +
            '<div class="modal-actions__btn" data-action="cancel">' + (options.cancelText || '取消') + '</div>' +
            '<div class="modal-actions__btn modal-actions__btn--bold ' +
              (options.danger ? 'modal-actions__btn--danger' : '') +
              '" data-action="ok">' + (options.okText || '确定') + '</div>' +
          '</div>' +
        '</div>';

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function() {
        close(overlay);
        resolve(false);
      });
      overlay.querySelector('[data-action="ok"]').addEventListener('click', function() {
        close(overlay);
        resolve(true);
      });

      getRoot().appendChild(overlay);
    });
  }
  /* ========== [/BLOCK: Confirm 弹窗] ========== */

  /* ========== [BLOCK: Prompt 弹窗] ========== */
  function prompt(title, message, options) {
    options = options || {};
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-box">' +
          '<div class="modal-body">' +
            '<div class="modal-body__title">' + (title || '') + '</div>' +
            (message ? '<div class="modal-body__message">' + message + '</div>' : '') +
            '<input class="modal-body__input" type="' + (options.type || 'text') + '" ' +
              'placeholder="' + (options.placeholder || '') + '" ' +
              'value="' + (options.defaultValue || '') + '">' +
          '</div>' +
          '<div class="modal-actions">' +
            '<div class="modal-actions__btn" data-action="cancel">' + (options.cancelText || '取消') + '</div>' +
            '<div class="modal-actions__btn modal-actions__btn--bold" data-action="ok">' + (options.okText || '确定') + '</div>' +
          '</div>' +
        '</div>';

      var input = overlay.querySelector('.modal-body__input');
      setTimeout(function() { input.focus(); }, 100);

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function() {
        close(overlay);
        resolve(null);
      });
      overlay.querySelector('[data-action="ok"]').addEventListener('click', function() {
        close(overlay);
        resolve(input.value);
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          close(overlay);
          resolve(input.value);
        }
      });

      getRoot().appendChild(overlay);
    });
  }
  /* ========== [/BLOCK: Prompt 弹窗] ========== */

  /* ========== [BLOCK: 自定义内容弹窗] ========== */
  function custom(contentHTML, options) {
    options = options || {};
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal-box" style="max-width:' + (options.maxWidth || '320px') + '">' +
          '<div class="modal-custom-content">' + contentHTML + '</div>' +
        '</div>';

      // 点击遮罩关闭
      if (options.closeOnOverlay !== false) {
        overlay.addEventListener('click', function(e) {
          if (e.target === overlay) {
            close(overlay);
            resolve(null);
          }
        });
      }

      getRoot().appendChild(overlay);

      resolve({
        el: overlay,
        box: overlay.querySelector('.modal-box'),
        content: overlay.querySelector('.modal-custom-content'),
        close: function() { close(overlay); }
      });
    });
  }
  /* ========== [/BLOCK: 自定义内容弹窗] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    alert: alert,
    confirm: confirm,
    prompt: prompt,
    custom: custom,
    close: close
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone Modal 模块] ========== */
