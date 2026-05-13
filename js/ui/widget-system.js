/* ========== [BLOCK: MiniPhone WidgetSystem 模块] ========== */
/**
 * MiniPhone.WidgetSystem
 * 主屏幕小组件管理：注册、渲染、更新
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.WidgetSystem = (function() {
  'use strict';

  var registeredWidgets = {};// { type: { render, update, defaultConfig } }
  var activeWidgets = [];// 当前激活的小组件实例
  var widgetArea = null;
  var updateTimers = {};

  /* ========== [BLOCK: 初始化] ========== */
  function init() {
    widgetArea = document.getElementById('widget-area');
    registerBuiltinWidgets();
    loadWidgets();
  }
  /* ========== [/BLOCK: 初始化] ========== */

  /* ========== [BLOCK: 注册小组件类型] ========== */
  /**
   * @param {string} type - 小组件类型标识
   * @param {Object} widget - { render(container, config), update(container, config), defaultConfig, size }
   */
  function registerWidget(type, widget) {
    registeredWidgets[type] = widget;
  }
  /* ========== [/BLOCK: 注册小组件类型] ========== */

  /* ========== [BLOCK: 内置小组件注册] ========== */
  function registerBuiltinWidgets() {

    /* ========== [BLOCK: 时钟小组件] ========== */
    registerWidget('clock', {
      size: 'medium',
      defaultConfig: { showSeconds: false },
      render: function(container, config) {
        container.classList.add('widget-clock');
        container.innerHTML =
          '<div class="widget__header">' +
            '<span class="widget__icon">🕐</span>' +
            '<span class="widget__title">时钟</span>' +
          '</div>' +
          '<div class="clock__time" id="widget-clock-time"></div>' +
          '<div class="clock__date" id="widget-clock-date"></div>';
        this.update(container, config);
      },
      update: function(container) {
        var now = new Date();
        var timeEl = container.querySelector('#widget-clock-time');
        var dateEl = container.querySelector('#widget-clock-date');
        if (timeEl) {
          var h = String(now.getHours()).padStart(2, '0');
          var m = String(now.getMinutes()).padStart(2, '0');
          timeEl.textContent = h + ':' + m;
        }
        if (dateEl) {
          var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
          dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 周' + weekdays[now.getDay()];
        }
      }
    });
    /* ========== [/BLOCK: 时钟小组件] ========== */

    /* ========== [BLOCK: 天气小组件（装饰性）] ========== */
    registerWidget('weather', {
      size: 'small',
      defaultConfig: { city: '未设置' },
      render: function(container, config) {
        container.classList.add('widget-weather');
        container.innerHTML =
          '<div class="widget__header">' +
            '<span class="widget__icon">🌤️</span>' +
            '<span class="widget__title">天气</span>' +
          '</div>' +
          '<div class="weather__temp">--°</div>' +
          '<div class="weather__desc">' + (config.city || '点击设置城市') + '</div>' +
          '<div class="weather__icon">🌤️</div>';
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 天气小组件（装饰性）] ========== */

    /* ========== [BLOCK: 快捷备忘小组件] ========== */
    registerWidget('memo', {
      size: 'small',
      defaultConfig: { text: '点击编辑备忘录...' },
      render: function(container, config) {
        container.classList.add('widget-memo');
        container.innerHTML =
          '<div class="widget__header">' +
            '<span class="widget__icon">📝</span>' +
            '<span class="widget__title">备忘录</span>' +
          '</div>' +
          '<div class="memo__text">' + (config.text || '点击编辑备忘录...') + '</div>';

        container.addEventListener('click', function() {
          MiniPhone.Modal.prompt('编辑备忘录', '', {
            placeholder: '写点什么...',
            defaultValue: config.text || ''
          }).then(function(val) {
            if (val !== null) {
              config.text = val;
              container.querySelector('.memo__text').textContent = val || '点击编辑备忘录...';
              saveWidgets();
            }
          });
        });
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 快捷备忘小组件] ========== */

  }
  /* ========== [/BLOCK: 内置小组件注册] ========== */

  /* ========== [BLOCK: 加载并渲染小组件] ========== */
  function loadWidgets() {
    var saved = MiniPhone.Store.get('widgets');
    if (!saved || saved.length === 0) {
      // 默认小组件
      saved = [
        { type: 'clock', config: {} },
        { type: 'memo', config: { text: '欢迎使用 MiniPhone 🎉' } }
      ];
    }
    activeWidgets = saved;
    renderAll();
    startUpdateLoop();
  }

  function renderAll() {
    if (!widgetArea) return;
    widgetArea.innerHTML = '';

    var grid = document.createElement('div');
    grid.className = 'widget-grid';

    activeWidgets.forEach(function(wData, index) {
      var wDef = registeredWidgets[wData.type];
      if (!wDef) return;

      var container = document.createElement('div');
      container.className = 'widget widget--' + (wDef.size || 'small');
      container.setAttribute('data-widget-index', index);
      container.setAttribute('data-widget-type', wData.type);

      var config = Object.assign({}, wDef.defaultConfig || {}, wData.config || {});
      wDef.render.call(wDef, container, config);

      grid.appendChild(container);
    });

    widgetArea.appendChild(grid);
  }
  /* ========== [/BLOCK: 加载并渲染小组件] ========== */

  /* ========== [BLOCK: 定时更新] ========== */
  function startUpdateLoop() {
    // 每秒更新时钟类小组件
    if (updateTimers.clock) clearInterval(updateTimers.clock);
    updateTimers.clock = setInterval(function() {
      activeWidgets.forEach(function(wData, index) {
        var wDef = registeredWidgets[wData.type];
        if (!wDef || !wDef.update) return;
        var container = widgetArea.querySelector('[data-widget-index="' + index + '"]');
        if (container) {
          var config = Object.assign({}, wDef.defaultConfig || {}, wData.config || {});
          wDef.update.call(wDef, container, config);
        }
      });
    }, 1000);
  }

  function stopUpdateLoop() {
    Object.keys(updateTimers).forEach(function(key) {
      clearInterval(updateTimers[key]);
    });
    updateTimers = {};
  }
  /* ========== [/BLOCK: 定时更新] ========== */

  /* ========== [BLOCK: 保存小组件配置] ========== */
  function saveWidgets() {
    MiniPhone.Store.set('widgets', activeWidgets);
    MiniPhone.Store.save();
  }
  /* ========== [/BLOCK: 保存小组件配置] ========== */

  /* ========== [BLOCK: 添加/移除小组件] ========== */
  function addWidget(type, config) {
    if (!registeredWidgets[type]) {
      MiniPhone.Toast.error('未知的小组件类型');
      return;
    }
    activeWidgets.push({ type: type, config: config || {} });
    saveWidgets();
    renderAll();
  }

  function removeWidget(index) {
    activeWidgets.splice(index, 1);
    saveWidgets();
    renderAll();
  }

  function getRegisteredTypes() {
    return Object.keys(registeredWidgets);
  }
  /* ========== [/BLOCK: 添加/移除小组件] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    registerWidget: registerWidget,
    addWidget: addWidget,
    removeWidget: removeWidget,
    getRegisteredTypes: getRegisteredTypes,
    refresh: renderAll,
    destroy: stopUpdateLoop
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone WidgetSystem 模块] ========== */
