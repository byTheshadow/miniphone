/* ========== [BLOCK: MiniPhone Store 模块] ========== */
/**
 * MiniPhone.Store
 * 轻量级全局状态管理，支持订阅/发布
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Store = (function() {
  'use strict';

  /* ========== [BLOCK: 状态定义] ========== */
  var state = {
    currentPage: 'home',        // 当前页面: home | app
    currentApp: null,            // 当前打开的 App ID
    theme: 'dark',               // 主题: dark | light
    apiConfigured: false,        // API 是否已配置
    apps: [],                    // 已注册的 App 列表
    dockApps: [],                // Dock 栏 App ID 列表
    widgets: [],                 // 主屏幕小组件配置
    unreadCounts: {},            // 各App 未读数{ appId: count }
    wallpaper: null,             // 自定义壁纸 URL（null 则用CSS 默认）
  };
  /* ========== [/BLOCK: 状态定义] ========== */

  /* ========== [BLOCK: 订阅系统] ========== */
  var listeners = {};

  function on(key, callback) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);return function unsubscribe() {
      listeners[key] = listeners[key].filter(function(cb) { return cb !== callback; });
    };
  }

  function emit(key, value, oldValue) {
    if (!listeners[key]) return;
    listeners[key].forEach(function(cb) {
      try { cb(value, oldValue); } catch (e) { console.error('[Store] 监听回调错误:', e); }
    });
  }
  /* ========== [/BLOCK: 订阅系统] ========== */

  /* ========== [BLOCK: 状态读写] ========== */
  function get(key) {
    return state[key];
  }

  function set(key, value) {
    var oldValue = state[key];
    state[key] = value;
    emit(key, value, oldValue);
    emit('*', { key: key, value: value, oldValue: oldValue });
  }

  function getAll() {
    return Object.assign({}, state);
  }
  /* ========== [/BLOCK: 状态读写] ========== */

  /* ========== [BLOCK: 持久化] ========== */
  function saveToLocal() {
    var persistKeys = ['theme', 'dockApps', 'widgets', 'wallpaper'];
    var data = {};
    persistKeys.forEach(function(key) {
      data[key] = state[key];
    });
    MiniPhone.Storage.local.set('store', data);
  }

  function loadFromLocal() {
    var data = MiniPhone.Storage.local.get('store', {});
    Object.keys(data).forEach(function(key) {
      if (data[key] !== null && data[key] !== undefined) {
        state[key] = data[key];
      }
    });
  }
  /* ========== [/BLOCK: 持久化] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    get: get,
    set: set,
    getAll: getAll,
    on: on,
    save: saveToLocal,
    load: loadFromLocal
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone Store 模块] ========== */
