/* ==========================================
   MiniPhone AI — key-manager.js
   API Key 本地存儲管理（Base64 簡單混淆）
   ========================================== */

const KeyManager = (() => {
  const KEY_STORAGE = 'apikey_v1';

  /* 簡單 Base64 混淆（純前端，非真正加密，僅防直接查看） */
  function encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function decode(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch {
      return '';
    }
  }

  function saveKey(apiKey) {
    if (!apiKey || !apiKey.trim()) return false;
    Storage.setSetting(KEY_STORAGE, encode(apiKey.trim()));
    return true;
  }

  function getKey() {
    const encoded = Storage.getSetting(KEY_STORAGE, '');
    return encoded ? decode(encoded) : '';
  }

  function hasKey() {
    return !!getKey();
  }

  function clearKey() {
    Storage.removeSetting(KEY_STORAGE);
  }

  /* 驗證 Key 格式（Anthropic Key 格式檢查） */
  function validateKeyFormat(key) {
    return key && key.startsWith('sk-ant-') && key.length > 20;
  }

  return { saveKey, getKey, hasKey, clearKey, validateKeyFormat };
})();
