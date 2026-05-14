/* ============================================================
   widget-registry.js — 小组件注册中心
   负责注册、挂载、卸载所有小组件
   ============================================================ */

/* [WIDGET-REGISTRY-CORE START] WidgetRegistry 核心 */
const WidgetRegistry = (() => {

  // 已注册小组件 Map：id => { id, name, size, mount, unmount }
  const _registry = new Map();

  // 已挂载实例 Map：domElement => { id, cleanup }
  const _mounted = new WeakMap();

  /**
   * 注册一个小组件
   * @param {Object}   def
   * @param {string}   def.id        - 唯一 id，如 'clock'
   * @param {string}   def.name      - 显示名称
   * @param {string}   def.emoji     - 图标 emoji
   * @param {string[]} def.sizes     - 支持的尺寸列表，如 ['2x2','4x2']
   * @param {string}   def.defaultSize
   * @param {Function} def.mount     - (container: HTMLElement, config: Object) => cleanup fn | void
   * @param {string}   [def.desc]    - 简短描述
   */
  function register(def) {
    if (!def.id || !def.mount) {
      console.warn('[WidgetRegistry] register: id and mount are required');
      return;
    }
    _registry.set(def.id, def);
  }

  /**
   * 挂载小组件到容器
   * @param {string}      widgetId
   * @param {HTMLElement} container
   * @param {Object}      [config]   - 小组件用户配置
   */
  function mount(widgetId, container, config = {}) {
    const def = _registry.get(widgetId);
    if (!def) {
      container.innerHTML = `
        <div class="glass-dark widget-inner" style="border-radius:20px;align-items:center;justify-content:center;">
          <span style="font-size:24px">❓</span>
          <span class="widget-label" style="margin-top:6px">${widgetId}</span>
        </div>`;
      return;
    }

    try {
      const cleanup = def.mount(container, config);
      _mounted.set(container, { id: widgetId, cleanup });
    } catch (e) {
      console.error(`[WidgetRegistry] mount error for ${widgetId}:`, e);
      container.innerHTML = `
        <div class="glass-dark widget-inner" style="border-radius:20px;align-items:center;justify-content:center;">
          <span style="font-size:24px">⚠️</span>
          <span class="widget-label" style="margin-top:6px">加载失败</span>
        </div>`;
    }
  }

  /**
   * 卸载小组件（调用 cleanup，清空 DOM）
   * @param {HTMLElement} container
   */
  function unmount(container) {
    const instance = _mounted.get(container);
    if (!instance) return;
    try { instance.cleanup?.(); } catch (e) { console.error(e); }
    container.innerHTML = '';
    _mounted.delete(container);
  }

  /**
   * 获取所有已注册小组件列表（用于设置面板展示）
   */
  function getAll() {
    return Array.from(_registry.values());
  }

  /**
   * 获取单个小组件定义
   * @param {string} widgetId
   */
  function get(widgetId) {
    return _registry.get(widgetId) ?? null;
  }

  return { register, mount, unmount, getAll, get };

})();
/* [WIDGET-REGISTRY-CORE END] */

/* ============================================================
   widget-registry.js END
   ============================================================ */
