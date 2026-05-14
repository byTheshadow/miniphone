/* ============================================================
   storage.js — IndexedDB + localStorage 封装
   提供统一的异步存取接口
   ============================================================ */

/* [STORAGE-CORE START] Storage 核心 */
const Storage = (() => {

  const DB_NAME    = 'miniphone_db';
  const DB_VERSION = 1;
  const STORES = {
    settings:   'settings',    // 用户设置
    pages:      'pages',       // 主屏幕页面布局
    characters: 'characters',  // 聊天角色卡
    messages:   'messages',    // 聊天记录
    events:     'events',      // 日历事件
    pets:       'pets',        // 宠物档案
    ledger:     'ledger',      // 账单记录
    widgets:    'widgets',     // 小组件配置
  };

  let _db = null;

  /**
   * 初始化 IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  function init() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };

      req.onerror = (e) => {
        console.error('[Storage] IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * 获取 ObjectStore 事务
   * @param {string} storeName
   * @param {'readonly'|'readwrite'} mode
   */
  async function _getStore(storeName, mode = 'readonly') {
    const db = await init();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  /**
   * 写入单条记录（id 必须存在于 data 中）
   * @param {string} storeName
   * @param {Object} data - 必须包含 id 字段
   */
  async function put(storeName, data) {
    const store = await _getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * 读取单条记录
   * @param {string} storeName
   * @param {string|number} id
   */
  async function get(storeName, id) {
    const store = await _getStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * 读取 store 内所有记录
   * @param {string} storeName
   */
  async function getAll(storeName) {
    const store = await _getStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * 删除单条记录
   * @param {string} storeName
   * @param {string|number} id
   */
  async function remove(storeName, id) {
    const store = await _getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * 清空整个 store
   * @param {string} storeName
   */
  async function clear(storeName) {
    const store = await _getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── localStorage 快捷方法（用于轻量 KV，如主题、API Key 等） ──

  /**
   * localStorage 写入（自动 JSON 序列化）
   * @param {string} key
   * @param {*}      value
   */
  function lsSet(key, value) {
    try {
      localStorage.setItem('mp_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] localStorage set failed:', e);
    }
  }

  /**
   * localStorage 读取（自动 JSON 反序列化）
   * @param {string} key
   * @param {*}      defaultValue
   */
  function lsGet(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem('mp_' + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * localStorage 删除
   * @param {string} key
   */
  function lsRemove(key) {
    localStorage.removeItem('mp_' + key);
  }

  return {
    init,
    put,
    get,
    getAll,
    remove,
    clear,
    lsSet,
    lsGet,
    lsRemove,
    STORES,
  };

})();
/* [STORAGE-CORE END] */

/* ============================================================
   storage.js END
   ============================================================ */
