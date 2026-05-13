/* ========== MiniPhone App 主控制器 开始 ========== */

/**
 * MiniPhone App
 * 主屏幕初始化、页面滑动、App 启动、设置面板
 */
const MiniApp = (() => {
  'use strict';

  /* ========== 默认 App 定义 开始 ========== */
  const DEFAULT_APPS = [
    { id: 'chat',name: '聊天',     emoji: '💬', color: '#34C759' },
    { id: 'calendar', name: '日历',     emoji: '📅', color: '#FF3B30' },
    { id: 'rp',       name: 'RP模式',   emoji: '🎭', color: '#AF52DE' },
    { id: 'music',    name: '音乐',     emoji: '🎵', color: '#FF2D55' },
    { id: 'ticket',   name: '恋爱小票', emoji: '🎫', color: '#FF9500' },
    { id: 'pet',      name: '宠物',     emoji: '🐾', color: '#5AC8FA' },
    { id: 'ledger',   name: '记账',     emoji: '💰', color: '#FFCC00' },
    { id: 'settings', name: '设置',     emoji: '⚙️', color: '#8E8E93' },
  ];
  /* ========== 默认 App 定义 结束 ========== */

  /* ========== Dock 默认 App 开始 ========== */
  const DEFAULT_DOCK = ['chat', 'music', 'calendar', 'settings'];
  /* ========== Dock 默认 App 结束 ========== */

  /* ========== 默认页面布局 开始 ========== */
  const DEFAULT_PAGES = [
    {
      items: [
        { type: 'widget', widget: 'clock' },
        { type: 'widget', widget: 'profile' },
        { type: 'apps',   appIds: ['chat', 'calendar', 'rp', 'music', 'ticket', 'pet', 'ledger', 'settings'] },
      ]
    },
    {
      items: [
        { type: 'widget', widget: 'countdown' },
        { type: 'widget', widget: 'music' },
        { type: 'widget', widget: 'pet' },
        { type: 'widget', widget: 'memo' },
      ]
    },
  ];
  /* ========== 默认页面布局 结束 ========== */

  /* ========== 滑动状态 开始 ========== */
  let currentPage = 0;
  let totalPages = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let isDragging = false;
  let isHorizontalSwipe = null;
  const SWIPE_THRESHOLD = 50;
  /* ========== 滑动状态 结束 ========== */

  /* ========== DOM 引用 开始 ========== */
  let $phone, $pagesContainer, $pageDots, $dockIcons;
  let $statusBar, $appView, $appContent;
  let $settingsPanel;
  /* ========== DOM 引用 结束 ========== */

  /* ========== 初始化 开始 ========== */
  function init() {
    // 获取 DOM 引用
    $phone = document.getElementById('miniphone');
    $pagesContainer = document.getElementById('pages-container');
    $pageDots = document.getElementById('page-dots');
    $dockIcons = document.getElementById('dock-icons');
    $statusBar = document.getElementById('status-bar');
    $appView = document.getElementById('app-view');
    $appContent = document.getElementById('app-content');
    $settingsPanel = document.getElementById('settings-panel');

    // 初始化页面布局
    initPages();

    // 初始化 Dock
    initDock();

    // 应用主题
    applyTheme();

    // 应用状态栏设置
    applyStatusBar();

    // 应用壁纸
    applyWallpaper();

    // 绑定滑动事件
    bindSwipe();

    // 绑定设置面板
    bindSettings();

    // 启动时钟
    MiniWidgets.startClockUpdate();updateStatusBarTime();

    // 监听状态变化
    bindStoreListeners();

    console.log('[MiniPhone] 初始化完成 ✨');
  }
  /* ========== 初始化 结束 ========== */

  /* ========== 更新状态栏时间 开始 ========== */
  function updateStatusBarTime() {
    const now = new Date();
    const el = document.getElementById('status-time');
    if (el) {
      el.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }
  /* ========== 更新状态栏时间 结束 ========== */

  /* ========== 初始化页面 开始 ========== */
  function initPages() {
    let pages = MiniStore.get('pages');
    if (!pages || pages.length === 0) {
      pages = DEFAULT_PAGES;
      MiniStore.set('pages', pages);
    }
    renderPages(pages);
  }
  /* ========== 初始化页面 结束 ========== */

  /* ========== 渲染所有页面 开始 ========== */
  function renderPages(pages) {
    totalPages = pages.length;
    currentPage = Math.min(MiniStore.get('currentPage') || 0, totalPages - 1);

    let html = '';
    pages.forEach((page, pageIndex) => {
      html += `<div class="home-page" data-page="${pageIndex}">`;
      html += renderPageItems(page.items);
      html += `</div>`;
    });

    $pagesContainer.innerHTML = html;
    updatePagePosition(false);
    renderDots();
    bindAppClicks();
  }
  /* ========== 渲染所有页面 结束 ========== */

  /* ========== 渲染页面内容项 开始 ========== */
  function renderPageItems(items) {
    let html = '';
    items.forEach(item => {
      if (item.type === 'widget') {
        const widgetData = MiniStore.get(`widgets.${item.widget}`) || {};
        html += MiniWidgets.render(item.widget, widgetData);
      } else if (item.type === 'apps') {
        html += `<div class="icon-grid">`;
        item.appIds.forEach(appId => {
          html += renderAppIcon(appId);
        });
        html += `</div>`;
      }
    });
    return html;
  }
  /* ========== 渲染页面内容项 结束 ========== */

  /* ========== 渲染 App 图标 开始 ========== */
  function renderAppIcon(appId) {
    const appDef = DEFAULT_APPS.find(a => a.id === appId);
    if (!appDef) return '';

    const userConfig = MiniStore.get(`apps.${appId}`) || {};
    const iconUrl = userConfig.iconUrl || '';
    const badge = userConfig.badge || 0;

    let iconContent;
    if (iconUrl) {
      iconContent = `<img src="${iconUrl}" alt="${appDef.name}" onerror="this.parentElement.innerHTML='${appDef.emoji}'">`;
    } else {
      iconContent = appDef.emoji;
    }

    const badgeHtml = badge > 0
      ? `<span class="app-icon__badge">${badge > 99 ? '99+' : badge}</span>`
      : '';

    return `
      <div class="app-icon" data-app="${appId}">
        <div class="app-icon__image" style="background:${iconUrl ? 'transparent' : appDef.color}20">
          ${iconContent}
          ${badgeHtml}
        </div>
        <span class="app-icon__label">${appDef.name}</span>
      </div>
    `;
  }
  /* ========== 渲染 App 图标 结束 ========== */

  /* ========== 初始化 Dock 开始 ========== */
  function initDock() {
    let dock = MiniStore.get('dock');
    if (!dock || dock.length === 0) {
      dock = DEFAULT_DOCK;
      MiniStore.set('dock', dock);
    }
    renderDock(dock);
  }
  /* ========== 初始化 Dock 结束 ========== */

  /* ========== 渲染 Dock 开始 ========== */
  function renderDock(dockIds) {
    let html = '';
    dockIds.forEach(appId => {
      html += renderAppIcon(appId);
    });
    $dockIcons.innerHTML = html;
    bindAppClicks();
  }
  /* ========== 渲染 Dock 结束 ========== */

  /* ========== 渲染页面指示器 开始 ========== */
  function renderDots() {
    let html = '';
    for (let i = 0; i < totalPages; i++) {
      html += `<div class="page-dot ${i === currentPage ? 'active' : ''}" data-dot="${i}"></div>`;
    }
    $pageDots.innerHTML = html;

    // 点击指示器跳转
    $pageDots.querySelectorAll('.page-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.dot);
        goToPage(target);
      });
    });
  }
  /* ========== 渲染页面指示器 结束 ========== */

  /* ========== 页面跳转 开始 ========== */
  function goToPage(index) {
    if (index < 0 || index >= totalPages) return;
    currentPage = index;
    MiniStore.set('currentPage', currentPage);
    updatePagePosition(true);
    updateDots();
  }
  /* ========== 页面跳转 结束 ========== */

  /* ========== 更新页面位置 开始 ========== */
  function updatePagePosition(animate) {
    if (animate) {
      $pagesContainer.classList.remove('dragging');
    }
    const offset = -(currentPage * 100);
    $pagesContainer.style.transform = `translateX(${offset}%)`;
  }
  /* ========== 更新页面位置 结束 ========== */

  /* ========== 更新指示器 开始 ========== */
  function updateDots() {
    $pageDots.querySelectorAll('.page-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
    });
  }
  /* ========== 更新指示器 结束 ========== */

  /* ========== 滑动手势绑定 开始 ========== */
  function bindSwipe() {
    const target = document.getElementById('home-screen');

    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: false });
    target.addEventListener('touchend', onTouchEnd, { passive: true });

    //鼠标支持（桌面端）
    target.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  /* ========== 滑动手势绑定 结束 ========== */

  /* ========== Touch 事件处理 开始 ========== */
  function onTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchDeltaX = 0;
    isDragging = true;
    isHorizontalSwipe = null;$pagesContainer.classList.add('dragging');
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // 判断滑动方向
    if (isHorizontalSwipe === null) {
      if (Math.abs(dx) >8|| Math.abs(dy) > 8) {
        isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
      }return;
    }

    if (!isHorizontalSwipe) return;

    e.preventDefault();
    touchDeltaX = dx;

    const pageWidth = $pagesContainer.parentElement.offsetWidth;
    const baseOffset = -(currentPage * pageWidth);
    const offset = baseOffset + touchDeltaX;
    const percent = (offset / pageWidth) * 100;
    $pagesContainer.style.transform = `translateX(${percent}%)`;
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    isHorizontalSwipe = null;
    $pagesContainer.classList.remove('dragging');

    if (touchDeltaX < -SWIPE_THRESHOLD && currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else if (touchDeltaX > SWIPE_THRESHOLD && currentPage > 0) {
      goToPage(currentPage - 1);
    } else {
      updatePagePosition(true);
    }
    touchDeltaX = 0;
  }
  /* ========== Touch 事件处理 结束 ========== */

  /* ========== Mouse 事件处理（桌面端）开始 ========== */
  let mouseIsDown = false;

  function onMouseDown(e) {
    mouseIsDown = true;
    touchStartX = e.clientX;
    touchStartY = e.clientY;touchDeltaX = 0;
    isDragging = true;
    isHorizontalSwipe = null;
    $pagesContainer.classList.add('dragging');
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!mouseIsDown || !isDragging) return;
    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;

    if (isHorizontalSwipe === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontalSwipe) return;

    touchDeltaX = dx;
    const pageWidth = $pagesContainer.parentElement.offsetWidth;
    const baseOffset = -(currentPage * pageWidth);
    const offset = baseOffset + touchDeltaX;
    const percent = (offset / pageWidth) * 100;
    $pagesContainer.style.transform = `translateX(${percent}%)`;
  }

  function onMouseUp() {
    if (!mouseIsDown) return;
    mouseIsDown = false;
    onTouchEnd();
  }
  /* ========== Mouse 事件处理（桌面端）结束 ========== */

  /* ========== App 点击绑定 开始 ========== */
  function bindAppClicks() {
    document.querySelectorAll('.app-icon[data-app]').forEach(el => {
      el.addEventListener('click', () => {
        const appId = el.dataset.app;
        openApp(appId);
      });
    });
  }
  /* ========== App 点击绑定 结束 ========== */

  /* ========== 打开 App 开始 ========== */
  function openApp(appId) {
    if (appId === 'settings') {
      openSettings();
      return;
    }

    const appDef = DEFAULT_APPS.find(a => a.id === appId);
    if (!appDef) return;

    // 显示占位内容（后续各App 模块会替换）
    $appContent.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">${appDef.emoji}</div>
        <h1 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">${appDef.name}</h1>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">功能开发中...</p>
        <button onclick="MiniApp.closeApp()" style="
          padding:12px 32px;
          background:var(--accent);
          color:var(--text-on-accent);
          border-radius:14px;
          font-size:15px;
          font-weight:600;
          border:none;
          cursor:pointer;
        ">返回主屏幕</button>
      </div>
    `;

    $appView.classList.add('open');
  }
  /* ========== 打开 App 结束 ========== */

  /* ========== 关闭 App 开始 ========== */
  function closeApp() {
    $appView.classList.remove('open');
    setTimeout(() => {
      $appContent.innerHTML = '';
    }, 400);
  }
  /* ========== 关闭 App 结束 ========== */

  /* ========== 设置面板 开始 ========== */
  function openSettings() {
    // 同步当前值到表单
    document.getElementById('setting-dark-mode').checked = MiniStore.get('theme') === 'dark';
    document.getElementById('setting-status-bar').checked = MiniStore.get('showStatusBar');
    document.getElementById('setting-wallpaper').value = MiniStore.get('wallpaperUrl') || '';
    document.getElementById('setting-ai-base').value = MiniStore.get('ai.baseUrl') || '';
    document.getElementById('setting-ai-key').value = MiniStore.get('ai.apiKey') || '';
    document.getElementById('setting-ai-model').value = MiniStore.get('ai.model') || '';

    $settingsPanel.classList.add('open');
  }

  function closeSettings() {
    $settingsPanel.classList.remove('open');
  }

  function bindSettings() {
    // 关闭按钮
    document.getElementById('settings-close').addEventListener('click', closeSettings);

    // 点击遮罩关闭
    $settingsPanel.addEventListener('click', (e) => {
      if (e.target === $settingsPanel) closeSettings();
    });

    // 深色模式切换
    document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
      MiniStore.set('theme', e.target.checked ? 'dark' : 'light');applyTheme();
    });

    // 状态栏切换
    document.getElementById('setting-status-bar').addEventListener('change', (e) => {
      MiniStore.set('showStatusBar', e.target.checked);
      applyStatusBar();
    });

    // 壁纸应用
    document.getElementById('setting-wallpaper-apply').addEventListener('click', () => {
      const url = document.getElementById('setting-wallpaper').value.trim();
      MiniStore.set('wallpaperUrl', url);
      applyWallpaper();
      showToast('壁纸已更新 🎨');
    });

    // 壁纸清除
    document.getElementById('setting-wallpaper-clear').addEventListener('click', () => {
      document.getElementById('setting-wallpaper').value = '';
      MiniStore.set('wallpaperUrl', '');
      applyWallpaper();
      showToast('壁纸已清除');
    });

    // AI 配置保存
    document.getElementById('setting-ai-save').addEventListener('click', () => {
      MiniStore.set('ai.baseUrl', document.getElementById('setting-ai-base').value.trim());
      MiniStore.set('ai.apiKey', document.getElementById('setting-ai-key').value.trim());
      MiniStore.set('ai.model', document.getElementById('setting-ai-model').value.trim());
      showToast('AI 配置已保存 🤖');
    });
  }
  /* ========== 设置面板 结束 ========== */

  /* ========== 应用主题 开始 ========== */
  function applyTheme() {
    const theme = MiniStore.get('theme');
    $phone.classList.remove('theme-light', 'theme-dark');
    $phone.classList.add(`theme-${theme}`);
  }
  /* ========== 应用主题 结束 ========== */

  /* ========== 应用状态栏 开始 ========== */
  function applyStatusBar() {
    const show = MiniStore.get('showStatusBar');
    if (show) {
      $statusBar.classList.remove('hidden');} else {
      $statusBar.classList.add('hidden');
    }
  }
  /* ========== 应用状态栏 结束 ========== */

  /* ========== 应用壁纸 开始 ========== */
  function applyWallpaper() {
    const url = MiniStore.get('wallpaperUrl');
    if (url) {
      $phone.style.background = `url('${url}') center/cover no-repeat`;
    } else {
      $phone.style.background = '';
    }
  }
  /* ========== 应用壁纸 结束 ========== */

  /* ========== Toast 提示 开始 ========== */
  function showToast(message, duration = 2500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
  /* ========== Toast 提示 结束 ========== */

  /* ========== Store 监听 开始 ========== */
  function bindStoreListeners() {
    MiniStore.on('theme', () => applyTheme());
    MiniStore.on('showStatusBar', () => applyStatusBar());
    MiniStore.on('wallpaperUrl', () => applyWallpaper());
  }
  /* ========== Store 监听 结束 ========== */

  /* ========== DOM Ready 开始 ========== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  /* ========== DOM Ready 结束 ========== */

  /* ========== 公开 API 开始 ========== */
  return {
    openApp,
    closeApp,
    openSettings,
    closeSettings,
    showToast,
    goToPage,
  };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== MiniPhone App 主控制器 结束 ========== */
