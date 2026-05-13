/* ========== [BLOCK: MiniPhone Storage模块] ========== */
/**
 * MiniPhone.Storage
 * 封装 localStorage + IndexedDB，提供统一的持久化接口
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Storage = (function() {
  'use strict';

  var DB_NAME = 'miniphone_db';
  var DB_VERSION = 1;
  var db = null;

  /* ========== [BLOCK: IndexedDB 初始化] ========== */
  function initDB() {
    return new Promise(function(resolve, reject) {
      if (db) { resolve(db); return; }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(event) {
        var database = event.target.result;

        // 聊天消息存储
        if (!database.objectStoreNames.contains('messages')) {
          var msgStore = database.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 角色卡存储
        if (!database.objectStoreNames.contains('characters')) {
          database.createObjectStore('characters', { keyPath: 'id' });
        }

        // 日历事件存储
        if (!database.objectStoreNames.contains('events')) {
          var evtStore = database.createObjectStore('events', { keyPath: 'id' });
          evtStore.createIndex('date', 'date', { unique: false });
        }

        // 记账记录存储
        if (!database.objectStoreNames.contains('ledger')) {
          var ledgerStore = database.createObjectStore('ledger', { keyPath: 'id', autoIncrement: true });
          ledgerStore.createIndex('date', 'date', { unique: false });
          ledgerStore.createIndex('category', 'category', { unique: false });
        }

        // 宠物数据存储
        if (!database.objectStoreNames.contains('pets')) {
          database.createObjectStore('pets', { keyPath: 'id' });
        }

        // 通用键值存储
        if (!database.objectStoreNames.contains('keyval')) {
          database.createObjectStore('keyval', { keyPath: 'key' });
        }
      };

      request.onsuccess = function(event) {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = function(event) {
        console.error('[Storage] IndexedDB 打开失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  /* ========== [/BLOCK: IndexedDB 初始化] ========== */

  /* ========== [BLOCK: IndexedDB CRUD 操作] ========== */
  function getStore(storeName, mode) {
    if (!db) throw new Error('[Storage] 数据库未初始化');
    var tx = db.transaction(storeName, mode || 'readonly');
    return tx.objectStore(storeName);
  }

  function dbPut(storeName, data) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readwrite');
      var request = store.put(data);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbGet(storeName, key) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readonly');
      var request = store.get(key);
      request.onsuccess = function() { resolve(request.result || null); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbGetAll(storeName) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readonly');
      var request = store.getAll();
      request.onsuccess = function() { resolve(request.result || []); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbDelete(storeName, key) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readwrite');
      var request = store.delete(key);
      request.onsuccess = function() { resolve(); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbGetByIndex(storeName, indexName, value) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readonly');
      var index = store.index(indexName);
      var request = index.getAll(value);
      request.onsuccess = function() { resolve(request.result || []); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbClear(storeName) {
    return new Promise(function(resolve, reject) {
      var store = getStore(storeName, 'readwrite');
      var request = store.clear();
      request.onsuccess = function() { resolve(); };
      request.onerror = function() { reject(request.error); };
    });
  }
  /* ========== [/BLOCK: IndexedDB CRUD 操作] ========== */

  /* ========== [BLOCK: localStorage 快捷方法] ========== */
  function localSet(key, value) {
    try {
      localStorage.setItem('mp_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] localStorage 写入失败:', e);
    }
  }

  function localGet(key, defaultValue) {
    try {
      var raw = localStorage.getItem('mp_' + key);
      return raw !== null ? JSON.parse(raw) : (defaultValue !== undefined ? defaultValue : null);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  function localRemove(key) {
    localStorage.removeItem('mp_' + key);
  }
  /* ========== [/BLOCK: localStorage 快捷方法] ========== */

  /* ========== [BLOCK: 公开API] ========== */
  return {
    init: initDB,
    put: dbPut,
    get: dbGet,
    getAll: dbGetAll,
    delete: dbDelete,
    getByIndex: dbGetByIndex,
    clear: dbClear,
    local: {
      set: localSet,
      get: localGet,
      remove: localRemove
    }
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone Storage 模块] ========== */
