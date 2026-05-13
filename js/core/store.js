/* ========== [BLOCK: MiniPhone Store 模块] ========== */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Store = (function() {
  'use strict';

  /* ========== [BLOCK: 状态定义] ========== */
  var state = {
    currentPage: 'home',
    currentApp: null,
    theme: 'dark',
    apiConfigured: false,
    apps: [],
    dockApps: ['chat', 'music', 'calendar', 'settings'], // ← 有默认值
    widgets: [],
    unreadCounts: {},
    wallpaper: null,
  };
  /* ========== [/BLOCK: 状态定义] ========== */

  /* ========== [BLOCK: 订阅系统] ========== */
  var listeners = {};

  function on(key, callback) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    return function unsubscribe() {
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
  var PERSIST_KEYS = ['theme', 'dockApps', 'widgets', 'wallpaper'];

  function saveToLocal() {
    var data = {};
    PERSIST_KEYS.forEach(function(key) { data[key] = state[key]; });
    MiniPhone.Storage.local.set('store', data);
  }

  function loadFromLocal() {
    var data = MiniPhone.Storage.local.get('store', {});
    PERSIST_KEYS.forEach(function(key) {
      // 只有非 null、非 undefined、数组非空时才覆盖默认值
      var val = data[key];
      if (val === null || val === undefined) return;
      if (Array.isArray(val) && val.length === 0) return;
      state[key] = val;
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
