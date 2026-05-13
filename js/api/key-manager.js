/* ========== [BLOCK: MiniPhone KeyManager 模块] ========== */
/**
 * MiniPhone.KeyManager
 * API Key + Endpoint 的加密存储与管理
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.KeyManager = (function() {
  'use strict';

  var STORAGE_KEY_API = 'mp_enc_apikey';
  var STORAGE_KEY_ENDPOINT = 'mp_enc_endpoint';

  /* ========== [BLOCK: 简单混淆加密（非安全级别，防止明文暴露）] ========== */
  function encode(str) {
    if (!str) return '';
    try {
      return btoa(encodeURIComponent(str).split('').reverse().join(''));
    } catch (e) {
      return '';
    }
  }

  function decode(str) {
    if (!str) return '';
    try {
      return decodeURIComponent(atob(str).split('').reverse().join(''));
    } catch (e) {
      return '';
    }
  }
  /* ========== [/BLOCK: 简单混淆加密] ========== */

  /* ========== [BLOCK: API Key 存取] ========== */
  function saveKey(apiKey) {
    try {
      localStorage.setItem(STORAGE_KEY_API, encode(apiKey));
    } catch (e) {
      console.error('[KeyManager] 保存 API Key 失败:', e);
    }
  }

  function getKey() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_API);
      return raw ? decode(raw) : '';
    } catch (e) {
      return '';
    }
  }

  function removeKey() {
    localStorage.removeItem(STORAGE_KEY_API);
  }
  /* ========== [/BLOCK: API Key 存取] ========== */

  /* ========== [BLOCK: Endpoint 存取] ========== */
  function saveEndpoint(endpoint) {
    try {
      localStorage.setItem(STORAGE_KEY_ENDPOINT, encode(endpoint));
    } catch (e) {
      console.error('[KeyManager] 保存 Endpoint 失败:', e);
    }
  }

  function getEndpoint() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_ENDPOINT);
      return raw ? decode(raw) : '';
    } catch (e) {
      return '';
    }
  }

  function removeEndpoint() {
    localStorage.removeItem(STORAGE_KEY_ENDPOINT);
  }
  /* ========== [/BLOCK: Endpoint 存取] ========== */

  /* ========== [BLOCK: 掩码显示] ========== */
  function maskKey(key) {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }
  /* ========== [/BLOCK: 掩码显示] ========== */

  /* ========== [BLOCK: 检查是否已配置] ========== */
  function isConfigured() {
    return !!(getKey() && getEndpoint());
  }
  /* ========== [/BLOCK: 检查是否已配置] ========== */

  /* ========== [BLOCK: 清除所有配置] ========== */
  function clearAll() {
    removeKey();
    removeEndpoint();
  }
  /* ========== [/BLOCK: 清除所有配置] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    saveKey: saveKey,
    getKey: getKey,
    removeKey: removeKey,
    saveEndpoint: saveEndpoint,
    getEndpoint: getEndpoint,
    removeEndpoint: removeEndpoint,
    maskKey: maskKey,
    isConfigured: isConfigured,
    clearAll: clearAll
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone KeyManager 模块] ========== */
