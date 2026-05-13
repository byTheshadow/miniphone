/* ========== [BLOCK: MiniPhone App 主入口] ========== */
/**
 * MiniPhone.App
 * 应用初始化、启动流程、全局事件绑定
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.App = (function() {
  'use strict';

  /* ========== [BLOCK: 启动流程] ========== */
  function boot() {
    console.log('%c🤙 MiniPhone', 'font-size:20px;font-weight:bold;color:#007AFF;','v1.0.0');

    // 1. 加载持久化状态
    MiniPhone.Store.load();

    // 2. 初始化存储
    MiniPhone.Storage.init().then(function() {
      console.log('[App] IndexedDB 就绪');
    }).catch(function(err) {
      console.warn('[App] IndexedDB 初始化失败，将使用 localStorage:', err);
    });

    // 3. 加载 AI 配置
    MiniPhone.AI.loadConfig();
    MiniPhone.Store.set('apiConfigured', MiniPhone.KeyManager.isConfigured());

    // 4. 应用主题
    applyTheme(MiniPhone.Store.get('theme') || 'dark');

    // 5. 应用壁纸
    applyWallpaper(MiniPhone.Store.get('wallpaper'));

    // 6. 初始化 UI 模块
    MiniPhone.AppIcon.init();
    MiniPhone.Router.init();
    MiniPhone.HomeScreen.init();
    MiniPhone.WidgetSystem.init();

    // 7. 注册内置App
    registerBuiltinApps();

    // 8. 启动状态栏时钟
    startStatusClock();

    // 9.绑定全局事件
    bindGlobalEvents();

    console.log('[App] 启动完成 ✅');
  }
  /* ========== [/BLOCK: 启动流程] ========== */

  /* ========== [BLOCK: 主题管理] ========== */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    MiniPhone.Store.set('theme', theme);

    // 更新 meta theme-color
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'dark' ? '#000000' : '#F2F2F7';
    }
  }

  function toggleTheme() {
    var current = MiniPhone.Store.get('theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    MiniPhone.Store.save();
    MiniPhone.Toast.success('已切换到' + (next === 'dark' ? '深色' : '浅色') + '模式');
  }
  /* ========== [/BLOCK: 主题管理] ========== */

  /* ========== [BLOCK: 壁纸管理] ========== */
  function applyWallpaper(url) {
    var app = document.getElementById('app');
    if (!app) return;
    if (url) {
      app.style.backgroundImage = 'url(' + url + ')';
      app.style.backgroundSize = 'cover';
      app.style.backgroundPosition = 'center';
    } else {
      app.style.backgroundImage = '';
      app.style.background = '';
    }
  }
  /* ========== [/BLOCK: 壁纸管理] ========== */

  /* ========== [BLOCK: 状态栏时钟] ========== */
  function startStatusClock() {
    var timeEl = document.getElementById('status-time');
    if (!timeEl) return;

    function updateTime() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, '0');
      var m = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = h + ':' + m;
    }

    updateTime();
    setInterval(updateTime, 1000);
  }
  /* ========== [/BLOCK: 状态栏时钟] ========== */

  /* ========== [BLOCK: 注册内置 App] ========== */
  function registerBuiltinApps() {

    /* ========== [BLOCK: 设置 App] ========== */
    MiniPhone.Router.register('settings', {
      title: '设置',
      mount: function(container) {
        container.innerHTML = buildSettingsPage();
        bindSettingsEvents(container);
      },
      unmount: function() {}
    });
    /* ========== [/BLOCK: 设置 App] ========== */

    // 其他 App 占位（后续逐个实现）
    var placeholderApps = ['chat', 'calendar', 'rp', 'music', 'ticket', 'pet', 'ledger'];
    placeholderApps.forEach(function(appId) {
      MiniPhone.Router.register(appId, {
        title: appId,
        mount: function(container) {
          var appConfig = MiniPhone.HomeScreen.getAppConfig(appId);
          container.innerHTML =
            '<div style="display:flex;flex-direction:column;height:100%;">' +
              /*========== [BLOCK: App 内导航栏] ========== */
              '<div style="display:flex;align-items:center;padding:12px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border-secondary);">' +
                '<button onclick="MiniPhone.Router.goHome()" style="font-size:24px;padding:4px 8px;color:var(--color-primary);">←</button>' +
                '<span style="flex:1;text-align:center;font-size:17px;font-weight:600;color:var(--text-primary);">' +(appConfig ? appConfig.name : appId) +
                '</span>' +
                '<span style="width:40px;"></span>' +
              '</div>' +
              /* ========== [/BLOCK: App 内导航栏] ========== */
              '<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:var(--text-secondary);">' +
                '<span style="font-size:64px;">' + (appConfig ? appConfig.emoji : '📱') + '</span>' +
                '<span style="font-size:18px;font-weight:500;">即将推出</span>' +'<span style="font-size:14px;opacity:0.6;">此功能正在开发中</span>' +
              '</div>' +
            '</div>';
        },
        unmount: function() {}
      });
    });
  }
  /* ========== [/BLOCK: 注册内置 App] ========== */

  /* ========== [BLOCK: 设置页面构建] ========== */
  function buildSettingsPage() {
    var apiConfigured = MiniPhone.KeyManager.isConfigured();
    var currentKey = MiniPhone.KeyManager.getKey();
    var currentEndpoint = MiniPhone.KeyManager.getEndpoint();
    var aiConfig = MiniPhone.AI.getConfig();
    var currentTheme = MiniPhone.Store.get('theme') || 'dark';

    return (
      '<div style="display:flex;flex-direction:column;height:100%;">' +

        /* 导航栏 */
        '<div style="display:flex;align-items:center;padding:12px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border-secondary);">' +
          '<button id="settings-back" style="font-size:24px;padding:4px 8px;color:var(--color-primary);">←</button>' +
          '<span style="flex:1;text-align:center;font-size:17px;font-weight:600;color:var(--text-primary);">设置</span>' +
          '<span style="width:40px;"></span>' +
        '</div>' +

        '<div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:20px;">' +

          /* ========== [BLOCK: AI 配置区] ========== */
          '<div class="settings-section">' +
            '<div class="settings-section__title">🤖 AI 配置</div>' +
            '<div class="settings-card">' +
              '<div class="settings-item">' +
                '<label>API Endpoint</label>' +
                '<input id="set-endpoint" type="url" placeholder="https://api.openai.com" value="' + (currentEndpoint || '') + '">' +
              '</div>' +
              '<div class="settings-item">' +
                '<label>API Key</label>' +
                '<input id="set-apikey" type="password" placeholder="sk-..." value="' + (currentKey || '') + '">' +
              '</div>' +
              '<div class="settings-item">' +
                '<label>模型</label>' +
                '<input id="set-model" type="text" placeholder="gpt-4o-mini" value="' + (aiConfig.model || '') + '">' +
              '</div>' +
              '<div class="settings-item">' +
                '<label>温度 (0-2)</label>' +
                '<input id="set-temp" type="number" min="0" max="2" step="0.1" value="' + (aiConfig.temperature || 0.7) + '">' +
              '</div>' +
              '<div class="settings-item">' +
                '<label>最大 Tokens</label>' +
                '<input id="set-maxtokens" type="number" min="100" max="128000" step="100" value="' + (aiConfig.maxTokens || 2048) + '">' +
              '</div>' +
              '<button id="set-save-api" class="settings-btn settings-btn--primary">💾 保存 API 配置</button>' +
              '<div id="set-api-status" style="font-size:13px;text-align:center;margin-top:8px;color:' +
                (apiConfigured ? 'var(--color-success)' : 'var(--color-warning)') + ';">' +
                (apiConfigured ? '✅ API 已配置 (' + MiniPhone.KeyManager.maskKey(currentKey) + ')' : '⚠️ 尚未配置 API') +
              '</div>' +
            '</div>' +
          '</div>' +
          /* ========== [/BLOCK: AI 配置区] ========== */

          /* ========== [BLOCK: 外观设置区] ========== */
          '<div class="settings-section">' +
            '<div class="settings-section__title">🎨 外观</div>' +
            '<div class="settings-card">' +
              '<div class="settings-item settings-item--row">' +
                '<span>主题模式</span>' +
                '<button id="set-toggle-theme" class="settings-btn settings-btn--small">' +
                  (currentTheme === 'dark' ? '🌙 深色' : '☀️ 浅色') +
                '</button>' +
              '</div>' +
              '<div class="settings-item">' +
                '<label>自定义壁纸 URL</label>' +
                '<input id="set-wallpaper" type="url" placeholder="https://example.com/bg.jpg" value="' + (MiniPhone.Store.get('wallpaper') || '') + '">' +
              '</div>' +
              '<button id="set-save-wallpaper" class="settings-btn settings-btn--primary">🖼️ 应用壁纸</button>' +
            '</div>' +
          '</div>' +
          /* ========== [/BLOCK: 外观设置区] ========== */

          /* ========== [BLOCK: 数据管理区] ========== */
          '<div class="settings-section">' +
            '<div class="settings-section__title">💾 数据管理</div>' +
            '<div class="settings-card">' +
              '<button id="set-clear-data" class="settings-btn settings-btn--danger">🗑️ 清除所有数据</button>' +'</div>' +
          '</div>' +
          /* ========== [/BLOCK: 数据管理区] ========== */

          /* ========== [BLOCK: 关于区] ========== */
          '<div class="settings-section">' +
            '<div class="settings-section__title">ℹ️ 关于</div>' +
            '<div class="settings-card" style="text-align:center;color:var(--text-secondary);font-size:13px;">' +
              '<div style="font-size:40px;margin-bottom:8px;">🤙</div>' +
              '<div style="font-weight:600;font-size:16px;color:var(--text-primary);">MiniPhone</div>' +
              '<div style="margin-top:4px;">v1.0.0</div>' +
              '<div style="margin-top:4px;">你的AI 口袋手机</div>' +
              '<a href="https://github.com/your-username/miniphone" target="_blank" ' +
                'style="display:inline-block;margin-top:8px;color:var(--color-primary);">GitHub →</a>' +
            '</div>' +
          '</div>' +
          /* ========== [/BLOCK: 关于区] ========== */

        '</div>' +
      '</div>'
    );
  }
  /* ========== [/BLOCK: 设置页面构建] ========== */

  /* ========== [BLOCK: 设置页面事件绑定] ========== */
  function bindSettingsEvents(container) {

    // 返回按钮
    var backBtn = container.querySelector('#settings-back');
    if (backBtn) backBtn.addEventListener('click', function() { MiniPhone.Router.goHome(); });

    // 保存API 配置
    var saveApiBtn = container.querySelector('#set-save-api');
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', function() {
        var endpoint = container.querySelector('#set-endpoint').value.trim();
        var apiKey = container.querySelector('#set-apikey').value.trim();
        var model = container.querySelector('#set-model').value.trim();
        var temp = parseFloat(container.querySelector('#set-temp').value) || 0.7;
        var maxTokens = parseInt(container.querySelector('#set-maxtokens').value) || 2048;

        if (!endpoint || !apiKey) {
          MiniPhone.Toast.warning('请填写 Endpoint 和 API Key');
          return;
        }

        MiniPhone.KeyManager.saveKey(apiKey);
        MiniPhone.KeyManager.saveEndpoint(endpoint);
        MiniPhone.AI.setConfig({
          endpoint: endpoint,
          apiKey: apiKey,
          model: model || 'gpt-4o-mini',
          temperature: temp,
          maxTokens: maxTokens
        });

        MiniPhone.Store.set('apiConfigured', true);

        var statusEl = container.querySelector('#set-api-status');
        if (statusEl) {
          statusEl.style.color = 'var(--color-success)';
          statusEl.textContent = '✅ API 已配置 (' + MiniPhone.KeyManager.maskKey(apiKey) + ')';
        }

        MiniPhone.Toast.success('API 配置已保存');
      });
    }

    // 切换主题
    var themeBtn = container.querySelector('#set-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        toggleTheme();
        var current = MiniPhone.Store.get('theme');
        themeBtn.textContent = current === 'dark' ? '🌙 深色' : '☀️ 浅色';
      });
    }

    // 应用壁纸
    var wallpaperBtn = container.querySelector('#set-save-wallpaper');
    if (wallpaperBtn) {
      wallpaperBtn.addEventListener('click', function() {
        var url = container.querySelector('#set-wallpaper').value.trim();
        MiniPhone.Store.set('wallpaper', url || null);
        MiniPhone.Store.save();
        applyWallpaper(url || null);
        MiniPhone.Toast.success(url ? '壁纸已更新' : '已恢复默认壁纸');
      });
    }

    // 清除数据
    var clearBtn = container.querySelector('#set-clear-data');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        MiniPhone.Modal.confirm('清除所有数据', '此操作不可撤销，确定要清除所有本地数据吗？', {
          danger: true,
          okText: '清除'
        }).then(function(confirmed) {
          if (confirmed) {
            localStorage.clear();
            MiniPhone.Toast.success('数据已清除，即将刷新页面');
            setTimeout(function() { location.reload(); }, 1500);
          }
        });
      });
    }
  }
  /* ========== [/BLOCK: 设置页面事件绑定] ========== */

  /* ========== [BLOCK: 设置页面样式注入] ========== */
  function injectSettingsStyles() {
    if (document.getElementById('settings-styles')) return;
    var style = document.createElement('style');
    style.id = 'settings-styles';
    style.textContent = [
      '.settings-section { }',
      '.settings-section__title {',
      '  font-size: 13px; font-weight: 600; color: var(--text-secondary);',
      '  text-transform: uppercase; letter-spacing: 0.5px;',
      '  padding: 0 4px 8px; ','}',
      '.settings-card {',
      '  background: var(--bg-secondary); border-radius: var(--radius-md);',
      '  padding: 16px; display: flex; flex-direction: column; gap: 14px;',
      '  border: 1px solid var(--border-secondary);',
      '}',
      '.settings-item { display: flex; flex-direction: column; gap: 4px; }',
      '.settings-item label {',
      '  font-size: 13px; color: var(--text-secondary); font-weight: 500;','}',
      '.settings-item input {',
      '  padding: 10px 12px; background: var(--bg-tertiary);',
      '  border-radius: var(--radius-sm); border: 1px solid var(--border-primary);',
      '  color: var(--text-primary); font-size: 15px;',
      '}',
      '.settings-item input:focus { border-color: var(--color-primary); }',
      '.settings-item--row {',
      '  flex-direction: row; align-items: center; justify-content: space-between;',
      '  color: var(--text-primary); font-size: 15px;',
      '}',
      '.settings-btn {',
      '  padding: 12px; border-radius: var(--radius-sm); font-size: 15px;',
      '  font-weight: 600; text-align: center; cursor: pointer;',
      '  transition: opacity 0.15s;',
      '}',
      '.settings-btn:active { opacity: 0.7; }',
      '.settings-btn--primary {',
      '  background: var(--color-primary); color: #fff;',
      '}',
      '.settings-btn--small {',
      '  padding: 6px 14px; font-size: 14px; border-radius: var(--radius-full);',
      '  background: var(--bg-tertiary); color: var(--text-primary);',
      '}',
      '.settings-btn--danger {',
      '  background: transparent; color: var(--color-danger);',
      '  border: 1px solid var(--color-danger);',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }
  /* ========== [/BLOCK: 设置页面样式注入] ========== */

  /* ========== [BLOCK: 全局事件绑定] ========== */
  function bindGlobalEvents() {
    // 主题变更监听
    MiniPhone.Store.on('theme', function(theme) {
      applyTheme(theme);
    });

    // 壁纸变更监听
    MiniPhone.Store.on('wallpaper', function(url) {
      applyWallpaper(url);
    });
  }
  /* ========== [/BLOCK: 全局事件绑定] ========== */

  /* ========== [BLOCK: 公开API] ========== */
  return {
    boot: boot,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    applyWallpaper: applyWallpaper
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone App主入口] ========== */

/* ========== [BLOCK: DOM Ready自动启动] ========== */
document.addEventListener('DOMContentLoaded', function() {
  // 注入设置页面样式
  (function() {
    if (document.getElementById('settings-styles')) return;
    var style = document.createElement('style');
    style.id = 'settings-styles';
    style.textContent = [
      '.settings-section { }',
      '.settings-section__title {',
      '  font-size: 13px; font-weight: 600; color: var(--text-secondary);',
      '  text-transform: uppercase; letter-spacing: 0.5px;',
      '  padding: 0 4px 8px;',
      '}',
      '.settings-card {',
      '  background: var(--bg-secondary); border-radius: var(--radius-md, 14px);',
      '  padding: 16px; display: flex; flex-direction: column; gap: 14px;',
      '  border: 1px solid var(--border-secondary, rgba(255,255,255,0.08));',
      '}',
      '.settings-item { display: flex; flex-direction: column; gap: 4px; }',
      '.settings-item label {',
      '  font-size: 13px; color: var(--text-secondary); font-weight: 500;',
      '}',
      '.settings-item input {',
      '  padding: 10px 12px; background: var(--bg-tertiary);',
      '  border-radius: var(--radius-sm, 10px); border: 1px solid var(--border-primary);',
      '  color: var(--text-primary); font-size: 15px; width: 100%;',
      '}',
      '.settings-item input:focus { border-color: var(--color-primary); }',
      '.settings-item--row {',
      '  flex-direction: row; align-items: center; justify-content: space-between;',
      '  color: var(--text-primary); font-size: 15px;',
      '}',
      '.settings-btn {',
      '  padding: 12px; border-radius: var(--radius-sm, 10px); font-size: 15px;',
      '  font-weight: 600; text-align: center; cursor: pointer;',
      '  transition: opacity 0.15s;',
      '}',
      '.settings-btn:active { opacity: 0.7; }',
      '.settings-btn--primary { background: var(--color-primary); color: #fff; }',
      '.settings-btn--small {',
      '  padding: 6px 14px; font-size: 14px; border-radius: 9999px;',
      '  background: var(--bg-tertiary); color: var(--text-primary);',
      '}',
      '.settings-btn--danger {',
      '  background: transparent; color: var(--color-danger);',
      '  border: 1px solid var(--color-danger);',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  MiniPhone.App.boot();
});
/* ========== [/BLOCK: DOM Ready 自动启动] ========== */
