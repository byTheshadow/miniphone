/* ========== [BLOCK: MiniPhone WidgetSystem 模块] ========== */
var MiniPhone = window.MiniPhone || {};

MiniPhone.WidgetSystem = (function() {
  'use strict';

  var registeredWidgets = {};
  var activeWidgets = [];
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
  function registerWidget(type, widget) {
    registeredWidgets[type] = widget;
  }
  /* ========== [/BLOCK: 注册小组件类型] ========== */

  /* ========== [BLOCK: 内置小组件注册] ========== */
  function registerBuiltinWidgets() {

    /* ========== [BLOCK: 时钟小组件] ========== */
    registerWidget('clock', {
      size: 'medium',
      label: '时钟',
      emoji: '🕐',
      defaultConfig: {},
      render: function(container, config) {
        container.classList.add('widget-clock');
        container.innerHTML =
          '<div class="widget__header">' +
            '<span class="widget__icon">🕐</span>' +
            '<span class="widget__title">时钟</span>' +
          '</div>' +
          '<div class="clock__time" id="wc-time-' + container.dataset.widgetIndex + '"></div>' +
          '<div class="clock__date" id="wc-date-' + container.dataset.widgetIndex + '"></div>';
        this.update(container, config);
      },
      update: function(container) {
        var idx = container.dataset.widgetIndex;
        var timeEl = container.querySelector('#wc-time-' + idx);
        var dateEl = container.querySelector('#wc-date-' + idx);
        var now = new Date();
        if (timeEl) {
          timeEl.textContent =
            String(now.getHours()).padStart(2,'0') + ':' +
            String(now.getMinutes()).padStart(2,'0');
        }
        if (dateEl) {
          var days = ['日','一','二','三','四','五','六'];
          dateEl.textContent =
            (now.getMonth()+1) + '月' + now.getDate() + '日 ' +
            '周' + days[now.getDay()];
        }
      }
    });
    /* ========== [/BLOCK: 时钟小组件] ========== */

    /* ========== [BLOCK: 备忘录小组件] ========== */
    registerWidget('memo', {
      size: 'small',
      label: '备忘录',
      emoji: '📝',
      defaultConfig: { text: '点击编辑备忘录...' },
      render: function(container, config) {
        container.classList.add('widget-memo');
        container.innerHTML =
          '<div class="widget__header">' +
            '<span class="widget__icon">📝</span>' +
            '<span class="widget__title">备忘录</span>' +
          '</div>' +
          '<div class="memo__text">' + escHtml(config.text || '点击编辑...') + '</div>';

        container.addEventListener('click', function() {
          MiniPhone.Modal.prompt('编辑备忘录', '', {
            placeholder: '写点什么...',
            defaultValue: config.text || ''
          }).then(function(val) {
            if (val === null) return;
            config.text = val;
            container.querySelector('.memo__text').textContent = val || '点击编辑...';
            saveWidgets();
          });
        });
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 备忘录小组件] ========== */

    /* ========== [BLOCK: 倒数日小组件] ========== */
    registerWidget('countdown', {
      size: 'small',
      label: '倒数日',
      emoji: '📅',
      defaultConfig: { event: '我的纪念日', date: '' },
      render: function(container, config) {
        container.classList.add('widget-countdown');

        function renderContent() {
          var days = '--';
          var label = '还有';
          var past = '';

          if (config.date) {
            var target = new Date(config.date);
            target.setHours(0, 0, 0, 0);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var diff = Math.round((target - today) / 86400000);

            if (diff > 0) {
              days = diff;
              label = '还有';
            } else if (diff === 0) {
              days = '今天';
              label = '就是';
            } else {
              days = Math.abs(diff);
              label = '已过';
              past = '天';
            }
          }

          container.innerHTML =
            '<div class="widget__header">' +
              '<span class="widget__icon">📅</span>' +
              '<span class="widget__title">倒数日</span>' +
            '</div>' +
            '<div class="countdown__days">' + days + '</div>' +
            '<div class="countdown__label">' + label + (typeof days === 'number' ? ' 天' : '') + '</div>' +
            '<div class="countdown__event">' + escHtml(config.event || '点击设置') + '</div>';

          // 重新绑定点击
          container.onclick = function() { openEditor(); };
        }

        function openEditor() {
          var html =
            '<div style="display:flex;flex-direction:column;gap:14px;">' +
              '<div style="font-size:17px;font-weight:600;color:var(--text-primary);text-align:center;">编辑倒数日</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">事件名称</label>' +
                '<input id="cd-event" type="text" value="' + escHtml(config.event || '') + '" ' +
                  'placeholder="生日、纪念日..." ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">目标日期</label>' +
                '<input id="cd-date" type="date" value="' + (config.date || '') + '" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<button id="cd-save" style="padding:12px;background:var(--color-primary);color:#fff;' +
                'border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">保存</button>' +
            '</div>';

          MiniPhone.Modal.custom(html, { maxWidth: '300px' }).then(function(modal) {
            if (!modal) return;
            modal.el.querySelector('#cd-save').addEventListener('click', function() {
              config.event = modal.el.querySelector('#cd-event').value.trim() || '我的纪念日';
              config.date = modal.el.querySelector('#cd-date').value;
              modal.close();
              renderContent();
              saveWidgets();
            });
          });
        }

        renderContent();
      },
      update: function(container, config) {
        // 每天更新一次即可，这里触发重渲染
        var days = container.querySelector('.countdown__days');
        if (!days || !config.date) return;
        var target = new Date(config.date);
        target.setHours(0,0,0,0);
        var today = new Date();
        today.setHours(0,0,0,0);
        var diff = Math.round((target - today) / 86400000);
        if (diff > 0) days.textContent = diff;
        else if (diff === 0) days.textContent = '今天';
        else days.textContent = Math.abs(diff);
      }
    });
    /* ========== [/BLOCK: 倒数日小组件] ========== */

    /* ========== [BLOCK: 个人签名小组件] ========== */
    registerWidget('profile', {
      size: 'medium',
      label: '个人签名',
      emoji: '👤',
      defaultConfig: { name: '你的名字', bio: '点击编辑个性签名 ✨', avatar: '' },
      render: function(container, config) {
        container.classList.add('widget-profile');
        container.style.padding = '14px 16px';

        function renderContent() {
          var avatarInner = config.avatar
            ? '<img src="' + escHtml(config.avatar) + '" alt="avatar" onerror="this.style.display=\'none\'">'
            : '<span style="font-size:28px;">🙂</span>';

          container.innerHTML =
            '<div class="profile__avatar">' + avatarInner + '</div>' +
            '<div class="profile__info">' +
              '<div class="profile__name">' + escHtml(config.name || '你的名字') + '</div>' +
              '<div class="profile__bio">' + escHtml(config.bio || '点击编辑签名') + '</div>' +
            '</div>';

          container.onclick = function() { openEditor(); };
        }

        function openEditor() {
          var html =
            '<div style="display:flex;flex-direction:column;gap:14px;">' +
              '<div style="font-size:17px;font-weight:600;color:var(--text-primary);text-align:center;">编辑个人签名</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">头像 URL</label>' +
                '<input id="pf-avatar" type="url" value="' + escHtml(config.avatar || '') + '" ' +
                  'placeholder="https://example.com/avatar.jpg" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:14px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">名字</label>' +
                '<input id="pf-name" type="text" value="' + escHtml(config.name || '') + '" ' +
                  'placeholder="你的名字" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">个性签名</label>' +
                '<textarea id="pf-bio" rows="3" placeholder="写点什么..." ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:14px;' +
                  'resize:none;line-height:1.5;">' + escHtml(config.bio || '') + '</textarea>' +
              '</div>' +
              '<button id="pf-save" style="padding:12px;background:var(--color-primary);color:#fff;' +
                'border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">保存</button>' +
            '</div>';

          MiniPhone.Modal.custom(html, { maxWidth: '300px' }).then(function(modal) {
            if (!modal) return;
            modal.el.querySelector('#pf-save').addEventListener('click', function() {
              config.avatar = modal.el.querySelector('#pf-avatar').value.trim();
              config.name   = modal.el.querySelector('#pf-name').value.trim() || '你的名字';
              config.bio    = modal.el.querySelector('#pf-bio').value.trim();
              modal.close();
              renderContent();
              saveWidgets();
            });
          });
        }

        renderContent();
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 个人签名小组件] ========== */

    /* ========== [BLOCK: 一起听小组件] ========== */
    registerWidget('listening', {
      size: 'medium',
      label: '一起听',
      emoji: '🎵',
      defaultConfig: {
        title: '未在播放',
        artist: '点击设置歌曲',
        cover: '',
        progress: 0
      },
      render: function(container, config) {
        container.classList.add('widget-listening');

        function renderContent() {
          var coverInner = config.cover
            ? '<img src="' + escHtml(config.cover) + '" alt="cover" onerror="this.style.display=\'none\'">'
            : '🎵';

          container.innerHTML =
            '<div class="widget__header">' +
              '<span class="widget__icon">🎧</span>' +
              '<span class="widget__title">一起听</span>' +
              '<span class="listening__tag" style="margin-left:auto;">♪ 在听</span>' +
            '</div>' +
            '<div class="listening__body">' +
              '<div class="listening__cover">' + coverInner + '</div>' +
              '<div class="listening__info">' +
                '<div class="listening__title">' + escHtml(config.title || '未在播放') + '</div>' +
                '<div class="listening__artist">' + escHtml(config.artist || '') + '</div>' +
              '</div>' +
            '</div>' +
                        '<div class="listening__progress">' +
              '<div class="listening__progress-bar" style="width:' + (config.progress || 0) + '%"></div>' +
            '</div>';

          container.onclick = function() { openEditor(); };
        }

        function openEditor() {
          var html =
            '<div style="display:flex;flex-direction:column;gap:14px;">' +
              '<div style="font-size:17px;font-weight:600;color:var(--text-primary);text-align:center;">编辑一起听</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">歌曲名</label>' +
                '<input id="ls-title" type="text" value="' + escHtml(config.title || '') + '" ' +
                  'placeholder="歌曲名称" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">艺术家</label>' +
                '<input id="ls-artist" type="text" value="' + escHtml(config.artist || '') + '" ' +
                  'placeholder="艺术家名称" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">封面图 URL</label>' +
                '<input id="ls-cover" type="url" value="' + escHtml(config.cover || '') + '" ' +
                  'placeholder="https://example.com/cover.jpg" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:14px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">播放进度 (0-100)</label>' +
                '<input id="ls-progress" type="range" min="0" max="100" value="' + (config.progress || 0) + '" ' +
                  'style="width:100%;accent-color:var(--color-primary);">' +
              '</div>' +
              '<button id="ls-save" style="padding:12px;background:var(--color-primary);color:#fff;' +
                'border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">保存</button>' +
            '</div>';

          MiniPhone.Modal.custom(html, { maxWidth: '300px' }).then(function(modal) {
            if (!modal) return;
            modal.el.querySelector('#ls-save').addEventListener('click', function() {
              config.title    = modal.el.querySelector('#ls-title').value.trim() || '未在播放';
              config.artist   = modal.el.querySelector('#ls-artist').value.trim();
              config.cover    = modal.el.querySelector('#ls-cover').value.trim();
              config.progress = parseInt(modal.el.querySelector('#ls-progress').value) || 0;
              modal.close();
              renderContent();
              saveWidgets();
            });
          });
        }

        renderContent();
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 一起听小组件] ========== */

    /* ========== [BLOCK: 相册小组件] ========== */
    registerWidget('photo', {
      size: 'medium',
      label: '相册',
      emoji: '🖼️',
      defaultConfig: { url: '', caption: '点击设置照片' },
      render: function(container, config) {
        container.classList.add('widget-photo');
        container.style.padding = '0';

        function renderContent() {
          if (config.url) {
            container.innerHTML =
              '<img class="photo__img" src="' + escHtml(config.url) + '" alt="photo" ' +
                'onerror="this.parentNode.querySelector(\'.photo__caption\').textContent=\'图片加载失败\'">' +
              '<div class="photo__caption">' + escHtml(config.caption || '') + '</div>';
          } else {
            container.innerHTML =
              '<div style="height:120px;display:flex;align-items:center;justify-content:center;' +
                'flex-direction:column;gap:8px;color:var(--text-tertiary);">' +
                '<span style="font-size:32px;">🖼️</span>' +
                '<span style="font-size:13px;">点击添加照片</span>' +
              '</div>';
          }
          container.onclick = function() { openEditor(); };
        }

        function openEditor() {
          var html =
            '<div style="display:flex;flex-direction:column;gap:14px;">' +
              '<div style="font-size:17px;font-weight:600;color:var(--text-primary);text-align:center;">编辑相册</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">图片 URL</label>' +
                '<input id="ph-url" type="url" value="' + escHtml(config.url || '') + '" ' +
                  'placeholder="https://example.com/photo.jpg" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:14px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">图片说明</label>' +
                '<input id="ph-caption" type="text" value="' + escHtml(config.caption || '') + '" ' +
                  'placeholder="写点什么..." ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<button id="ph-save" style="padding:12px;background:var(--color-primary);color:#fff;' +
                'border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">保存</button>' +
            '</div>';

          MiniPhone.Modal.custom(html, { maxWidth: '300px' }).then(function(modal) {
            if (!modal) return;
            modal.el.querySelector('#ph-save').addEventListener('click', function() {
              config.url     = modal.el.querySelector('#ph-url').value.trim();
              config.caption = modal.el.querySelector('#ph-caption').value.trim();
              modal.close();
              renderContent();
              saveWidgets();
            });
          });
        }

        renderContent();
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 相册小组件] ========== */

    /* ========== [BLOCK: 心情打卡小组件] ========== */
    registerWidget('mood', {
      size: 'small',
      label: '心情',
      emoji: '😊',
      defaultConfig: { mood: '', text: '' },
      render: function(container, config) {
        container.classList.add('widget-mood');

        var moodOptions = [
          { emoji: '😄', label: '开心' },
          { emoji: '😌', label: '平静' },
          { emoji: '😔', label: '难过' },
          { emoji: '😤', label: '烦躁' },
          { emoji: '🥰', label: '恋爱' },
          { emoji: '😴', label: '困倦' },
          { emoji: '🤩', label: '兴奋' },
          { emoji: '😰', label: '焦虑' }
        ];

        function renderContent() {
          var selected = config.mood || '';
          var selectedItem = moodOptions.find(function(m) { return m.emoji === selected; });

          container.innerHTML =
            '<div class="widget__header">' +
              '<span class="widget__icon">💭</span>' +
              '<span class="widget__title">今日心情</span>' +
            '</div>' +
            '<div class="mood__emoji">' + (selected || '🫥') + '</div>' +
            '<div class="mood__text">' + (selectedItem ? selectedItem.label : '点击记录心情') + '</div>' +
            '<div class="mood__picker">' +
              moodOptions.map(function(m) {
                return '<span class="mood__option' + (m.emoji === selected ? ' selected' : '') + '" ' +
                  'data-emoji="' + m.emoji + '" data-label="' + m.label + '" title="' + m.label + '">' +
                  m.emoji + '</span>';
              }).join('') +
            '</div>';

          // 绑定心情选择
          container.querySelectorAll('.mood__option').forEach(function(el) {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              config.mood = el.dataset.emoji;
              config.text = el.dataset.label;
              renderContent();
              saveWidgets();
              MiniPhone.Toast.success('心情已记录 ' + el.dataset.emoji);
            });
          });
        }

        renderContent();
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 心情打卡小组件] ========== */

    /* ========== [BLOCK: 步数小组件] ========== */
    registerWidget('steps', {
      size: 'small',
      label: '步数',
      emoji: '👟',
      defaultConfig: { steps: 0, goal: 10000 },
      render: function(container, config) {
        container.classList.add('widget-steps');

        function renderContent() {
          var pct = Math.min(100, Math.round((config.steps / (config.goal || 10000)) * 100));
          container.innerHTML =
            '<div class="widget__header">' +
              '<span class="widget__icon">👟</span>' +
              '<span class="widget__title">步数</span>' +
            '</div>' +
            '<div>' +
              '<span class="steps__count">' + (config.steps || 0).toLocaleString() + '</span>' +
              '<span class="steps__unit">步</span>' +
            '</div>' +
            '<div class="steps__bar">' +
              '<div class="steps__bar-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div class="steps__goal">目标 ' + (config.goal || 10000).toLocaleString() + ' 步 · ' + pct + '%</div>';

          container.onclick = function() { openEditor(); };
        }

        function openEditor() {
          var html =
            '<div style="display:flex;flex-direction:column;gap:14px;">' +
              '<div style="font-size:17px;font-weight:600;color:var(--text-primary);text-align:center;">编辑步数</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">今日步数</label>' +
                '<input id="st-steps" type="number" min="0" value="' + (config.steps || 0) + '" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<label style="font-size:13px;color:var(--text-secondary);">每日目标</label>' +
                '<input id="st-goal" type="number" min="1000" step="500" value="' + (config.goal || 10000) + '" ' +
                  'style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;' +
                  'border:1px solid var(--border-primary);color:var(--text-primary);font-size:15px;">' +
              '</div>' +
              '<button id="st-save" style="padding:12px;background:var(--color-primary);color:#fff;' +
                'border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">保存</button>' +
            '</div>';

          MiniPhone.Modal.custom(html, { maxWidth: '300px' }).then(function(modal) {
            if (!modal) return;
            modal.el.querySelector('#st-save').addEventListener('click', function() {
              config.steps = parseInt(modal.el.querySelector('#st-steps').value) || 0;
              config.goal  = parseInt(modal.el.querySelector('#st-goal').value) || 10000;
              modal.close();
              renderContent();
              saveWidgets();
            });
          });
        }

        renderContent();
      },
      update: function() {}
    });
    /* ========== [/BLOCK: 步数小组件] ========== */

  }
  /* ========== [/BLOCK: 内置小组件注册] ========== */

  /* ========== [BLOCK: 加载并渲染小组件] ========== */
  function loadWidgets() {
    var saved = MiniPhone.Store.get('widgets');
    if (!saved || saved.length === 0) {
      saved = [
        { type: 'profile',   config: { name: '你的名字', bio: '点击编辑个性签名 ✨', avatar: '' } },
        { type: 'clock',     config: {} },
        { type: 'countdown', config: { event: '我的纪念日', date: '' } },
        { type: 'mood',      config: { mood: '', text: '' } }
      ];
    }
    activeWidgets = saved;
    renderAll();
    startUpdateLoop();
  }
  /* ========== [/BLOCK: 加载并渲染小组件] ========== */

  /* ========== [BLOCK: 渲染所有小组件] ========== */
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
      container.dataset.widgetIndex = index;
      container.dataset.widgetType  = wData.type;

      var config = Object.assign({}, wDef.defaultConfig || {}, wData.config || {});
      // 把合并后的 config 写回，保证 render 内修改能持久化
      wData.config = config;

      wDef.render.call(wDef, container, config);
      grid.appendChild(container);
    });

    widgetArea.appendChild(grid);

    /* ========== [BLOCK: 添加小组件按钮] ========== */
    var addBtn = document.createElement('button');
    addBtn.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:6px;' +
      'width:100%;padding:10px;margin-top:4px;' +
      'background:var(--bg-widget);backdrop-filter:blur(20px);' +
      'border:1px dashed var(--border-primary);border-radius:var(--radius-md);' +
      'color:var(--text-secondary);font-size:13px;cursor:pointer;' +
      'transition:background 0.15s;';
    addBtn.innerHTML = '<span>＋</span><span>添加小组件</span>';
    addBtn.addEventListener('click', showWidgetPicker);
    widgetArea.appendChild(addBtn);
    /* ========== [/BLOCK: 添加小组件按钮] ========== */
  }
  /* ========== [/BLOCK: 渲染所有小组件] ========== */

  /* ========== [BLOCK: 小组件选择器] ========== */
  function showWidgetPicker() {
    var types = Object.keys(registeredWidgets);
    var items = types.map(function(type) {
      var w = registeredWidgets[type];
      return '<div data-type="' + type + '" ' +
        'style="display:flex;align-items:center;gap:12px;padding:12px;' +
        'border-radius:10px;cursor:pointer;transition:background 0.15s;" ' +
        'onmouseover="this.style.background=\'var(--bg-tertiary)\'" ' +
        'onmouseout="this.style.background=\'transparent\'">' +
        '<span style="font-size:24px;width:36px;text-align:center;">' + (w.emoji || '📦') + '</span>' +
        '<span style="font-size:15px;color:var(--text-primary);">' + (w.label || type) + '</span>' +
        '</div>';
    }).join('');

    var html =
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<div style="font-size:17px;font-weight:600;color:var(--text-primary);' +
          'text-align:center;padding-bottom:8px;border-bottom:1px solid var(--border-secondary);">' +
          '添加小组件' +
        '</div>' +
        '<div id="widget-picker-list">' + items + '</div>' +
      '</div>';

    MiniPhone.Modal.custom(html, { maxWidth: '300px', closeOnOverlay: true }).then(function(modal) {
      if (!modal) return;
      modal.content.querySelectorAll('[data-type]').forEach(function(el) {
        el.addEventListener('click', function() {
          var type = el.dataset.type;
          modal.close();
          addWidget(type, {});
          MiniPhone.Toast.success('已添加「' + (registeredWidgets[type].label || type) + '」小组件');
        });
      });
    });
  }
  /* ========== [/BLOCK: 小组件选择器] ========== */

  /* ========== [BLOCK: 定时更新] ========== */
  function startUpdateLoop() {
    if (updateTimers.main) clearInterval(updateTimers.main);
    updateTimers.main = setInterval(function() {
      if (!widgetArea) return;
      activeWidgets.forEach(function(wData, index) {
        var wDef = registeredWidgets[wData.type];
        if (!wDef || !wDef.update) return;
        var container = widgetArea.querySelector('[data-widget-index="' + index + '"]');
        if (container) {
          wDef.update.call(wDef, container, wData.config || {});
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
    MiniPhone.Store.set('widgets', activeWidgets.map(function(w) {
      return { type: w.type, config: Object.assign({}, w.config) };
    }));
    MiniPhone.Store.save();
  }
  /* ========== [/BLOCK: 保存小组件配置] ========== */

  /* ========== [BLOCK: 添加 / 移除小组件] ========== */
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
  /* ========== [/BLOCK: 添加 / 移除小组件] ========== */

  /* ========== [BLOCK: 工具函数] ========== */
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  /* ========== [/BLOCK: 工具函数] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    init: init,
    registerWidget: registerWidget,
    addWidget: addWidget,
    removeWidget: removeWidget,
    showWidgetPicker: showWidgetPicker,
    refresh: renderAll,
    destroy: stopUpdateLoop
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone WidgetSystem 模块] ========== */


