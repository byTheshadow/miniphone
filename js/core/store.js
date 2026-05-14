/* ============================================================
   store.js — 全局轻量状态管理
   发布/订阅模式，无外部依赖
   ============================================================ */

/* [STORE-CORE START] Store 核心 */
const Store = (() => {

  // 初始状态
  const _state = {
    // 主题
    theme: 'dark',                  // 'dark' | 'light'

    // 主屏幕
    currentPage: 0,                 // 当前页面索引
    totalPages: 1,                  // 总页数
    isEditMode: false,              // 是否处于编辑模式（图标抖动）

    // 当前打开的 App
    activeApp: null,                // null | app id string

    // 用户信息（个性签名小组件用）
    userProfile: {
      name: 'MiniPhone',
      bio:  '✨ 今天也要好好的',
      avatarUrl: '',
      avatarEmoji: '🌙',
    },

    // 壁纸
    wallpaperUrl: '',

    // 页面布局（每页的图标+小组件配置）
    pages: [],

    // Dock 配置
    dockApps: ['chat', 'calendar', 'music', 'settings'],

    // 通知徽标
    badges: {},                     // { appId: count }

    // API 配置（不存明文 key，key 存 storage）
    apiConfig: {
      baseUrl:   'https://api.openai.com/v1',
      modelId:   '',
      hasKey:    false,
    },
  };

  // 订阅者 Map：key = state 路径，value = Set<callback>
  const _subscribers = new Map();

  /**
   * 获取状态（支持点路径，如 'userProfile.name'）
   * @param {string} [path] - 不传则返回整个 state 的浅拷贝
   */
  function get(path) {
    if (!path) return { ..._state };
    return path.split('.').reduce((obj, key) => obj?.[key], _state);
  }

  /**
   * 更新状态并通知订阅者
   * @param {string} path  - 点路径，如 'userProfile.name'
   * @param {*}      value - 新值
   */
  function set(path, value) {
    const keys = path.split('.');
    let obj = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const oldValue = obj[lastKey];
    obj[lastKey] = value;

    // 通知精确路径的订阅者
    _notify(path, value, oldValue);
    // 通知父路径的订阅者（冒泡）
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      _notify(parts.slice(0, i).join('.'), get(parts.slice(0, i).join('.')), null);
    }
    // 通知全局订阅者
    _notify('*', _state, null);
  }

  /**
   * 批量更新（减少通知次数）
   * @param {Object} updates - { path: value, ... }
   */
  function batch(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      const keys = path.split('.');
      let obj = _state;
      for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]] === undefined) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    });
    _notify('*', _state, null);
  }

  /**
   * 订阅状态变化
   * @param {string}   path     - 监听路径，'*' 监听所有
   * @param {Function} callback - (newValue, oldValue) => void
   * @returns {Function} unsubscribe 函数
   */
  function subscribe(path, callback) {
    if (!_subscribers.has(path)) {
      _subscribers.set(path, new Set());
    }
    _subscribers.get(path).add(callback);
    // 返回取消订阅函数
    return () => _subscribers.get(path)?.delete(callback);
  }

  /** 内部通知 */
  function _notify(path, newValue, oldValue) {
    _subscribers.get(path)?.forEach(cb => {
      try { cb(newValue, oldValue); }
      catch (e) { console.error('[Store] subscriber error:', e); }
    });
  }

  return { get, set, batch, subscribe };

})();
/* [STORE-CORE END] */

/* ============================================================
   store.js END
   ============================================================ */
