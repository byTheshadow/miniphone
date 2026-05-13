/* ========== MiniPhone App 主控制器 开始 ========== */

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

  /* ========== Dock 默认 开始 ========== */
  const DEFAULT_DOCK = ['chat', 'music', 'calendar', 'settings'];
  /* ========== Dock 默认 结束 ========== */

  /* ========== 默认页面布局 开始 ========== */
  /**
   * 新的页面布局结构：
   * pages = [
   *   {
   *     items: [
   *       { type: 'widget', widgetId: 'w_xxx', widgetType: 'clock', config: {} },
   *       { type: 'apps', appIds: ['chat', 'calendar', ...] },
   *     ]
   *   },
   *   ...
   * ]
   */
  function getDefaultPages() {
    return [
      {
        items: [
          { type: 'widget', widgetId: 'w_default_clock', widgetType: 'clock', config: {} },
          { type: 'widget', widgetId: 'w_default_profile', widgetType: 'profile', config: { name: 'MiniPhone 用户', bio: '这个人很懒，什么都没写~', avatarUrl: '' } },
          { type: 'apps', appIds: ['chat', 'calendar', 'rp', 'music', 'ticket', 'pet', 'ledger', 'settings'] },
        ]
      },
      {
        items: [
          { type: 'widget', widgetId: 'w_default_countdown', widgetType: 'countdown', config: { title: '新年快乐', targetDate: `${new Date().getFullYear() + 1}-01-01` } },
          { type: 'widget', widgetId: 'w_default_music', widgetType: 'music', config: { title: '暂无播放', artist: '点击打开音乐', progress: 0, coverUrl: '' } },
          { type: 'widget', widgetId: 'w_default_pet', widgetType: 'pet', config: { name: 'たまご', sprite: '🥚', mood: '开心', hp: 100, hunger: 80, happy: 90 } },{ type: 'widget', widgetId: 'w_default_memo', widgetType: 'memo', config: { content: '欢迎使用 MiniPhone！\n这是你的虚拟手机主屏幕 ✨' } },
        ]
      },
    ];
  }
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
  let $widgetManager, $wmList;
  let $widgetEditor, $wePreview, $weForm, $weTitle;
  let $widgetPicker, $wpGrid;
  /* ========== DOM 引用 结束 ========== */

  /* ========== 编辑器状态 开始 ========== */
  let editingWidgetId = null;
  let editingWidgetType = null;
  let editingPageIndex = null;
  let editingItemIndex = null;
  /* ========== 编辑器状态 结束 ========== */

  /* ========== 初始化 开始 ========== */
  function init() {
    $phone = document.getElementById('miniphone');
    $pagesContainer = document.getElementById('pages-container');
    $pageDots = document.getElementById('page-dots');
    $dockIcons = document.getElementById('dock-icons');
    $statusBar = document.getElementById('status-bar');
    $appView = document.getElementById('app-view');
    $appContent = document.getElementById('app-content');
    $settingsPanel = document.getElementById('settings-panel');
    $widgetManager = document.getElementById('widget-manager');
    $wmList = document.getElementById('wm-list');
    $widgetEditor = document.getElementById('widget-editor');
    $wePreview = document.getElementById('we-preview');
    $weForm = document.getElementById('we-form');
    $weTitle = document.getElementById('we-title');
    $widgetPicker = document.getElementById('widget-picker');
    $wpGrid = document.getElementById('wp-grid');

    initPages();
    initDock();
    applyTheme();
    applyStatusBar();
    applyWallpaper();
    bindSwipe();
    bindSettings();
    bindWidgetManager();
    MiniWidgets.startClockUpdate();
    updateStatusBarTime();
    bindStoreListeners();

    console.log('[MiniPhone] 初始化完成 ✨');
  }
  /* ========== 初始化 结束 ========== */

  /* ========== 更新状态栏时间 开始 ========== */
  function updateStatusBarTime() {
    const now = new Date();
    const el = document.getElementById('status-time');
    if (el) el.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  /* ========== 更新状态栏时间 结束 ========== */

  /* ========== 初始化页面 开始 ========== */
  function initPages() {
    let pages = MiniStore.get('pages');
    if (!pages || pages.length === 0 || !pages[0].items) {
      pages = getDefaultPages();
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

  /* ========== 刷新主屏幕 开始 ========== */
  function refreshHome() {
    const pages = MiniStore.get('pages') || getDefaultPages();
    renderPages(pages);
  }
  /* ========== 刷新主屏幕 结束 ========== */

  /* ========== 渲染页面内容项 开始 ========== */
  function renderPageItems(items) {
    let html = '';
    items.forEach(item => {
      if (item.type === 'widget') {
        html += MiniWidgets.render(item.widgetType, item.config || {}, item.widgetId || '');
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

    $pageDots.querySelectorAll('.page-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goToPage(parseInt(dot.dataset.dot));
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
    if (animate) $pagesContainer.classList.remove('dragging');
    $pagesContainer.style.transform = `translateX(${-(currentPage * 100)}%)`;}
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
    isHorizontalSwipe = null;
    $pagesContainer.classList.add('dragging');
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (isHorizontalSwipe === null) {
      if (Math.abs(dx) >8|| Math.abs(dy) > 8) {
        isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
      }return;
    }

    if (!isHorizontalSwipe) return;

    if (e.cancelable) e.preventDefault();
    touchDeltaX = dx;

    const pageWidth = $pagesContainer.parentElement.offsetWidth;
    const baseOffset = -(currentPage * pageWidth);
    const offset = baseOffset + touchDeltaX;
    $pagesContainer.style.transform = `translateX(${(offset / pageWidth) * 100}%)`;
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
    }touchDeltaX = 0;
  }
  /* ========== Touch 事件处理 结束 ========== */

  /* ========== Mouse 事件处理 开始 ========== */
  let mouseIsDown = false;

  function onMouseDown(e) {
    mouseIsDown = true;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchDeltaX = 0;
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
    $pagesContainer.style.transform = `translateX(${(offset / pageWidth) * 100}%)`;
  }

  function onMouseUp() {
    if (!mouseIsDown) return;
    mouseIsDown = false;
    onTouchEnd();
  }
  /* ========== Mouse 事件处理 结束 ========== */

  /* ========== App 点击绑定 开始 ========== */
  function bindAppClicks() {
    document.querySelectorAll('.app-icon[data-app]').forEach(el => {
      el.addEventListener('click', () => openApp(el.dataset.app));
    });
  }
  /* ========== App 点击绑定 结束 ========== */

  /* ========== 打开 App 开始 ========== */
  function openApp(appId) {
    if (appId === 'settings') { openSettings(); return; }

    const appDef = DEFAULT_APPS.find(a => a.id === appId);
    if (!appDef) return;

    $appContent.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">${appDef.emoji}</div>
        <h1 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">${appDef.name}</h1>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">功能开发中...</p>
        <button onclick="MiniApp.closeApp()" style="padding:12px 32px;background:var(--accent);color:var(--text-on-accent);border-radius:14px;font-size:15px;font-weight:600;border:none;cursor:pointer;">返回主屏幕</button>
      </div>
    `;
    $appView.classList.add('open');
  }
  /* ========== 打开 App 结束 ========== */

  /* ========== 关闭 App 开始 ========== */
  function closeApp() {
    $appView.classList.remove('open');
    setTimeout(() => { $appContent.innerHTML = ''; }, 400);
  }
  /* ========== 关闭 App 结束 ========== */

  /* ========== 设置面板 开始 ========== */
  function openSettings() {
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
    document.getElementById('settings-close').addEventListener('click', closeSettings);
    $settingsPanel.addEventListener('click', (e) => { if (e.target === $settingsPanel) closeSettings(); });

    document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
      MiniStore.set('theme', e.target.checked ? 'dark' : 'light');
      applyTheme();
    });

    document.getElementById('setting-status-bar').addEventListener('change', (e) => {
      MiniStore.set('showStatusBar', e.target.checked);
      applyStatusBar();
    });

    document.getElementById('setting-wallpaper-apply').addEventListener('click', () => {
      const url = document.getElementById('setting-wallpaper').value.trim();
      MiniStore.set('wallpaperUrl', url);
      applyWallpaper();
      showToast('壁纸已更新 🎨');
    });

    document.getElementById('setting-wallpaper-clear').addEventListener('click', () => {
      document.getElementById('setting-wallpaper').value = '';
      MiniStore.set('wallpaperUrl', '');
      applyWallpaper();
      showToast('壁纸已清除');
    });

    document.getElementById('setting-ai-save').addEventListener('click', () => {
      MiniStore.set('ai.baseUrl', document.getElementById('setting-ai-base').value.trim());
      MiniStore.set('ai.apiKey', document.getElementById('setting-ai-key').value.trim());
      MiniStore.set('ai.model', document.getElementById('setting-ai-model').value.trim());
      showToast('AI 配置已保存 🤖');
    });
  }
  /* ========== 设置面板 结束 ========== */

  /* ========== 小组件管理器 开始 ========== */
  function bindWidgetManager() {
    // 长按主屏幕空白区域打开管理器
    let longPressTimer = null;
    const homeScreen = document.getElementById('home-screen');

    homeScreen.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openWidgetManager();
    });

    // 也可以通过触摸长按
    homeScreen.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        if (!isDragging || Math.abs(touchDeltaX) < 5) {
          openWidgetManager();
        }
      }, 600);
    }, { passive: true });

    homeScreen.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });

    homeScreen.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });

    // 管理面板按钮
    document.getElementById('wm-close').addEventListener('click', closeWidgetManager);
    $widgetManager.addEventListener('click', (e) => { if (e.target === $widgetManager) closeWidgetManager(); });

    document.getElementById('wm-add').addEventListener('click', openWidgetPicker);

    // 编辑器按钮
    document.getElementById('we-back').addEventListener('click', closeWidgetEditor);
    document.getElementById('we-save').addEventListener('click', saveWidgetEdit);

    // 类型选择器按钮
    document.getElementById('wp-close').addEventListener('click', closeWidgetPicker);
    $widgetPicker.addEventListener('click', (e) => { if (e.target === $widgetPicker) closeWidgetPicker(); });
  }

  function openWidgetManager() {
    renderWidgetList();
    $widgetManager.classList.add('open');
  }

  function closeWidgetManager() {
    $widgetManager.classList.remove('open');
  }

  function renderWidgetList() {
    const pages = MiniStore.get('pages') || [];
    let html = '';

    pages.forEach((page, pageIndex) => {
      page.items.forEach((item, itemIndex) => {
        if (item.type !== 'widget') return;

        const typeDef = MiniWidgets.getTypeDef(item.widgetType);
        if (!typeDef) return;

        const config = item.config || {};
        let subtitle = '';
        if (item.widgetType === 'countdown') subtitle = config.title || '未设置';
        else if (item.widgetType === 'profile') subtitle = config.name || '用户';
        else if (item.widgetType === 'music') subtitle = config.title || '暂无播放';
        else if (item.widgetType === 'memo') subtitle = (config.content || '').slice(0, 30);
        else if (item.widgetType === 'pet') subtitle = config.name || '宠物';
        else if (item.widgetType === 'weather') subtitle = `${config.city || ''} ${config.temp || ''}`;
        else subtitle = typeDef.desc;

        html += `
          <div class="wm-card">
            <div class="wm-card__icon">${typeDef.icon}</div>
            <div class="wm-card__info">
              <div class="wm-card__name">${typeDef.name}</div>
              <div class="wm-card__desc">${subtitle}</div>
              <div class="wm-card__page">第${pageIndex + 1} 页</div>
            </div>
            <div class="wm-card__actions">
              <button class="wm-card__btn wm-card__btn--edit" data-page="${pageIndex}" data-item="${itemIndex}" title="编辑">✏️</button>
              <button class="wm-card__btn wm-card__btn--delete" data-page="${pageIndex}" data-item="${itemIndex}" title="删除">🗑️</button>
            </div>
          </div>
        `;
      });
    });

    if (!html) {
      html = `<div style="text-align:center;padding:40px 0;color:var(--text-secondary);">
        <div style="font-size:48px;margin-bottom:12px;">📦</div>
        <p>还没有小组件</p>
        <p style="font-size:12px;margin-top:4px;">点击右上角 ＋ 添加</p>
      </div>`;
    }

    $wmList.innerHTML = html;

    // 绑定编辑按钮
    $wmList.querySelectorAll('.wm-card__btn--edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pi = parseInt(btn.dataset.page);
        const ii = parseInt(btn.dataset.item);
        openWidgetEditor(pi, ii);
      });
    });

    // 绑定删除按钮
    $wmList.querySelectorAll('.wm-card__btn--delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pi = parseInt(btn.dataset.page);
        const ii = parseInt(btn.dataset.item);
        deleteWidget(pi, ii);
      });
    });
  }
  /* ========== 小组件管理器 结束 ========== */

  /* ========== 小组件删除 开始 ========== */
  function deleteWidget(pageIndex, itemIndex) {
    const pages = MiniStore.get('pages') || [];
    if (!pages[pageIndex]) return;

    pages[pageIndex].items.splice(itemIndex, 1);

    // 如果页面空了且不是唯一页面，删除该页
    if (pages[pageIndex].items.length === 0 && pages.length > 1) {
      pages.splice(pageIndex, 1);
      if (currentPage >= pages.length) currentPage = pages.length - 1;
    }

    MiniStore.set('pages', pages);
    refreshHome();
    renderWidgetList();
    showToast('小组件已删除');
  }
  /* ========== 小组件删除 结束 ========== */

  /* ========== 小组件编辑器 开始 ========== */
  function openWidgetEditor(pageIndex, itemIndex) {
    const pages = MiniStore.get('pages') || [];
    const item = pages[pageIndex]?.items[itemIndex];
    if (!item || item.type !== 'widget') return;

    editingPageIndex = pageIndex;
    editingItemIndex = itemIndex;
    editingWidgetType = item.widgetType;
    editingWidgetId = item.widgetId;

    const typeDef = MiniWidgets.getTypeDef(editingWidgetType);
    if (!typeDef) return;

    $weTitle.textContent = `编辑 ${typeDef.name}`;

    //渲染预览
    $wePreview.innerHTML = MiniWidgets.render(editingWidgetType, item.config || {}, editingWidgetId);

    //渲染表单
    renderEditorForm(typeDef.fields, item.config || {});

    $widgetEditor.classList.add('open');
  }

  function openWidgetEditorForNew(widgetType, pageIndex) {
    const typeDef = MiniWidgets.getTypeDef(widgetType);
    if (!typeDef) return;

    editingPageIndex = pageIndex;
    editingItemIndex = -1; // -1 表示新增
    editingWidgetType = widgetType;
    editingWidgetId = MiniWidgets.generateId();

    const defaultConfig = {};
    typeDef.fields.forEach(f => {
      if (f.type === 'emoji' && f.options?.length) defaultConfig[f.key] = f.options[0];});

    $weTitle.textContent = `添加 ${typeDef.name}`;
    $wePreview.innerHTML = MiniWidgets.render(widgetType, defaultConfig, editingWidgetId);
    renderEditorForm(typeDef.fields, defaultConfig);

    $widgetEditor.classList.add('open');
  }

  function renderEditorForm(fields, config) {
    if (fields.length === 0) {
      $weForm.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary);">此小组件无需配置</div>`;
      return;
    }

    let html = '';
    fields.forEach(field => {
      const value = config[field.key] ?? '';

      if (field.type === 'text') {
        html += `
          <div class="we-field">
            <label class="we-field__label">${field.label}</label>
            <input type="text" class="we-field__input" data-key="${field.key}" value="${escapeAttr(value)}" placeholder="${field.placeholder || ''}">
          </div>
        `;
      } else if (field.type === 'date') {
        html += `
          <div class="we-field">
            <label class="we-field__label">${field.label}</label>
            <input type="date" class="we-field__input" data-key="${field.key}" value="${value}">
          </div>
        `;
      } else if (field.type === 'number') {
        html += `
          <div class="we-field">
            <label class="we-field__label">${field.label}</label>
            <input type="number" class="we-field__input" data-key="${field.key}" value="${value}" min="0" max="100" placeholder="${field.placeholder || ''}">
          </div>
        `;
      } else if (field.type === 'textarea') {
        html += `
          <div class="we-field">
            <label class="we-field__label">${field.label}</label>
            <textarea class="we-field__input" data-key="${field.key}" rows="4" placeholder="${field.placeholder || ''}" style="resize:vertical;">${escapeHtml(value)}</textarea>
          </div>
        `;
      } else if (field.type === 'emoji') {
        html += `
          <div class="we-field">
            <label class="we-field__label">${field.label}</label>
            <div class="we-field__emoji-picker" data-key="${field.key}">
              ${(field.options || []).map(em => `
                <button type="button" class="we-field__emoji-btn ${em === value ? 'selected' : ''}" data-emoji="${em}">${em}</button>
              `).join('')}
            </div>
          </div>
        `;
      }
    });

    // 页面选择
    const pages = MiniStore.get('pages') || [];
    html += `
      <div class="we-field">
        <label class="we-field__label">放置页面</label>
        <select class="we-field__input" data-key="__page">
          ${pages.map((_, i) => `<option value="${i}" ${i === editingPageIndex ? 'selected' : ''}>第 ${i + 1} 页</option>`).join('')}
          <option value="new">➕ 新建页面</option>
        </select>
      </div>
    `;

    $weForm.innerHTML = html;

    // 绑定实时预览
    $weForm.querySelectorAll('.we-field__input').forEach(input => {
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, () => updateEditorPreview());
    });

    // 绑定 emoji 选择
    $weForm.querySelectorAll('.we-field__emoji-picker').forEach(picker => {
      picker.querySelectorAll('.we-field__emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          picker.querySelectorAll('.we-field__emoji-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          updateEditorPreview();
        });
      });
    });
  }

  function updateEditorPreview() {
    const config = collectFormData();
    $wePreview.innerHTML = MiniWidgets.render(editingWidgetType, config, editingWidgetId);
  }

  function collectFormData() {
    const config = {};
    $weForm.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      if (key === '__page') return;

      if (el.classList.contains('we-field__emoji-picker')) {
        const selected = el.querySelector('.we-field__emoji-btn.selected');
        config[key] = selected ? selected.dataset.emoji : '';
      } else {
        let val = el.value;
        if (el.type === 'number') val = parseInt(val) || 0;
        config[key] = val;
      }
    });
    return config;
  }

  function saveWidgetEdit() {
    const config = collectFormData();
    const pages = MiniStore.get('pages') || [];

    // 获取目标页面
    const pageSelect = $weForm.querySelector('[data-key="__page"]');
    let targetPage = pageSelect ? pageSelect.value : editingPageIndex;

    if (targetPage === 'new') {
      pages.push({ items: [] });
      targetPage = pages.length - 1;
    } else {
      targetPage = parseInt(targetPage);}

    const widgetItem = {
      type: 'widget',
      widgetId: editingWidgetId,
      widgetType: editingWidgetType,
      config: config,};

    if (editingItemIndex === -1) {
      // 新增
      if (!pages[targetPage]) pages[targetPage] = { items: [] };
      pages[targetPage].items.push(widgetItem);
    } else {
      // 编辑：如果页面变了，需要移动
      if (targetPage !== editingPageIndex) {
        pages[editingPageIndex].items.splice(editingItemIndex, 1);
        // 清理空页
        if (pages[editingPageIndex].items.length === 0&& pages.length > 1) {
          pages.splice(editingPageIndex, 1);if (targetPage > editingPageIndex) targetPage--;
        }
        if (!pages[targetPage]) pages[targetPage] = { items: [] };
        pages[targetPage].items.push(widgetItem);
      } else {
        pages[targetPage].items[editingItemIndex] = widgetItem;
      }
    }

    MiniStore.set('pages', pages);
    refreshHome();
    closeWidgetEditor();
    renderWidgetList();
    showToast(editingItemIndex === -1 ? '小组件已添加 ✨' : '小组件已更新 ✅');
  }

  function closeWidgetEditor() {
    $widgetEditor.classList.remove('open');
    editingWidgetId = null;
    editingWidgetType = null;
    editingPageIndex = null;
    editingItemIndex = null;
  }
  /* ========== 小组件编辑器 结束 ========== */

  /* ========== 小组件类型选择器 开始 ========== */
  function openWidgetPicker() {
    const types = MiniWidgets.getAllTypes();
    let html = '';

    Object.entries(types).forEach(([typeKey, typeDef]) => {
      html += `
        <div class="wp-type-card" data-type="${typeKey}">
          <div class="wp-type-card__icon">${typeDef.icon}</div>
          <div class="wp-type-card__name">${typeDef.name}</div>
          <div class="wp-type-card__desc">${typeDef.desc}</div>
        </div>
      `;
    });

    $wpGrid.innerHTML = html;

    $wpGrid.querySelectorAll('.wp-type-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        closeWidgetPicker();
        // 默认添加到当前页
        openWidgetEditorForNew(type, currentPage);
      });
    });

    $widgetPicker.classList.add('open');
  }

  function closeWidgetPicker() {
    $widgetPicker.classList.remove('open');
  }
  /* ========== 小组件类型选择器 结束 ========== */

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
    $statusBar.classList.toggle('hidden', !show);
  }
  /* ========== 应用状态栏 结束 ========== */

  /* ========== 应用壁纸 开始 ========== */
  function applyWallpaper() {
    const url = MiniStore.get('wallpaperUrl');
    $phone.style.background = url ? `url('${url}') center/cover no-repeat` : '';
  }
  /* ========== 应用壁纸 结束 ========== */

  /* ========== Toast 提示 开始 ========== */
  function showToast(message, duration = 2500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
  /* ========== Toast 提示 结束 ========== */

  /* ========== Store 监听 开始 ========== */
  function bindStoreListeners() {
    MiniStore.on('theme', () => applyTheme());
    MiniStore.on('showStatusBar', () => applyStatusBar());
    MiniStore.on('wallpaperUrl', () => applyWallpaper());}
  /* ========== Store 监听 结束 ========== */

  /* ========== 工具函数 开始 ========== */
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* ========== 工具函数 结束 ========== */

  /* ========== DOM Ready 开始 ========== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  /* ========== DOM Ready 结束 ========== */

  /* ========== 公开API 开始 ========== */
  return {
    openApp,
    closeApp,
    openSettings,
    closeSettings,
    showToast,
    goToPage,
    openWidgetManager,
    refreshHome,
  };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== MiniPhone App 主控制器 结束 ========== */
