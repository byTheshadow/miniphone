/* ========== [BLOCK: MiniPhone Toast 模块] ========== */
/**
 * MiniPhone.Toast
 *轻量级提示消息组件
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Toast = (function() {
  'use strict';

  var container = null;
  var queue = [];
  var maxVisible = 3;

  /* ========== [BLOCK: 样式注入] ========== */
  function injectStyles() {
    if (document.getElementById('toast-styles')) return;
    var style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = [
      '.toast-container {',
      '  position: fixed; top: calc(var(--safe-top, 20px) + 50px); left: 50%;',
      '  transform: translateX(-50%); z-index: var(--z-toast, 600);',
      '  display: flex; flex-direction: column; align-items: center; gap: 8px;',
      '  pointer-events: none; width: 90%; max-width: 360px;',
      '}',
      '.toast {',
      '  padding: 12px 20px; border-radius: 14px;',
      '  background: var(--bg-elevated, #3A3A3C);',
      '  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);',
      '  border: 1px solid var(--border-secondary, rgba(255,255,255,0.08));',
      '  color: var(--text-primary, #fff); font-size: 14px; font-weight: 500;',
      '  display: flex; align-items: center; gap: 8px;',
      '  pointer-events: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);',
      '  animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;',
      '  max-width: 100%; word-break: break-word;',
      '}',
      '.toast.toast--exit { animation: toastOut 0.25s ease forwards; }',
      '.toast__icon { font-size: 16px; flex-shrink: 0; }',
      '@keyframes toastIn { from { opacity:0; transform:translateY(-16px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }',
      '@keyframes toastOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(-10px) scale(0.95); } }'
    ].join('\n');
    document.head.appendChild(style);
  }
  /* ========== [/BLOCK: 样式注入] ========== */

  /* ========== [BLOCK: 类型图标映射] ========== */
  var typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  /* ========== [/BLOCK: 类型图标映射] ========== */

  /* ========== [BLOCK: 显示 Toast] ========== */
  function show(message, type, duration) {
    if (!container) {
      injectStyles();
      container = document.getElementById('toast-root');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-root';
        document.body.appendChild(container);
      }container.className = 'toast-container';
    }

    type = type || 'info';
    duration = duration || 2500;

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast__icon">' + (typeIcons[type] || typeIcons.info) + '</span>' +'<span>' + message + '</span>';

    container.appendChild(toast);
    queue.push(toast);

    // 超出最大数量时移除最早的
    while (queue.length > maxVisible) {
      removeToast(queue[0]);
    }

    // 自动消失
    setTimeout(function() {
      removeToast(toast);
    }, duration);

    return toast;
  }
  /* ========== [/BLOCK: 显示 Toast] ========== */

  /* ========== [BLOCK: 移除 Toast] ========== */
  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast--exit');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      queue = queue.filter(function(t) { return t !== toast; });
    }, 250);
  }
  /* ========== [/BLOCK: 移除 Toast] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    show: show,
    success: function(msg, dur) { return show(msg, 'success', dur); },
    error: function(msg, dur) { return show(msg, 'error', dur); },
    warning: function(msg, dur) { return show(msg, 'warning', dur); },
    info: function(msg, dur) { return show(msg, 'info', dur); }
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone Toast 模块] ========== */
