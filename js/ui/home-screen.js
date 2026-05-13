/* ========== [BLOCK: MiniPhone HomeScreen 模块] ========== */
/**
 * MiniPhone.HomeScreen
 * 主屏幕：App 网格+ Dock 栏渲染
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.HomeScreen = (function() {
  'use strict';

  var appGrid = null;
  var dock = null;

  /* ========== [BLOCK: 默认 App 注册表] ========== */
  var defaultApps = [
    { id: 'chat',name: '聊天',   emoji: '💬', color: 'linear-gradient(135deg, #5B86E5, #36D1DC)' },
    { id: 'calendar', name: '日历',   emoji: '📅', color: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
    { id: 'rp',       name: '长聊',   emoji: '📖', color: 'linear-gradient(135deg, #A18CD1, #FBC2EB)' },
    { id: 'music',    name: '音乐',   emoji: '🎵', color: 'linear-gradient(135deg, #FA709A, #FEE140)' },
    { id: 'ticket',   name: '小票',   emoji: '🎫', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
    { id: 'pet',      name: '宠物',   emoji: '🐾', color: 'linear-gradient(135deg, #43E97B, #38F9D7)' },
    { id: 'ledger',   name: '记账',   emoji: '💰', color: 'linear-gradient(135deg, #4FACFE, #00F2FE)' },
    { id: 'settings', name: '设置',   emoji: '⚙️', color: 'linear-gradient(135deg, #667eea, #764ba2)' },];

  var defaultDockApps = ['chat', 'music', 'calendar', 'settings'];
  /* ========== [/BLOCK: 默认 App 注册表] ========== */

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    appGrid = document.getElementById('app-grid');
    dock = document.getElementById('dock');

    renderGrid();
    renderDock();

    // 监听图标更新
    MiniPhone.Store.on('iconsUpdated', function() {
      renderGrid();
      renderDock();
    });
  }
  /* ========== [/BLOCK: 初始化] ========== */

  /* ========== [BLOCK: 渲染 App 网格] ========== */
  function renderGrid() {
    if (!appGrid) return;
    appGrid.innerHTML = '';

    var dockIds = MiniPhone.Store.get('dockApps') || defaultDockApps;
    var unread = MiniPhone.Store.get('unreadCounts') || {};

    // 过滤掉 Dock 中的 App
    var gridApps = defaultApps.filter(function(app) {
      return dockIds.indexOf(app.id) === -1;
    });

    gridApps.forEach(function(app) {
      var iconEl = MiniPhone.AppIcon.render(app, {
        showLabel: true,
        badge: unread[app.id] || 0
      });
      appGrid.appendChild(iconEl);
    });
  }
  /* ========== [/BLOCK: 渲染 App 网格] ========== */

  /* ========== [BLOCK: 渲染 Dock 栏] ========== */
  function renderDock() {
    if (!dock) return;
    dock.innerHTML = '';

    var dockIds = MiniPhone.Store.get('dockApps') || defaultDockApps;
    var unread = MiniPhone.Store.get('unreadCounts') || {};

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
    renderGrid: renderGrid,
    renderDock: renderDock,
    getAppConfig: getAppConfig,
    getAllApps: getAllApps
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone HomeScreen 模块] ========== */
