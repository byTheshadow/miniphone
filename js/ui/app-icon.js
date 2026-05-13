/* ========== [BLOCK: MiniPhone AppIcon 模块] ========== */
/**
 * MiniPhone.AppIcon
 * App 图标渲染 + 自定义图标管理
 * 默认使用 Emoji，用户可上传自定义图标 URL
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.AppIcon = (function() {
  'use strict';

  var customIcons = {}; // { appId: iconUrl }

  /* ========== [BLOCK: 初始化 — 加载自定义图标] ========== */
  function init() {
    customIcons = MiniPhone.Storage.local.get('customIcons', {});
  }
  /* ========== [/BLOCK: 初始化 — 加载自定义图标] ========== */

  /* ========== [BLOCK: 渲染单个 App 图标] ========== */
  /**
   * @param {Object} appConfig - { id, name, emoji, color }
   * @param {Object} options - { showLabel, badge, onClick }
   * @returns {HTMLElement}
   */
  function render(appConfig, options) {
    options = options || {};
    var wrapper = document.createElement('div');
    wrapper.className = 'app-icon-wrapper';
    wrapper.setAttribute('data-app-id', appConfig.id);

    // 图标容器
    var iconEl = document.createElement('div');
    iconEl.className = 'app-icon';

    // 自定义背景色
    if (appConfig.color) {
      iconEl.style.background = appConfig.color;
    }

    // 判断使用自定义图标还是 Emoji
    var iconUrl = customIcons[appConfig.id];
    if (iconUrl) {
      var img = document.createElement('img');
      img.src = iconUrl;
      img.alt = appConfig.name;
      img.onerror = function() {
        // 加载失败回退到 Emoji
        iconEl.innerHTML = '';
        iconEl.textContent = appConfig.emoji || '📱';
      };
      iconEl.appendChild(img);
    } else {
      iconEl.textContent = appConfig.emoji || '📱';
    }

    // 未读角标
    if (options.badge && options.badge > 0) {
      var badgeEl = document.createElement('span');
      badgeEl.className = 'app-icon__badge';
      badgeEl.textContent = options.badge > 99 ? '99+' : options.badge;
      iconEl.appendChild(badgeEl);
    }

    wrapper.appendChild(iconEl);

    // 标签
    if (options.showLabel !== false) {
      var label = document.createElement('span');
      label.className = 'app-icon-label';
      label.textContent = appConfig.name;
      wrapper.appendChild(label);
    }

    // 点击事件
    wrapper.addEventListener('click', function() {
      if (options.onClick) {
        options.onClick(appConfig.id);
      } else {
        MiniPhone.Router.openApp(appConfig.id);
      }
    });

    // 长按事件（编辑图标）
    var longPressTimer = null;
    wrapper.addEventListener('touchstart', function(e) {
      longPressTimer = setTimeout(function() {
        showIconEditor(appConfig);
      }, 600);
    }, { passive: true });
    wrapper.addEventListener('touchend', function() {
      clearTimeout(longPressTimer);
    });
    wrapper.addEventListener('touchmove', function() {
      clearTimeout(longPressTimer);
    });

    return wrapper;
  }
  /* ========== [/BLOCK: 渲染单个 App 图标] ========== */

  /* ========== [BLOCK: 图标编辑器] ========== */
  function showIconEditor(appConfig) {
    var currentIcon = customIcons[appConfig.id] || '';
    MiniPhone.Modal.prompt(
      '自定义图标',
      '为「' + appConfig.name + '」设置图标 URL\n留空则恢复默认 Emoji',
      {
        placeholder: 'https://example.com/icon.png',
        defaultValue: currentIcon
      }
    ).then(function(url) {
      if (url === null) return; // 取消
      if (url.trim() === '') {
        delete customIcons[appConfig.id];
      } else {
        customIcons[appConfig.id] = url.trim();
      }
      MiniPhone.Storage.local.set('customIcons', customIcons);
      // 通知主屏幕刷新
      MiniPhone.Store.set('iconsUpdated', Date.now());
      MiniPhone.Toast.success('图标已更新');
    });
  }
  /* ========== [/BLOCK: 图标编辑器] ========== */

  /* ========== [BLOCK: 设置自定义图标（API）] ========== */
  function setCustomIcon(appId, url) {
    if (url) {
      customIcons[appId] = url;
    } else {
      delete customIcons[appId];
    }
    MiniPhone.Storage.local.set('customIcons', customIcons);
  }

  function getCustomIcon(appId) {
    return customIcons[appId] || null;
  }
  /* ========== [/BLOCK: 设置自定义图标（API）] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    render: render,
    setCustomIcon: setCustomIcon,
    getCustomIcon: getCustomIcon,
    showIconEditor: showIconEditor
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone AppIcon 模块] ========== */
