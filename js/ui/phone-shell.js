/* ============================================================
   phone-shell.js — 主屏幕交互逻辑
   负责：页面滑动、图标渲染、小组件渲染、编辑模式、Dock
   ============================================================ */

/* [PHONE-SHELL-CORE START] PhoneShell 核心 */
const PhoneShell = (() => {

  // DOM 引用
  let _pagesContainer = null;
  let _pageDots       = null;
  let _dockIcons      = null;

  // 滑动状态
  let _touchStartX  = 0;
  let _touchStartY  = 0;
  let _isDragging   = false;
  let _dragOffsetX  = 0;

  // 编辑模式长按计时器
  let _longPressTimer = null;

  // 当前页索引（本地缓存，与 Store 同步）
  let _currentPage = 0;

  /**
   * 初始化主屏幕
   */
  function init() {
    _pagesContainer = document.getElementById('pages-container');
    _pageDots       = document.getElementById('page-dots');
    _dockIcons      = document.getElementById('dock-icons');

    // 从 Storage 加载布局，若无则使用默认布局
    _loadLayout().then(() => {
      _renderDock();
      _renderAllPages();
      _updatePageDots();
      _bindSwipeEvents();
      _bindLongPress();
    });

    // 订阅 Store 变化
    Store.subscribe('currentPage', (page) => {
      _currentPage = page;
      _slideTo(page, true);
      _updatePageDots();
    });

    Store.subscribe('isEditMode', (editing) => {
      _toggleEditMode(editing);
    });
  }

  /* ── 布局加载 ── */

  /* [LAYOUT-LOAD START] 加载布局配置 */
  async function _loadLayout() {
    const saved = await Storage.get(Storage.STORES.pages, 'layout');
    if (saved?.pages) {
      Store.set('pages', saved.pages);
      Store.set('dockApps', saved.dockApps ?? Store.get('dockApps'));
    } else {
      // 默认布局：两页
      Store.set('pages', _defaultLayout());
    }
  }

  /** 默认两页布局 */
  function _defaultLayout() {
    return [
      {
        id: 'page-0',
        items: [
          // 第一页：时钟小组件 + 常用 App
          { type: 'widget', widgetId: 'clock',         size: '2x2', col: 1 },
          { type: 'widget', widgetId: 'countdown',     size: '2x1', col: 3 },
          { type: 'widget', widgetId: 'profile-card',  size: '4x1', col: 1 },
          { type: 'app',    appId: 'chat',     col: 1 },
          { type: 'app',    appId: 'calendar', col: 2 },
          { type: 'app',    appId: 'music',    col: 3 },
          { type: 'app',    appId: 'pet',      col: 4 },
          { type: 'widget', widgetId: 'together-music', size: '4x2', col: 1 },
        ]
      },
      {
        id: 'page-1',
        items: [
          // 第二页：更多小组件 + App
          { type: 'widget', widgetId: 'mood',           size: '2x1', col: 1 },
          { type: 'widget', widgetId: 'fortune',        size: '2x1', col: 3 },
          { type: 'widget', widgetId: 'pomodoro',       size: '2x2', col: 1 },
          { type: 'widget', widgetId: 'steps',          size: '2x2', col: 3 },
          { type: 'widget', widgetId: 'photo-carousel', size: '2x2', col: 1 },
          { type: 'widget', widgetId: 'sticky-note',    size: '2x2', col: 3 },
          { type: 'app',    appId: 'ledger',   col: 1 },
          { type: 'app',    appId: 'ticket',   col: 2 },
          { type: 'app',    appId: 'settings', col: 3 },
        ]
      }
    ];
  }
  /* [LAYOUT-LOAD END] */

  /* ── 渲染 ── */

  /* [RENDER-PAGES START] 渲染所有页面 */
  function _renderAllPages() {
    const pages = Store.get('pages');
    if (!_pagesContainer) return;

    _pagesContainer.innerHTML = '';
    // 设置容器总宽度
    _pagesContainer.style.width = `${pages.length * 100}%`;

    pages.forEach((page, idx) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'home-page';
      pageEl.dataset.pageIndex = idx;
      pageEl.id = page.id;

      page.items.forEach(item => {
        if (item.type === 'widget') {
          pageEl.appendChild(_createWidgetEl(item));
        } else if (item.type === 'app') {
          pageEl.appendChild(_createAppIconEl(item));
        }
      });

      _pagesContainer.appendChild(pageEl);
    });

    // 跳到当前页（无动画）
    _slideTo(_currentPage, false);
  }
  /* [RENDER-PAGES END] */

  /* [RENDER-APP-ICON START] 创建 App 图标元素 */
  function _createAppIconEl(item) {
    const appDef = Router.getAll().find(a => a.id === item.appId);
    const wrapper = document.createElement('div');
    wrapper.className = 'app-icon-wrapper';
    wrapper.dataset.appId = item.appId;

    // 删除按钮（编辑模式显示）
    const delBtn = document.createElement('button');
    delBtn.className = 'app-icon-delete';
    delBtn.setAttribute('aria-label', `删除 ${appDef?.name ?? item.appId}`);
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _removeItem(item.appId, 'app');
    });

    // 图标主体
    const iconEl = document.createElement('div');
    iconEl.className = 'app-icon';
    iconEl.appendChild(delBtn);

    if (appDef?.iconUrl) {
      // 用户自定义图标 URL
      const img = document.createElement('img');
      img.src = appDef.iconUrl;
      img.alt = appDef.name ?? item.appId;
      img.onerror = () => {
        // URL 加载失败，回退到 emoji
        img.remove();
        iconEl.textContent = appDef?.emoji ?? '📱';
      };
      iconEl.appendChild(img);
    } else {
      // emoji 兜底
      iconEl.insertAdjacentText('beforeend', appDef?.emoji ?? '📱');
    }

    // 标签
    const label = document.createElement('span');
    label.className = 'app-icon-label';
    label.textContent = appDef?.name ?? item.appId;

    wrapper.appendChild(iconEl);
    wrapper.appendChild(label);

    // 点击打开 App
    wrapper.addEventListener('click', () => {
      if (Store.get('isEditMode')) return;
      Router.open(item.appId);
    });

    return wrapper;
  }
  /* [RENDER-APP-ICON END] */

  /* [RENDER-WIDGET START] 创建小组件元素 */
  function _createWidgetEl(item) {
    const wrapper = document.createElement('div');
    const size = item.size ?? '2x2';
    wrapper.className = `widget widget-${size}`;
    wrapper.dataset.widgetId = item.widgetId;

    // 删除按钮（编辑模式）
    const delBtn = document.createElement('button');
    delBtn.className = 'app-icon-delete';
    delBtn.setAttribute('aria-label', `删除小组件`);
    delBtn.textContent = '✕';
    delBtn.style.cssText = 'display:none;position:absolute;top:6px;left:6px;z-index:10;';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _removeItem(item.widgetId, 'widget');
    });
    wrapper.appendChild(delBtn);

    // 交给 WidgetRegistry 渲染内容
    if (typeof WidgetRegistry !== 'undefined') {
      WidgetRegistry.mount(item.widgetId, wrapper);
    } else {
      wrapper.innerHTML += `
        <div class="glass-dark widget-inner" style="border-radius:20px;">
          <span class="widget-label">${item.widgetId}</span>
        </div>`;
    }

    return wrapper;
  }
  /* [RENDER-WIDGET END] */

  /* [RENDER-DOCK START] 渲染 Dock */
  function _renderDock() {
    if (!_dockIcons) return;
    _dockIcons.innerHTML = '';

    const dockApps = Store.get('dockApps');
    dockApps.forEach(appId => {
      const appDef = Router.getAll().find(a => a.id === appId);
      const item = { type: 'app', appId };
      const iconEl = _createAppIconEl(item);
      _dockIcons.appendChild(iconEl);
    });
  }
  /* [RENDER-DOCK END] */

  /* ── 页面滑动 ── */

  /* [SWIPE START] 滑动事件绑定 */
  function _bindSwipeEvents() {
    const homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;

    homeScreen.addEventListener('touchstart', _onTouchStart, { passive: true });
    homeScreen.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    homeScreen.addEventListener('touchend',   _onTouchEnd,   { passive: true });

    // 桌面端鼠标支持
    homeScreen.addEventListener('mousedown',  _onMouseDown);
    homeScreen.addEventListener('mousemove',  _onMouseMove);
    homeScreen.addEventListener('mouseup',    _onMouseUp);
    homeScreen.addEventListener('mouseleave', _onMouseUp);
  }

  function _onTouchStart(e) {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    _isDragging  = false;
    _dragOffsetX = 0;
    // 停止过渡动画
    if (_pagesContainer) _pagesContainer.style.transition = 'none';
  }

  function _onTouchMove(e) {
    const dx = e.touches[0].clientX - _touchStartX;
    const dy = Math.abs(e.touches[0].clientY - _touchStartY);

    // 水平滑动优先，阻止页面纵向滚动
    if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
      e.preventDefault();
      _isDragging  = true;
      _dragOffsetX = dx;
      _applyDragOffset(dx);
    }
  }

  function _onTouchEnd() {
    if (!_isDragging) return;
    _isDragging = false;
    _settleAfterDrag(_dragOffsetX);
  }

  // 鼠标事件（桌面端）
  let _mouseDown = false;
  function _onMouseDown(e) {
    _touchStartX = e.clientX;
    _touchStartY = e.clientY;
    _mouseDown   = true;
    _dragOffsetX = 0;
    if (_pagesContainer) _pagesContainer.style.transition = 'none';
  }
  function _onMouseMove(e) {
    if (!_mouseDown) return;
    const dx = e.clientX - _touchStartX;
    const dy = Math.abs(e.clientY - _touchStartY);
    if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
      _isDragging  = true;
      _dragOffsetX = dx;
      _applyDragOffset(dx);
    }
  }
  function _onMouseUp() {
    if (!_mouseDown) return;
    _mouseDown = false;
    if (_isDragging) {
      _isDragging = false;
      _settleAfterDrag(_dragOffsetX);
    }
  }

  /** 拖动时实时偏移 */
  function _applyDragOffset(dx) {
    if (!_pagesContainer) return;
    const pages    = Store.get('pages');
    const pageW    = _pagesContainer.parentElement?.offsetWidth ?? 390;
    const baseX    = -(_currentPage * pageW);
    // 边界阻尼：第一页左滑 / 最后页右滑时有阻力
    let offset = dx;
    if ((_currentPage === 0 && dx > 0) ||
        (_currentPage === pages.length - 1 && dx < 0)) {
      offset = dx * 0.25;
    }
    _pagesContainer.style.transform = `translateX(${baseX + offset}px)`;
  }

  /** 松手后决定翻页还是回弹 */
  function _settleAfterDrag(dx) {
    const pages = Store.get('pages');
    const threshold = 60; // px，超过此距离才翻页
    let target = _currentPage;

    if (dx < -threshold && _currentPage < pages.length - 1) {
      target = _currentPage + 1;
    } else if (dx > threshold && _currentPage > 0) {
      target = _currentPage - 1;
    }

    Store.set('currentPage', target);
    _slideTo(target, true);
  }

  /** 滑动到指定页 */
  function _slideTo(pageIndex, animate) {
    if (!_pagesContainer) return;
    const pageW = _pagesContainer.parentElement?.offsetWidth ?? 390;
    const x     = -(pageIndex * pageW);

    if (animate) {
      _pagesContainer.style.transition =
        'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    } else {
      _pagesContainer.style.transition = 'none';
    }
    _pagesContainer.style.transform = `translateX(${x}px)`;
  }
  /* [SWIPE END] */

  /* ── 页面指示点 ── */

  /* [PAGE-DOTS START] 更新页面指示点 */
  function _updatePageDots() {
    if (!_pageDots) return;
    const pages = Store.get('pages');
    _pageDots.innerHTML = '';
    pages.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'page-dot' + (i === _currentPage ? ' active' : '');
      dot.addEventListener('click', () => Store.set('currentPage', i));
      _pageDots.appendChild(dot);
    });
  }
  /* [PAGE-DOTS END] */

  /* ── 编辑模式 ── */

  /* [EDIT-MODE START] 长按进入编辑模式 */
  function _bindLongPress() {
    const homeScreen = document.getElementById('home-screen');
    if (!homeScreen) return;

    homeScreen.addEventListener('touchstart', (e) => {
      _longPressTimer = setTimeout(() => {
        if (!_isDragging) {
          Store.set('isEditMode', true);
        }
      }, 600);
    }, { passive: true });

    homeScreen.addEventListener('touchend',   _cancelLongPress, { passive: true });
    homeScreen.addEventListener('touchmove',  _cancelLongPress, { passive: true });
    homeScreen.addEventListener('mousedown',  () => {
      _longPressTimer = setTimeout(() => {
        Store.set('isEditMode', true);
      }, 600);
    });
    homeScreen.addEventListener('mouseup',    _cancelLongPress);
    homeScreen.addEventListener('mouseleave', _cancelLongPress);

    // 点击空白区域退出编辑模式
    homeScreen.addEventListener('click', (e) => {
      if (Store.get('isEditMode') &&
          !e.target.closest('.app-icon-wrapper') &&
          !e.target.closest('.widget')) {
        Store.set('isEditMode', false);
      }
    });
  }

  function _cancelLongPress() {
    clearTimeout(_longPressTimer);
  }

  /** 切换编辑模式视觉状态 */
  function _toggleEditMode(editing) {
    document.querySelectorAll('.app-icon-wrapper').forEach(el => {
      el.classList.toggle('wiggle', editing);
    });
    document.querySelectorAll('.widget').forEach(el => {
      el.classList.toggle('wiggle', editing);
      const delBtn = el.querySelector('.app-icon-delete');
      if (delBtn) delBtn.style.display = editing ? 'flex' : 'none';
    });
  }
  /* [EDIT-MODE END] */

  /* ── 布局修改 ── */

   /* [LAYOUT-EDIT START] 删除图标/小组件 */
  function _removeItem(itemId, type) {
    const pages = Store.get('pages');
    const updated = pages.map(page => ({
      ...page,
      items: page.items.filter(item => {
        if (type === 'app')    return item.appId    !== itemId;
        if (type === 'widget') return item.widgetId !== itemId;
        return true;
      })
    }));
    Store.set('pages', updated);
    _saveLayout();
    _renderAllPages();
    _updatePageDots();
  }

  /**
   * 保存当前布局到 IndexedDB
   */
  async function _saveLayout() {
    await Storage.put(Storage.STORES.pages, {
      id:       'layout',
      pages:    Store.get('pages'),
      dockApps: Store.get('dockApps'),
    });
  }

  /**
   * 新增一页
   */
  function addPage() {
    const pages = Store.get('pages');
    const newPage = {
      id:    `page-${Date.now()}`,
      items: [],
    };
    Store.set('pages', [...pages, newPage]);
    _saveLayout();
    _renderAllPages();
    _updatePageDots();
    // 跳到新页
    Store.set('currentPage', pages.length);
  }

  /**
   * 向当前页添加 App 图标
   * @param {string} appId
   */
  function addAppToCurrentPage(appId) {
    const pages   = Store.get('pages');
    const pageIdx = Store.get('currentPage');
    const updated = pages.map((page, i) => {
      if (i !== pageIdx) return page;
      // 避免重复
      if (page.items.some(it => it.type === 'app' && it.appId === appId)) return page;
      return { ...page, items: [...page.items, { type: 'app', appId }] };
    });
    Store.set('pages', updated);
    _saveLayout();
    _renderAllPages();
  }

  /**
   * 向当前页添加小组件
   * @param {string} widgetId
   * @param {string} size     - '2x1' | '2x2' | '4x1' | '4x2'
   */
  function addWidgetToCurrentPage(widgetId, size = '2x2') {
    const pages   = Store.get('pages');
    const pageIdx = Store.get('currentPage');
    const updated = pages.map((page, i) => {
      if (i !== pageIdx) return page;
      return {
        ...page,
        items: [...page.items, { type: 'widget', widgetId, size }],
      };
    });
    Store.set('pages', updated);
    _saveLayout();
    _renderAllPages();
  }
  /* [LAYOUT-EDIT END] */

  return {
    init,
    addPage,
    addAppToCurrentPage,
    addWidgetToCurrentPage,
  };

})();
/* [PHONE-SHELL-CORE END] */

/* ============================================================
   phone-shell.js END
   ============================================================ */

    
