/* ========== [BLOCK: MiniPhone Router 模块] ========== */
/**
 * MiniPhone.Router
 * 管理主屏幕与App 页面之间的切换
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.Router = (function() {
  'use strict';

  var homeScreen = null;
  var appView = null;
  var currentApp = null;
  var appInstances = {};  // 已注册的 App 实例{ id: { mount, unmount, ... } }

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    homeScreen = document.getElementById('home-screen');
    appView = document.getElementById('app-view');

    // Home 指示条点击返回
    var homeIndicator = document.getElementById('home-indicator');
    if (homeIndicator) {
      homeIndicator.addEventListener('click', goHome);
    }

    //监听浏览器后退
    window.addEventListener('popstate', function(event) {
      if (event.state && event.state.page === 'home') {
        goHome(true);
      }
    });
  }
  /* ========== [/BLOCK: 初始化] ========== */

  /* ========== [BLOCK: 注册 App] ========== */
  /**
   * 注册一个 App
   * @param {string} id - App 唯一标识
   * @param {Object} appModule - { mount(container), unmount(), title }
   */
  function register(id, appModule) {
    appInstances[id] = appModule;
  }
  /* ========== [/BLOCK: 注册 App] ========== */

  /* ========== [BLOCK: 打开 App] ========== */
  function openApp(appId) {
    var appModule = appInstances[appId];
    if (!appModule) {
      console.warn('[Router] App 未注册:', appId);
      MiniPhone.Toast && MiniPhone.Toast.show('应用未找到','error');
      return;
    }

    // 卸载当前 App
    if (currentApp && appInstances[currentApp] && appInstances[currentApp].unmount) {
      appInstances[currentApp].unmount();
    }

    // 清空并挂载新 App
    appView.innerHTML = '';
    currentApp = appId;

    // 切换页面显示
    homeScreen.classList.remove('active');
    appView.classList.add('active');

    // 挂载 App
    if (appModule.mount) {
      appModule.mount(appView);
    }

    // 更新状态
    MiniPhone.Store.set('currentPage', 'app');
    MiniPhone.Store.set('currentApp', appId);

    // 推入历史记录
    history.pushState({ page: 'app', app: appId }, '', '#' + appId);}
  /* ========== [/BLOCK: 打开 App] ========== */

  /* ========== [BLOCK: 返回主屏幕] ========== */
  function goHome(skipHistory) {
    //卸载当前 App
    if (currentApp && appInstances[currentApp] && appInstances[currentApp].unmount) {
      appInstances[currentApp].unmount();
    }

    currentApp = null;
    appView.classList.remove('active');
    appView.innerHTML = '';
    homeScreen.classList.add('active');

    // 更新状态
    MiniPhone.Store.set('currentPage', 'home');
    MiniPhone.Store.set('currentApp', null);

    if (!skipHistory) {
      history.pushState({ page: 'home' }, '', '#');
    }
  }
  /* ========== [/BLOCK: 返回主屏幕] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    register: register,
    openApp: openApp,
    goHome: goHome,
    getAppInstances: function() { return appInstances; },
    getCurrentApp: function() { return currentApp; }
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone Router 模块] ========== */
