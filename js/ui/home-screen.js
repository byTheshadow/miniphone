/* ========== [BLOCK: MiniPhone HomeScreen 模块] ========== */
var MiniPhone = window.MiniPhone || {};

MiniPhone.HomeScreen = (function() {
  'use strict';

  var homeScreen   = null;
  var dotsContainer = null;
  var currentPageIndex = 0;

  /* ========== [BLOCK: 默认 App 注册表] ========== */
  var defaultApps = [
    { id: 'chat',     name: '聊天',  emoji: '💬', color: 'linear-gradient(135deg,#5B86E5,#36D1DC)' },
    { id: 'calendar', name: '日历',  emoji: '📅', color: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
    { id: 'rp',       name: '长聊',  emoji: '📖', color: 'linear-gradient(135deg,#A18CD1,#FBC2EB)' },
    { id: 'music',    name: '音乐',  emoji: '🎵', color: 'linear-gradient(135deg,#FA709A,#FEE140)' },
    { id: 'ticket',   name: '小票',  emoji: '🎫', color: 'linear-gradient(135deg,#F7971E,#FFD200)' },
    { id: 'pet',      name: '宠物',  emoji: '🐾', color: 'linear-gradient(135deg,#43E97B,#38F9D7)' },
    { id: 'ledger',   name: '记账',  emoji: '💰', color: 'linear-gradient(135deg,#4FACFE,#00F2FE)' },
    { id: 'settings', name: '设置',  emoji: '⚙️', color: 'linear-gradient(135deg,#667eea,#764ba2)' },
  ];

  var defaultDockApps = ['chat', 'music', 'calendar', 'settings'];

  /* 第一页（有小组件）最多放几个 App */
  var APPS_PER_PAGE_FIRST = 4;
  /* 后续页每页最多放几个 App */
  var APPS_PER_PAGE = 8;
  /* ========== [/BLOCK: 默认 App 注册表] ========== */

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;

    /* ========== [BLOCK: 创建指示点容器] ========== */
    dotsContainer = document.createElement('div');
    dotsContainer.className = 'page-dots';
    document.getElementById('app').appendChild(dotsContainer);
    /* ========== [/BLOCK: 创建指示点容器] ========== */

    renderPages();
    renderDock();

    /* 监听横向滚动更新指示点 */
    homeScreen.addEventListener('scroll', onScroll, { passive: true });

    /* 监听状态变化刷新 */
    MiniPhone.Store.on('iconsUpdated', function() { renderPages(); renderDock(); });
    MiniPhone.Store.on('unreadCounts', function() { renderPages(); renderDock(); });
  }
  /* ========== [/BLOCK: 初始化] ========== */

  /* ========== [BLOCK: 渲染所有页面] ========== */
  function renderPages() {
    if (!homeScreen) return;

    /* 保存当前滚动位置对应的页码 */
    var savedPage = currentPageIndex;
    homeScreen.innerHTML = '';

    var dockIds  = MiniPhone.Store.get('dockApps') || defaultDockApps;
    var unread   = MiniPhone.Store.get('unreadCounts') || {};

    /* 所有不在 Dock 里的 App */
    var gridApps = defaultApps.filter(function(a) {
      return dockIds.indexOf(a.id) === -1;
    });

    /* ── 第一页：小组件 + 前 N 个 App ── */
    var page0Apps = gridApps.slice(0, APPS_PER_PAGE_FIRST);
    homeScreen.appendChild(buildPage(0, true, page0Apps, unread));

    /* ── 后续页 ── */
    var remaining = gridApps.slice(APPS_PER_PAGE_FIRST);
    var extraPageCount = Math.ceil(remaining.length / APPS_PER_PAGE);

    for (var p = 0; p < extraPageCount; p++) {
      var slice = remaining.slice(p * APPS_PER_PAGE, (p + 1) * APPS_PER_PAGE);
      homeScreen.appendChild(buildPage(p + 1, false, slice, unread));
    }

    var totalPages = 1 + extraPageCount;
    renderDots(totalPages);

    /* 恢复滚动位置 */
    if (savedPage > 0 && savedPage < totalPages) {
      homeScreen.scrollLeft = savedPage * homeScreen.clientWidth;
    }
  }
  /* ========== [/BLOCK: 渲染所有页面] ========== */

  /* ========== [BLOCK: 构建单页] ========== */
  function buildPage(pageIndex, hasWidgets, apps, unread) {
    var page = document.createElement('div');
    page.className = 'home-page';
    page.dataset.pageIndex = pageIndex;

    /* ── 小组件区域（仅第一页）── */
    if (hasWidgets) {
      var widgetArea = document.createElement('div');
      widgetArea.id = 'widget-area';
      widgetArea.className = 'widget-area';
      page.appendChild(widgetArea);
    }

    /* ── App 图标网格 ── */
    if (apps && apps.length > 0) {
      var grid = document.createElement('div');
      grid.className = 'app-grid';

      apps.forEach(function(app) {
        var iconEl = MiniPhone.AppIcon.render(app, {
          showLabel: true,
          badge: unread[app.id] || 0
        });
        grid.appendChild(iconEl);
      });

      page.appendChild(grid);
    }

    return page;
  }
  /* ========== [/BLOCK: 构建单页] ========== */

  /* ========== [BLOCK: 渲染 Dock 栏] ========== */
  function renderDock() {
    var dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = '';

    var dockIds = MiniPhone.Store.get('dockApps') || defaultDockApps;
    var unread  = MiniPhone.Store.get('unreadCounts') || {};

    dockIds.forEach(function(appId) {
      var app = defaultApps.find(function(a) { return a.id === appId; });
      if (!app) return;
      var iconEl = MiniPhone.AppIcon.render(app, {
        showLabel: false,
        badge: unread[app.id] || 0
      });
      dock.appendChild(iconEl);
    });
  }
  /* ========== [/BLOCK: 渲染 Dock 栏] ========== */

  /* ========== [BLOCK: 渲染页面指示点] ========== */
  function renderDots(total) {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';

    if (total <= 1) {
      dotsContainer.style.display = 'none';
      return;
    }

    dotsContainer.style.display = 'flex';
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('div');
      dot.className = 'page-dot' + (i === currentPageIndex ? ' active' : '');
      dotsContainer.appendChild(dot);
    }
  }
  /* ========== [/BLOCK: 渲染页面指示点] ========== */

  /* ========== [BLOCK: 滚动监听] ========== */
  function onScroll() {
    if (!homeScreen) return;
    var pageWidth = homeScreen.clientWidth;
    if (pageWidth === 0) return;

    var newIndex = Math.round(homeScreen.scrollLeft / pageWidth);
    if (newIndex === currentPageIndex) return;
    currentPageIndex = newIndex;

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.page-dot').forEach(function(dot, i) {
        dot.classList.toggle('active', i === currentPageIndex);
      });
    }
  }
  /* ========== [/BLOCK: 滚动监听] ========== */

  /* ========== [BLOCK: 获取 App 配置] ========== */
  function getAppConfig(appId) {
    return defaultApps.find(function(a) { return a.id === appId; }) || null;
  }

  function getAllApps() {
    return defaultApps.slice();
  }
  /* ========== [/BLOCK: 获取 App 配置] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    renderPages: renderPages,
    renderDock: renderDock,
    getAppConfig: getAppConfig,
    getAllApps: getAllApps
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone HomeScreen 模块] ========== */

