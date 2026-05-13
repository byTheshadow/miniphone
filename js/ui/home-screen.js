/* ========== [BLOCK: MiniPhone HomeScreen 模块] ========== */
var MiniPhone = window.MiniPhone || {};

MiniPhone.HomeScreen = (function() {
  'use strict';

  /* ========== [BLOCK: 状态变量] ========== */
  var homeScreen    = null;
  var track         = null;
  var dotsContainer = null;
  var totalPages    = 1;
  var currentPage   = 0;

  var touch = {
    startX: 0, startY: 0, startTime: 0,
    isDragging: false, isVertical: null, currentX: 0
  };
  /* ========== [/BLOCK: 状态变量] ========== */

  /* ========== [BLOCK: App 注册表] ========== */
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
  var APPS_PER_PAGE   = 8; // 每个 App 页放几个图标
  /* ========== [/BLOCK: App 注册表] ========== */

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;

    track = document.createElement('div');
    track.className = 'home-track';
    homeScreen.appendChild(track);

    dotsContainer = document.createElement('div');
    dotsContainer.className = 'page-dots';
    document.getElementById('app').appendChild(dotsContainer);

    renderPages();
    renderDock();
    bindGestures();

    MiniPhone.Store.on('iconsUpdated', function() { renderPages(); renderDock(); });
    MiniPhone.Store.on('unreadCounts', function() { renderPages(); renderDock(); });
  }
  /* ========== [/BLOCK: 初始化] ========== */

  /* ========== [BLOCK: 渲染所有页面] ========== */
  function renderPages() {
    if (!track) return;
    track.innerHTML = '';

    var dockIds  = MiniPhone.Store.get('dockApps') || defaultDockApps;
    var unread   = MiniPhone.Store.get('unreadCounts') || {};
    var gridApps = defaultApps.filter(function(a) {
      return dockIds.indexOf(a.id) === -1;
    });

    /* ── 第 0 页：纯小组件页 ── */
    track.appendChild(buildWidgetPage());

    /* ── 第 1 页起：App 图标页，每页 APPS_PER_PAGE 个 ── */
    var appPageCount = Math.max(1, Math.ceil(gridApps.length / APPS_PER_PAGE));
    for (var p = 0; p < appPageCount; p++) {
      var slice = gridApps.slice(p * APPS_PER_PAGE, (p + 1) * APPS_PER_PAGE);
      track.appendChild(buildAppPage(p + 1, slice, unread));
    }

    totalPages = 1 + appPageCount;
    if (currentPage >= totalPages) currentPage = totalPages - 1;

    renderDots(totalPages);
    goToPage(currentPage, false);
  }
  /* ========== [/BLOCK: 渲染所有页面] ========== */

  /* ========== [BLOCK: 构建小组件页（第 0 页）] ========== */
  function buildWidgetPage() {
    var page = document.createElement('div');
    page.className = 'home-page';
    page.dataset.pageIndex = 0;

    var wa = document.createElement('div');
    wa.id = 'widget-area';
    wa.className = 'widget-area';
    page.appendChild(wa);

    return page;
  }
  /* ========== [/BLOCK: 构建小组件页（第 0 页）] ========== */

  /* ========== [BLOCK: 构建 App 图标页] ========== */
  function buildAppPage(pageIndex, apps, unread) {
    var page = document.createElement('div');
    page.className = 'home-page';
    page.dataset.pageIndex = pageIndex;

    var grid = document.createElement('div');
    grid.className = 'app-grid';

    apps.forEach(function(app) {
      grid.appendChild(MiniPhone.AppIcon.render(app, {
        showLabel: true,
        badge: unread[app.id] || 0
      }));
    });

    page.appendChild(grid);
    return page;
  }
  /* ========== [/BLOCK: 构建 App 图标页] ========== */

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
      dock.appendChild(MiniPhone.AppIcon.render(app, {
        showLabel: false,
        badge: unread[app.id] || 0
      }));
    });
  }
  /* ========== [/BLOCK: 渲染 Dock 栏] ========== */

  /* ========== [BLOCK: 翻页控制] ========== */
  function goToPage(index, animate) {
    if (!track) return;
    index = Math.max(0, Math.min(totalPages - 1, index));
    currentPage = index;

    track.style.transition = (animate === false)
      ? 'none'
      : 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)';
    track.style.transform = 'translateX(' + (-index * 100) + '%)';

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.page-dot').forEach(function(dot, i) {
        dot.classList.toggle('active', i === index);
      });
    }
  }
  /* ========== [/BLOCK: 翻页控制] ========== */

  /* ========== [BLOCK: 渲染指示点] ========== */
  function renderDots(total) {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    dotsContainer.style.display = total <= 1 ? 'none' : 'flex';
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('div');
      dot.className = 'page-dot' + (i === currentPage ? ' active' : '');
      dotsContainer.appendChild(dot);
    }
  }
  /* ========== [/BLOCK: 渲染指示点] ========== */

  /* ========== [BLOCK: 手势绑定] ========== */
  function bindGestures() {
    if (!homeScreen) return;
    homeScreen.addEventListener('touchstart', onTouchStart, { passive: true });
    homeScreen.addEventListener('touchmove',  onTouchMove,  { passive: false });
    homeScreen.addEventListener('touchend',   onTouchEnd,   { passive: true });
    homeScreen.addEventListener('mousedown',  onMouseDown);
  }
  /* ========== [/BLOCK: 手势绑定] ========== */

  /* ========== [BLOCK: Touch 事件处理] ========== */
  function onTouchStart(e) {
    var t = e.touches[0];
    touch.startX     = t.clientX;
    touch.startY     = t.clientY;
    touch.startTime  = Date.now();
    touch.isDragging = true;
    touch.isVertical = null;
    touch.currentX   = t.clientX;
    track.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!touch.isDragging) return;
    var t  = e.touches[0];
    var dx = t.clientX - touch.startX;
    var dy = t.clientY - touch.startY;

    /* 判断方向（只判断一次）*/
    if (touch.isVertical === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      touch.isVertical = Math.abs(dy) > Math.abs(dx);
    }

    if (touch.isVertical === true) return; // 纵向：放行

    if (touch.isVertical === false) {
      e.preventDefault(); // 横向：阻止页面滚动
      touch.currentX = t.clientX;

      /* 边缘阻尼：第一页往右拉、最后一页往左拉时加阻力 */
      var resistance = 1;
      if ((currentPage === 0 && dx > 0) || (currentPage === totalPages - 1 && dx < 0)) {
        resistance = 0.25;
      }

      var base = -(currentPage * homeScreen.clientWidth);
      var pct  = ((base + dx * resistance) / homeScreen.clientWidth) * 100;
      track.style.transform = 'translateX(' + pct + '%)';
    }
  }

  function onTouchEnd() {
    if (!touch.isDragging || touch.isVertical !== false) {
      touch.isDragging = false;
      return;
    }
    touch.isDragging = false;

    var dx      = touch.currentX - touch.startX;
    var dt      = Date.now() - touch.startTime;
    var width   = homeScreen.clientWidth;
    var isFling = Math.abs(dx) > 40 && dt < 350;
    var isSwipe = Math.abs(dx) > width * 0.25;

    if ((isFling || isSwipe) && dx < 0 && currentPage < totalPages - 1) {
      goToPage(currentPage + 1, true);
    } else if ((isFling || isSwipe) && dx > 0 && currentPage > 0) {
      goToPage(currentPage - 1, true);
    } else {
      goToPage(currentPage, true); // 回弹
    }
  }
  /* ========== [/BLOCK: Touch 事件处理] ========== */

  /* ========== [BLOCK: 鼠标拖拽（桌面调试）] ========== */
  function onMouseDown(e) {
    if (e.button !== 0) return;
    touch.startX     = e.clientX;
    touch.startTime  = Date.now();
    touch.isDragging = true;
    touch.currentX   = e.clientX;
    track.style.transition = 'none';

    function onMouseMove(e) {
      if (!touch.isDragging) return;
      touch.currentX = e.clientX;
      var dx = e.clientX - touch.startX;
      var resistance = 1;
      if ((currentPage === 0 && dx > 0) || (currentPage === totalPages - 1 && dx < 0)) {
        resistance = 0.25;
      }
      var base = -(currentPage * homeScreen.clientWidth);
      var pct  = ((base + dx * resistance) / homeScreen.clientWidth) * 100;
      track.style.transform = 'translateX(' + pct + '%)';
    }

    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      if (!touch.isDragging) return;
      touch.isDragging = false;

      var dx      = e.clientX - touch.startX;
      var dt      = Date.now() - touch.startTime;
      var width   = homeScreen.clientWidth;
      var isFling = Math.abs(dx) > 40 && dt < 350;
      var isSwipe = Math.abs(dx) > width * 0.25;

      if ((isFling || isSwipe) && dx < 0 && currentPage < totalPages - 1) {
        goToPage(currentPage + 1, true);
      } else if ((isFling || isSwipe) && dx > 0 && currentPage > 0) {
        goToPage(currentPage - 1, true);
      } else {
        goToPage(currentPage, true);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }
  /* ========== [/BLOCK: 鼠标拖拽（桌面调试）] ========== */

  /* ========== [BLOCK: 获取 App 配置] ========== */
  function getAppConfig(appId) {
    return defaultApps.find(function(a) { return a.id === appId; }) || null;
  }

  function getAllApps() { return defaultApps.slice(); }
  /* ========== [/BLOCK: 获取 App 配置] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    renderPages: renderPages,
    renderDock: renderDock,
    goToPage: goToPage,
    getAppConfig: getAppConfig,
    getAllApps: getAllApps
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone HomeScreen 模块] ========== */



