/* ============================================================
   app.js — MiniPhone 应用入口
   负责：初始化所有模块、注册 App、恢复用户设置、启动状态栏
   ============================================================ */

/* [APP-INIT START] 应用初始化 */
const App = (() => {

  /**
   * 主入口，DOMContentLoaded 后执行
   */
  async function init() {
    console.log('[App] MiniPhone initializing...');

    /* [INIT-STORAGE START] 初始化存储 */
    await Storage.init();
    /* [INIT-STORAGE END] */

    /* [INIT-SETTINGS START] 恢复用户设置 */
    _restoreSettings();
    /* [INIT-SETTINGS END] */

    /* [INIT-ROUTER START] 初始化路由 */
    Router.init();
    /* [INIT-ROUTER END] */

    /* [INIT-REGISTER-APPS START] 注册所有 App */
    _registerApps();
    /* [INIT-REGISTER-APPS END] */

    /* [INIT-SHELL START] 初始化主屏幕 */
    PhoneShell.init();
    /* [INIT-SHELL END] */

    /* [INIT-STATUSBAR START] 启动状态栏时钟 */
    _startStatusBar();
    /* [INIT-STATUSBAR END] */

    /* [INIT-SW START] 注册 Service Worker */
    _registerSW();
    /* [INIT-SW END] */

    console.log('[App] MiniPhone ready ✓');
  }

  /* ── 用户设置恢复 ── */

  /* [RESTORE-SETTINGS START] 从 localStorage 恢复设置 */
  function _restoreSettings() {
    // 主题
    const theme = Storage.lsGet('theme', 'dark');
    Store.set('theme', theme);
    document.body.className = `theme-${theme}`;

    // 壁纸
    const wallpaper = Storage.lsGet('wallpaperUrl', '');
    if (wallpaper) {
      Store.set('wallpaperUrl', wallpaper);
      const wallpaperEl = document.getElementById('wallpaper');
      if (wallpaperEl) {
        wallpaperEl.classList.add('has-image');
        wallpaperEl.style.setProperty('--wallpaper-url', `url('${wallpaper}')`);
      }
    }

    // 用户名片
    const profile = Storage.lsGet('userProfile', null);
    if (profile) Store.set('userProfile', profile);

    // API 配置（不存 key 本身）
    const apiConfig = Storage.lsGet('apiConfig', null);
    if (apiConfig) {
      Store.set('apiConfig', {
        ...Store.get('apiConfig'),
        baseUrl: apiConfig.baseUrl ?? 'https://api.openai.com/v1',
        modelId: apiConfig.modelId ?? '',
        hasKey:  !!localStorage.getItem('mp_enc_apikey'),
      });
    }

    // 订阅主题变化，实时切换
    Store.subscribe('theme', (theme) => {
      document.body.className = `theme-${theme}`;
      Storage.lsSet('theme', theme);
    });
  }
  /* [RESTORE-SETTINGS END] */

  /* ── App 注册 ── */

  /* [REGISTER-APPS START] 注册所有 App 到 Router */
  function _registerApps() {
    // 各 App 模块自行调用 Router.register()
    // 这里做兜底检查，确保模块已加载
    const REQUIRED_APPS = [
      'chat', 'calendar', 'music', 'pet', 'ledger', 'ticket', 'settings'
    ];

    REQUIRED_APPS.forEach(id => {
      if (!Router.getAll().find(a => a.id === id)) {
        // 注册占位 App，防止点击报错
        Router.register({
          id,
          name:  id.charAt(0).toUpperCase() + id.slice(1),
          emoji: '🚧',
          mount: (container) => {
            container.innerHTML = `
              <div class="app-page flex-center flex-col"
                style="gap:16px;padding:40px;">
                <span style="font-size:48px">🚧</span>
                <span style="color:var(--text-secondary);font-size:15px;">
                  ${id} 模块开发中
                </span>
              </div>`;
          },
        });
      }
    });
  }
  /* [REGISTER-APPS END] */

  /* ── 状态栏 ── */

  /* [STATUSBAR START] 状态栏时钟更新 */
  function _startStatusBar() {
    const timeEl = document.getElementById('status-time');
    if (!timeEl) return;

    function updateTime() {
      const now = new Date();
      const hh  = String(now.getHours()).padStart(2, '0');
      const mm  = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${hh}:${mm}`;
    }

    updateTime();
    // 每 10 秒同步一次（状态栏不需要秒级精度）
    setInterval(updateTime, 10000);
  }
  /* [STATUSBAR END] */

  /* ── Service Worker ── */

  /* [SW-REGISTER START] 注册 PWA Service Worker */
  function _registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[App] SW registered:', reg.scope))
        .catch(err => console.warn('[App] SW registration failed:', err));
    }
  }
  /* [SW-REGISTER END] */

  return { init };

})();
/* [APP-INIT END] */

/* ============================================================ */

/* [GLOBAL-HELPERS START] 全局工具函数（所有模块可用） */

/**
 * HTML 转义，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function _escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 生成唯一 ID
 * @param {string} [prefix]
 * @returns {string}
 */
function _uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 防抖
 * @param {Function} fn
 * @param {number}   delay
 */
function _debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 格式化日期
 * @param {Date|string} date
 * @param {string}      fmt  - 'YYYY-MM-DD' | 'MM/DD' | 'HH:mm'
 */
function _formatDate(date, fmt = 'YYYY-MM-DD') {
  const d  = date instanceof Date ? date : new Date(date);
  const Y  = d.getFullYear();
  const M  = String(d.getMonth() + 1).padStart(2, '0');
  const D  = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return fmt
    .replace('YYYY', Y)
    .replace('MM',   M)
    .replace('DD',   D)
    .replace('HH',   hh)
    .replace('mm',   mm);
}
/* [GLOBAL-HELPERS END] */

/* ============================================================ */

/* [APP-BOOT START] 启动入口 */
document.addEventListener('DOMContentLoaded', () => App.init());
/* [APP-BOOT END] */

/* ============================================================
   app.js END
   ============================================================ */
