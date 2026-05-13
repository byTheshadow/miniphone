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

  /* 触摸手势状态 */
  var touch = {
    startX: 0,
    startY: 0,
    startTime: 0,
    isDragging: false,
    isVertical: null,   // null=未判断, true=纵向, false=横向
    currentX: 0
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

  var defaultDockApps  = ['chat', 'music', 'calendar', 'settings'];
  var APPS_PER_PAGE_0  = 4;   // 第一页（有小组件）放几个 App
  var APPS_PER_PAGE    = 8;   // 后续页每页放几个 App
  /* ========== [/BLOCK: App 注册表] ========== */

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;

    /* 创建轨道 */
    track = document.createElement('div');
    track.className = 'home-track';
    homeScreen.appendChild(track);

    /* 创建指示点容器 */
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

    /* 第一页 */
    track.appendChild(buildPage(0, true, gridApps.slice(0, APPS_PER_PAGE_0), unread));

    /* 后续页 */
    var remaining = gridApps.slice(APPS_PER_PAGE_0);
    var extraPages = Math.max(0, Math.ceil(remaining.length / APPS_PER_PAGE));
    for (var p = 0; p < extraPages; p++) {
      var slice = remaining.slice(p * APPS_PER_PAGE, (p + 1) * APPS_PER_PAGE);
      track.appendChild(buildPage(p + 1, false, slice, unread));
    }

    totalPages = 1 + extraPages;

    /* 确保当前页不越界 */
    if (currentPage >= totalPages) currentPage = totalPages - 1;

    renderDots(totalPages);
    goToPage(currentPage, false); // 无动画跳到当前页
  }
  /* ========== [/BLOCK: 渲染所有页面] ========== */

  /* ========== [BLOCK: 构建单页] ========== */
  function buildPage(pageIndex, hasWidgets, apps, unread) {
    var page = document.createElement('div');
    page.className = 'home-page';
    page.dataset.pageIndex = pageIndex;

    if (hasWidgets) {
      var wa = document.createElement('div');
      wa.id = 'widget-area';
      wa.className = 'widget-area';
      page.appendChild(wa);
    }

    if (apps && apps.length > 0) {
      var grid = document.createElement('div');
      grid.className = 'app-grid';
      apps.forEach(function(app) {
        grid.appendChild(MiniPhone.AppIcon.render(app, {
          showLabel: true,
          badge: unread[app.id] || 0
        }));
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

    var offset = -index * 100;

    if (animate === false) {
      track.style.transition = 'none';
    } else {
      track.style.transition = 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)';
    }

    track.style.transform = 'translateX(' + offset + '%)';

    /* 更新指示点 */
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.page-dot').forEach(function(dot, i) {
        dot.classList.toggle('active', i === currentPage);
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

    /* ── Touch 事件 ── */
    homeScreen.addEventListener('touchstart', onTouchStart, { passive: true });
    homeScreen.addEventListener('touchmove',  onTouchMove,  { passive: false });
    homeScreen.addEventListener('touchend',   onTouchEnd,   { passive: true });

    /* ── 鼠标拖拽（桌面调试用）── */
    homeScreen.addEventListener('mousedown',  onMouseDown);
  }
  /* ========== [/BLOCK: 手势绑定] ========== */

  /* ========== [BLOCK: Touch 事件处理] ========== */
  function onTouchStart(e) {
    var t = e.touches[0];
    touch.startX    = t.clientX;
    touch.startY    = t.clientY;
    touch.startTime = Date.now();
    touch.isDragging = true;
    touch.isVertical = null;
    touch.currentX  = t.clientX;

    /* 取消正在进行的动画 */
    track.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!touch.isDragging) return;
    var t = e.touches[0];
    var dx = t.clientX - touch.startX;
    var dy = t.clientY - touch.startY;

    /* 第一次移动时判断方向 */
    if (touch.isVertical === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      touch.isVertical = Math.abs(dy) > Math.abs(dx);
    }

    /* 纵向滚动：不拦截，让页面自然滚动 */
    if (touch.isVertical === true) return;

    /* 横向滑动：阻止默认行为，移动轨道 */
    if (touch.isVertical === false) {
      e.preventDefault();
      touch.currentX = t.clientX;
      var rawOffset  = -(currentPage * homeScreen.clientWidth) + dx;
      var pct        = (rawOffset / homeScreen.clientWidth) * 100;
      track.style.transform = 'translateX(' + pct + '%)';
    }
  }

  function onTouchEnd(e) {
    if (!touch.isDragging || touch.isVertical !== false) {
      touch.isDragging = false;
      return;
    }
    touch.isDragging = false;

    var dx       = touch.currentX - touch.startX;
    var dt       = Date.now() - touch.startTime;
    var width    = homeScreen.clientWidth;
    var isFling  = Math.abs(dx) > 30 && dt < 300;
    var isSwipe  = Math.abs(dx) > width * 0.3;

    if ((isFling || isSwipe) && dx < 0 && currentPage < totalPages - 1) {
      goToPage(currentPage + 1, true);
    } else if ((isFling || isSwipe) && dx > 0 && currentPage > 0) {
      goToPage(currentPage - 1, true);
    } else {
      goToPage(currentPage, true); // 回弹
    }
  }
  /* ========== [/BLOCK: Touch 事件处理] ========== */

  /* ========== [BLOCK: 鼠标拖拽（桌面）] ========== */
  function onMouseDown(e) {
    /* 只响应左键 */
    if (e.button !== 0) return;

    touch.startX    = e.clientX;
    touch.startY    = e.clientY;
    touch.startTime = Date.now();
    touch.isDragging = true;
    touch.isVertical = false;
    touch.currentX  = e.clientX;
    track.style.transition = 'none';

    function onMouseMove(e) {
      if (!touch.isDragging) return;
      touch.currentX = e.clientX;
      var dx = e.clientX - touch.startX;
      var rawOffset = -(currentPage * homeScreen.clientWidth) + dx;
      var pct = (rawOffset / homeScreen.clientWidth) * 100;
      track.style.transform = 'translateX(' + pct + '%)';
    }

    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!touch.isDragging) return;
      touch.isDragging = false;

      var dx      = e.clientX - touch.startX;
      var dt      = Date.now() - touch.startTime;
      var width   = homeScreen.clientWidth;
      var isFling = Math.abs(dx) > 30 && dt < 300;
      var isSwipe = Math.abs(dx) > width * 0.3;

      if ((isFling || isSwipe) && dx < 0 && currentPage < totalPages - 1) {
        goToPage(currentPage + 1, true);
      } else if ((isFling || isSwipe) && dx > 0 && currentPage > 0) {
        goToPage(currentPage - 1, true);
      } else {
        goToPage(currentPage, true);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  /* ========== [/BLOCK: 鼠标拖拽（桌面）] ========== */

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


