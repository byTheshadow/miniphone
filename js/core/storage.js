/* ==========================================
   MiniPhone AI — storage.js
   IndexedDB + localStorage 統一封裝
   ========================================== */

const Storage = (() => {
  const DB_NAME = 'MiniPhoneDB';
  const DB_VERSION = 1;
  let db = null;

  /* ── 初始化 IndexedDB ── */
  function initDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const database = e.target.result;

        // 角色卡 store
        if (!database.objectStoreNames.contains('characters')) {
          const charStore = database.createObjectStore('characters', { keyPath: 'id' });
          charStore.createIndex('name', 'name', { unique: false });
        }

        // 訊息 store（按 characterId 分組）
        if (!database.objectStoreNames.contains('messages')) {
          const msgStore = database.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('characterId', 'characterId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 記憶摘要 store
        if (!database.objectStoreNames.contains('memories')) {
          database.createObjectStore('memories', { keyPath: 'characterId' });
        }

        // 日程 store
        if (!database.objectStoreNames.contains('schedules')) {
          const schedStore = database.createObjectStore('schedules', { keyPath: 'id' });
          schedStore.createIndex('date', 'date', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      req.onerror = (e) => {
        console.error('IndexedDB 初始化失敗:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /* ── 通用事務工具 ── */
  function transaction(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /* ══════════════ 角色卡 CRUD ══════════════ */

  async function saveCharacter(char) {
    await initDB();
    char.updatedAt = Date.now();
    if (!char.id) char.id = 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    if (!char.createdAt) char.createdAt = Date.now();
    const store = transaction('characters', 'readwrite');
    await promisify(store.put(char));
    return char;
  }

  async function getCharacter(id) {
    await initDB();
    const store = transaction('characters');
    return promisify(store.get(id));
  }

  async function getAllCharacters() {
    await initDB();
    const store = transaction('characters');
    return promisify(store.getAll());
  }

  async function deleteCharacter(id) {
    await initDB();
    // 同時刪除相關訊息和記憶
    const store = transaction('characters', 'readwrite');
    await promisify(store.delete(id));
    await deleteMessagesByCharacter(id);
    await deleteMemory(id);
  }

  /* ══════════════ 訊息 CRUD ══════════════ */

  async function saveMessage(msg) {
    await initDB();
    if (!msg.id) msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    if (!msg.timestamp) msg.timestamp = Date.now();
    const store = transaction('messages', 'readwrite');
    await promisify(store.put(msg));
    return msg;
  }

  async function getMessagesByCharacter(characterId, limit = 100) {
    await initDB();
    return new Promise((resolve, reject) => {
      const store = transaction('messages');
      const index = store.index('characterId');
      const req = index.getAll(characterId);
      req.onsuccess = () => {
        let msgs = req.result || [];
        // 按時間排序
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        // 取最後 limit 條
        if (limit > 0) msgs = msgs.slice(-limit);
        resolve(msgs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getMessageCountByCharacter(characterId) {
    await initDB();
    return new Promise((resolve, reject) => {
      const store = transaction('messages');
      const index = store.index('characterId');
      const req = index.count(characterId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteMessagesByCharacter(characterId) {
    await initDB();
    return new Promise((resolve, reject) => {
      const store = transaction('messages', 'readwrite');
      const index = store.index('characterId');
      const req = index.openCursor(characterId);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getLastMessage(characterId) {
    const msgs = await getMessagesByCharacter(characterId, 1);
    return msgs[msgs.length - 1] || null;
  }

  /* ══════════════ 記憶摘要 ══════════════ */

  async function saveMemory(characterId, summary) {
    await initDB();
    const store = transaction('memories', 'readwrite');
    await promisify(store.put({ characterId, summary, updatedAt: Date.now() }));
  }

  async function getMemory(characterId) {
    await initDB();
    const store = transaction('memories');
    const result = await promisify(store.get(characterId));
    return result ? result.summary : '';
  }

  async function deleteMemory(characterId) {
    await initDB();
    const store = transaction('memories', 'readwrite');
    await promisify(store.delete(characterId));
  }

  /* ══════════════ localStorage 設定 ══════════════ */

  function setSetting(key, value) {
    try {
      localStorage.setItem('miniphone_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage 寫入失敗:', e);
    }
  }

  function getSetting(key, defaultValue = null) {
    try {
      const val = localStorage.getItem('miniphone_' + key);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function removeSetting(key) {
    localStorage.removeItem('miniphone_' + key);
  }

  /* ══════════════ 全量匯出 ══════════════ */

  async function exportAll() {
    await initDB();
    const characters = await getAllCharacters();
    const allMessages = {};
    const allMemories = {};

    for (const char of characters) {
      allMessages[char.id] = await getMessagesByCharacter(char.id, 0);
      allMemories[char.id] = await getMemory(char.id);
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      characters,
      messages: allMessages,
      memories: allMemories,
      settings: {
        userProfile: getSetting('userProfile'),
        defaultModel: getSetting('defaultModel'),
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miniphone_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    App.showToast('✅ 資料已匯出');
  }

  /* ══════════════ 公開 API ══════════════ */
  return {
    initDB,
    // 角色卡
    saveCharacter,
    getCharacter,
    getAllCharacters,
    deleteCharacter,
    // 訊息
    saveMessage,
    getMessagesByCharacter,
    getMessageCountByCharacter,
    deleteMessagesByCharacter,
    getLastMessage,
    // 記憶
    saveMemory,
    getMemory,
    deleteMemory,
    // 設定
    setSetting,
    getSetting,
    removeSetting,
    // 匯出
    exportAll,
  };
})();
