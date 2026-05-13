/* ========== MiniPhone Store 全局状态管理 开始 ========== */

/**
 * MiniPhone Store
 * 轻量级响应式状态管理，基于 localStorage 持久化
 */
const MiniStore = (() => {
  'use strict';

  /* ========== 存储键名常量 开始 ========== */
  const STORAGE_KEY = 'miniphone_store';
  /* ========== 存储键名常量 结束 ========== */

  /* ========== 默认状态 开始 ========== */
  const defaultState = {
    // 外观
    theme: 'light',           // 'light' | 'dark'
    showStatusBar: true,      // 是否显示状态栏
    wallpaperUrl: '',         // 自定义壁纸 URL

    // AI 配置
    ai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
    },

    // 主屏幕布局
    currentPage: 0,
    pages: [],                // 由 app.js 初始化默认布局

    // Dock 栏
    dock: [],                 // 由 app.js 初始化

    // App 自定义（图标URL、角标）
    apps: {},                 // { appId: { iconUrl: '', badge: 0 } }
  };
  /* ========== 默认状态 结束 ========== */

  /* ========== 状态实例 开始 ========== */
  let _state = {};
  let _listeners = {};
  /* ========== 状态实例 结束 ========== */

  /* ========== 深合并工具 开始 ========== */
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  /* ========== 深合并工具 结束 ========== */

  /* ========== 加载状态 开始 ========== */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        _state = deepMerge(defaultState, saved);
      } else {
        _state = JSON.parse(JSON.stringify(defaultState));
      }
    } catch (e) {
      console.warn('[MiniStore] 加载失败，使用默认状态', e);
      _state = JSON.parse(JSON.stringify(defaultState));
    }
  }
  /* ========== 加载状态 结束 ========== */

  /* ========== 保存状态 开始 ========== */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('[MiniStore] 保存失败', e);
    }
  }
  /* ========== 保存状态 结束 ========== */

  /* ========== 获取状态 开始 ========== */
  function get(path) {
    if (!path) return _state;
    const keys = path.split('.');
    let val = _state;
    for (const k of keys) {
      if (val == null) return undefined;
      val = val[k];
    }
    return val;
  }
  /* ========== 获取状态 结束 ========== */

  /* ========== 设置状态 开始 ========== */
  function set(path, value) {
    const keys = path.split('.');
    let obj = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null || typeof obj[keys[i]] !== 'object') {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const oldValue = obj[lastKey];
    obj[lastKey] = value;
    save();
    _notify(path, value, oldValue);
  }
  /* ========== 设置状态 结束 ========== */

  /* ========== 事件监听 开始 ========== */
  function on(path, callback) {
    if (!_listeners[path]) _listeners[path] = [];
    _listeners[path].push(callback);
    return () => {
      _listeners[path] = _listeners[path].filter(cb => cb !== callback);
    };
  }

  function _notify(path, newVal, oldVal) {
    // 精确匹配
    if (_listeners[path]) {
      _listeners[path].forEach(cb => cb(newVal, oldVal));
    }
    // 通配符匹配：如果设置了 'widgets.pet.hp'，也通知 'widgets' 和 'widgets.pet' 的监听者
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('.');
      if (_listeners[parentPath]) {
        _listeners[parentPath].forEach(cb => cb(get(parentPath), undefined));
      }
    }
    // 全局监听
    if (_listeners['*']) {
      _listeners['*'].forEach(cb => cb(path, newVal, oldVal));
    }
  }
  /* ========== 事件监听 结束 ========== */

  /* ========== 重置状态 开始 ========== */
  function reset() {
    _state = JSON.parse(JSON.stringify(defaultState));
    save();
    _notify('*', _state, null);
  }
  /* ========== 重置状态 结束 ========== */

  /* ========== 初始化 开始 ========== */
  load();
  /* ========== 初始化 结束 ========== */

  /* ========== 公开API 开始 ========== */
  return { get, set, on, reset, load, save };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== MiniPhone Store 全局状态管理 结束 ========== */

