/* ==========================================
   MiniPhone AI — app.js
   應用啟動 + 路由管理 + 全局工具
   ========================================== */

const App = (() => {
  let currentView = 'home';
  let viewHistory = ['home'];
  let toastTimer = null;

  /* ── 初始化 ── */
  async function init() {
    console.log('[App] MiniPhone AI 啟動中...');

    // 初始化存儲
    await Storage.initDB();

    // 啟動時鐘
    startClock();

    // 綁定 App 圖示點擊
    document.querySelectorAll('.app-icon[data-app]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.app));
    });

    // 聊天輸入框自動增高
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('input', autoResizeTextarea);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          Chat.sendMessage();
        }
      });
    }

    // 初始化各模組
    await Chat.init();
    Settings.init();

    // 檢查是否有 API Key
    if (!KeyManager.hasKey()) {
      setTimeout(() => {
        showToast('💡 請先到設定頁填入 API Key');
      }, 800);
    }

    console.log('[App] 初始化完成');
  }

  /* ── 路由導航 ── */
  function navigate(viewId, pushHistory = true) {
    const fromEl = document.getElementById('view-' + currentView);
    const toEl = document.getElementById('view-' + viewId);

    if (!toEl) {
      console.warn('[App] 找不到 view:', viewId);
      return;
    }

    // 當前畫面退出
    if (fromEl && fromEl !== toEl) {
      fromEl.classList.remove('active');
      if (viewId !== 'home') {
        fromEl.classList.add('slide-out');
        setTimeout(() => fromEl.classList.remove('slide-out'), 300);
      }
    }

    // 新畫面進入
    toEl.classList.add('active');

    // 更新歷史
    if (pushHistory) {
      if (viewHistory[viewHistory.length - 1] !== viewId) {
        viewHistory.push(viewId);
      }
    }

    const prev = currentView;
    currentView = viewId;

    // 更新導航列狀態
    updateNavBar(viewId);

    // 通知各模組
    onViewChange(viewId, prev);
  }

  function goBack() {
    if (viewHistory.length <= 1) {
      navigate('home');
      return;
    }
    viewHistory.pop();
    const prevView = viewHistory[viewHistory.length - 1];
    navigate(prevView, false);
  }

  function updateNavBar(viewId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const map = { home: 0, chat: 1, chatroom: 1, settings: 2 };
    const idx = map[viewId];
    if (idx !== undefined) {
      const btns = document.querySelectorAll('.nav-btn');
      if (btns[idx]) btns[idx].classList.add('active');
    }
  }

  function onViewChange(viewId, prevView) {
    if (viewId === 'chat') {
      Chat.renderList();
    }
    if (viewId === 'settings') {
      Settings.refresh();
    }
    if (prevView === 'chatroom' && viewId === 'chat') {
      Chat.renderList();
    }
  }

  /* ── 時鐘 ── */
  function startClock() {
    function tick() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const el = document.getElementById('statusTime');
      if (el) el.textContent = `${h}:${m}`;
    }
    tick();
    setInterval(tick, 10000);
  }

  /* ── Toast 通知 ── */
  function showToast(msg, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* ── 輸入框自動增高 ── */
  function autoResizeTextarea(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  /* ── 格式化時間 ── */
  function formatTime(ts) {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today - msgDay) / 86400000;

    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return ['日','一','二','三','四','五','六'][d.getDay()] + '（' + ['週日','週一','週二','週三','週四','週五','週六'][d.getDay()] + '）';
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

  function formatListTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
    if (diff < 86400000) {
      return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }
    return (d.getMonth()+1) + '/' + d.getDate();
  }

  /* ── 啟動 ── */
  document.addEventListener('DOMContentLoaded', init);

  return {
    navigate,
    goBack,
    showToast,
    formatTime,
    formatDate,
    formatListTime,
    getCurrentView: () => currentView,
  };
})();


/* ── Settings 模組 ── */
const Settings = (() => {
  function init() {
    refresh();
  }

  function refresh() {
    // API Key
    const keyInput = document.getElementById('apiKeyInput');
    if (keyInput) {
      keyInput.value = KeyManager.hasKey() ? '••••••••••••••••' : '';
      keyInput.placeholder = KeyManager.hasKey() ? '已儲存（點擊修改）' : 'sk-ant-...';
      keyInput.addEventListener('focus', () => {
        if (keyInput.value === '••••••••••••••••') keyInput.value = '';
      });
    }

    // 預設模型
    const modelSel = document.getElementById('modelSelect');
    if (modelSel) {
      modelSel.value = Storage.getSetting('defaultModel', 'claude-sonnet-4-5');
      modelSel.onchange = () => {
        Storage.setSetting('defaultModel', modelSel.value);
        App.showToast('✅ 模型已更新');
      };
    }

    // 用戶資料
    const profile = Storage.getSetting('userProfile', {});
    const nameInput = document.getElementById('userNameInput');
    const personaInput = document.getElementById('userPersonaInput');
    if (nameInput) nameInput.value = profile.name || '';
    if (personaInput) personaInput.value = profile.persona || '';
  }

  function saveApiKey() {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput ? keyInput.value.trim() : '';
    if (!key || key === '••••••••••••••••') {
      App.showToast('❌ 請輸入有效的 API Key');
      return;
    }
    if (!KeyManager.validateKeyFormat(key)) {
      App.showToast('❌ Key 格式錯誤，應以 sk-ant- 開頭');
      return;
    }
    KeyManager.saveKey(key);
    if (keyInput) keyInput.value = '••••••••••••••••';
    App.showToast('✅ API Key 已儲存');
  }

  function saveUserProfile() {
    const name = document.getElementById('userNameInput')?.value?.trim() || '';
    const persona = document.getElementById('userPersonaInput')?.value?.trim() || '';
    Storage.setSetting('userProfile', { name, persona });
    App.showToast('✅ 個人設定已儲存');
  }

  function clearAll() {
    if (!confirm('確定要清除所有資料嗎？此操作無法復原。')) return;
    localStorage.clear();
    indexedDB.deleteDatabase('MiniPhoneDB');
    App.showToast('🗑️ 資料已清除，請重新整理頁面');
    setTimeout(() => location.reload(), 2000);
  }

  return { init, refresh, saveApiKey, saveUserProfile, clearAll };
})();
