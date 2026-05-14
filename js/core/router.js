/* ============================================================
   router.js — App 路由管理
   负责 App 的打开、关闭、切换和生命周期回调
   ============================================================ */

/* [ROUTER-CORE START] Router 核心 */
const Router = (() => {

  // 已注册的 App 定义表
  // { id, name, emoji, mount(container), unmount() }
  const _registry = new Map();

  // 当前活跃的 App id
  let _current = null;

  // App 层 DOM 引用（在 app.js init 后赋值）
  let _appLayer     = null;
  let _appContainer = null;
  let _appTitle     = null;
  let _appBackBtn   = null;

  /**
   * 初始化 Router，绑定 DOM
   */
  function init() {
    _appLayer     = document.getElementById('app-layer');
    _appContainer = document.getElementById('app-container');
    _appTitle     = document.getElementById('app-title');
    _appBackBtn   = document.getElementById('app-back-btn');

    // 返回按钮
    _appBackBtn?.addEventListener('click', () => close());

    // 手势返回：在 app-layer 上向右滑动
    _initSwipeBack();
  }

  /**
   * 注册一个 App
   * @param {Object} appDef
   * @param {string}   appDef.id       - 唯一 id，如 'chat'
   * @param {string}   appDef.name     - 显示名称
   * @param {string}   appDef.emoji    - 兜底 emoji 图标
   * @param {string}   [appDef.iconUrl]- 自定义图标 URL
   * @param {Function} appDef.mount    - (container: HTMLElement) => void
   * @param {Function} [appDef.unmount]- () => void，清理副作用
   */
  function register(appDef) {
    if (!appDef.id || !appDef.mount) {
      console.warn('[Router] register: id and mount are required');
      return;
    }
    _registry.set(appDef.id, appDef);
  }

  /**
   * 打开一个 App
   * @param {string} appId
   * @param {Object} [params] - 传给 mount 的额外参数
   */
  function open(appId, params = {}) {
    const app = _registry.get(appId);
    if (!app) {
      console.warn('[Router] open: app not found:', appId);
      return;
    }

    // 如果已有 App 打开，先卸载
    if (_current) {
      _unmountCurrent(false);
    }

    _current = appId;
    Store.set('activeApp', appId);

    // 设置标题
    if (_appTitle) _appTitle.textContent = app.name;

    // 清空容器并挂载新 App
    if (_appContainer) {
      _appContainer.innerHTML = '';
      try {
        app.mount(_appContainer, params);
      } catch (e) {
        console.error('[Router] mount error:', e);
        _appContainer.innerHTML = `
          <div style="padding:32px;text-align:center;color:var(--text-secondary)">
            <div style="font-size:40px;margin-bottom:12px">⚠️</div>
            <div>App 加载失败</div>
          </div>`;
      }
    }

    // 显示 App 层（移除 hidden，触发 CSS 动画）
    _appLayer?.classList.remove('hidden');
    _appLayer?.classList.remove('closing');
  }

  /**
   * 关闭当前 App，返回主屏幕
   */
  function close() {
    if (!_current) return;
    _unmountCurrent(true);
  }

  /**
   * 内部：卸载当前 App
   * @param {boolean} animate - 是否播放关闭动画
   */
  function _unmountCurrent(animate) {
    const app = _registry.get(_current);

    const finish = () => {
      // 调用 App 的 unmount 钩子
      try { app?.unmount?.(); } catch (e) { console.error(e); }
      if (_appContainer) _appContainer.innerHTML = '';
      _appLayer?.classList.add('hidden');
      _appLayer?.classList.remove('closing');
      _current = null;
      Store.set('activeApp', null);
    };

    if (animate) {
      _appLayer?.classList.add('closing');
      // 等动画结束（280ms）
      setTimeout(finish, 290);
    } else {
      finish();
    }
  }

  /**
   * 获取当前活跃 App id
   */
  function getCurrent() {
    return _current;
  }

  /**
   * 获取所有已注册 App 列表
   */
  function getAll() {
    return Array.from(_registry.values());
  }

  /**
   * 初始化向右滑动手势返回
   */
  function _initSwipeBack() {
    if (!_appLayer) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    _appLayer.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      // 只响应从左边缘 30px 内开始的滑动
      if (touch.clientX < 30) {
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
      }
    }, { passive: true });

    _appLayer.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      // 水平滑动距离 > 60px 且垂直偏移 < 40px
      if (dx > 60 && dy < 40) {
        tracking = false;
        close();
      }
    }, { passive: true });

    _appLayer.addEventListener('touchend', () => {
      tracking = false;
    }, { passive: true });
  }

  return { init, register, open, close, getCurrent, getAll };

})();
/* [ROUTER-CORE END] */

/* ============================================================
   router.js END
   ============================================================ */
