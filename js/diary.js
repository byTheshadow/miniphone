/* ============================================
   Diary / Calendar Module============================================ */
var Diary = (function() {
  'use strict';

  var currentYear = new Date().getFullYear();
  var currentMonth = new Date().getMonth();
  var selectedDate = null; // 'YYYY-MM-DD'
  var bgTimerId = null;

  // --- Sticker Presets ---
  var STICKER_CATEGORIES = [
    {
      name: 'Mood',
      icon: '\u263A',
      items: [
        '\uD83D\uDE0A','\uD83D\uDE04','\uD83E\uDD29','\uD83D\uDE0D','\uD83E\uDD70',
        '\uD83D\uDE0E','\uD83D\uDE02','\uD83E\uDD23','\uD83D\uDE07','\uD83E\uDD14',
        '\uD83D\uDE14','\uD83D\uDE22','\uD83D\uDE2D','\uD83D\uDE24','\uD83D\uDE21',
        '\uD83E\uDD75','\uD83E\uDD76','\uD83E\uDD74','\uD83E\uDD71','\uD83D\uDE34'
      ]
    },
    {
      name: 'Weather',
      icon: '\u2600',
      items: [
        '\u2600\uFE0F','\u26C5','\u2601\uFE0F','\uD83C\uDF27\uFE0F','\u26C8\uFE0F',
        '\uD83C\uDF29\uFE0F','\uD83C\uDF28\uFE0F','\u2744\uFE0F','\uD83C\uDF2C\uFE0F','\uD83C\uDF08',
        '\uD83C\uDF19','\u2B50','\uD83C\uDF1E','\uD83C\uDF21\uFE0F'
      ]
    },
    {
      name: 'Activity',
      icon: '\u26A1',
      items: [
        '\uD83C\uDFC3','\uD83D\uDEB6','\uD83D\uDEB2','\uD83C\uDFCA','\uD83E\uDDD8',
        '\uD83C\uDFAE','\uD83C\uDFB5','\uD83D\uDCDA','\uD83C\uDFA8','\uD83C\uDF73',
        '\uD83D\uDED2','\u2708\uFE0F','\uD83C\uDFE0','\uD83D\uDCBB','\uD83C\uDF89'
      ]
    },
    {
      name: 'Food',
      icon: '\uD83C\uDF54',
      items: [
        '\u2615','\uD83C\uDF75','\uD83C\uDF54','\uD83C\uDF55','\uD83C\uDF63',
        '\uD83C\uDF5C','\uD83C\uDF70','\uD83C\uDF53','\uD83C\uDF4E','\uD83C\uDF7A',
        '\uD83E\uDD57','\uD83C\uDF71','\uD83C\uDF69','\uD83E\uDD50'
      ]
    },
    {
      name: 'Symbol',
      icon: '\u2726',
      items: [
        '\u2764\uFE0F','\u2728','\uD83D\uDD25','\uD83C\uDF1F','\uD83D\uDCAA',
        '\u2705','\u274C','\u2757','\u2753','\uD83D\uDCA4',
        '\uD83C\uDF40','\uD83E\uDDE1','\uD83D\uDC94','\uD83C\uDF38','\uD83C\uDF3B'
      ]
    }
  ];

  var WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // --- Helpers ---
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dateStr(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }

  function todayStr() {
    var d = new Date();
    return dateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatTimestamp(ts) {
    var d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatDateDisplay(ds) {
    //'YYYY-MM-DD' → readable
    var parts = ds.split('-');
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
  }

  function getMonthLabel(y, m) {
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[m] + ' ' + y;
  }

  function getDaysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function getFirstDayOfWeek(y, m) {
    return new Date(y, m, 1).getDay();
  }

  function getCompanionChar() {
    var ds = Store.getDiarySettings();
    if (!ds.companionCharId) return null;
    return Store.getChar(ds.companionCharId) || null;
  }

  // --- Render ---
  function render() {
    var container = document.getElementById('diary-content');
    if (!container) return;

    var entries = Store.getDiaryEntries();
    var companion = getCompanionChar();
    var today = todayStr();

    var html = '';

    // Month nav
    html += '<div class="diary-month-nav">'+ '<button id="diary-prev-month">\u25C0</button>'
      + '<div class="diary-month-label">' + UI.escapeHtml(getMonthLabel(currentYear, currentMonth)) + '</div>'
      + '<button id="diary-next-month">\u25B6</button>'+ '</div>';

    // Today bar
    html += '<div class="diary-today-bar">Today: ' + formatDateDisplay(today) + '</div>';

    // Weekday headers
    html += '<div class="diary-weekdays">';
    for (var w = 0; w < 7; w++) {
      html += '<div class="diary-weekday">' + WEEKDAYS[w] + '</div>';
    }
    html += '</div>';

    // Calendar grid
    var daysInMonth = getDaysInMonth(currentYear, currentMonth);
    var firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    var prevMonthDays = getDaysInMonth(currentYear, currentMonth === 0 ? 11 : currentMonth - 1);

    html += '<div class="diary-grid">';

    // Previous month trailing days
    for (var p = firstDay - 1; p >= 0; p--) {
      var pd = prevMonthDays - p;
      html += '<div class="diary-cell other-month"><span class="diary-cell-date">' + pd + '</span></div>';
    }

    // Current month days
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = dateStr(currentYear, currentMonth, d);
      var dayData = entries[ds];
      var isToday = ds === today;
      var isSelected = ds === selectedDate;
      var hasData = dayData && (dayData.stickers.length > 0 || dayData.note || dayData.aiMessages.length > 0);
      var hasAi = dayData && dayData.aiMessages && dayData.aiMessages.length > 0;

      var cellClass = 'diary-cell';
      if (isToday) cellClass += ' today';
      if (isSelected) cellClass += ' selected';
      if (hasData) cellClass += ' has-data';

      html += '<div class="' + cellClass + '" data-date="' + ds + '">';
      html += '<span class="diary-cell-date">' + d + '</span>';

      // Show up to 3 stickers preview
      if (dayData && dayData.stickers.length > 0) {
        var preview = dayData.stickers.slice(0, 3).join('');
        html += '<span class="diary-cell-stickers">' + preview + '</span>';
      }

      // Dot indicator for AI messages
      if (hasAi) {
        html += '<span class="diary-cell-dot has-ai"></span>';
      } else if (hasData) {
        html += '<span class="diary-cell-dot"></span>';
      }

      html += '</div>';
    }

    // Next month leading days
    var totalCells = firstDay + daysInMonth;
    var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var n = 1; n <= remaining; n++) {
      html += '<div class="diary-cell other-month"><span class="diary-cell-date">' + n + '</span></div>';
    }

    html += '</div>';

    // Companion card
    if (companion) {
      html += '<div class="diary-companion-section">'
        + '<div class="diary-companion-card">'
        + '<div class="diary-companion-avatar">' + UI.renderAvatar(companion.avatar) + '</div>'
        + '<div class="diary-companion-info">'
        + '<div class="diary-companion-name">' + UI.escapeHtml(companion.name) + '</div>'
        + '<div class="diary-companion-status">Your diary companion</div>'
        + '</div>'
        + '<button class="diary-companion-change" id="diary-change-companion">Change</button>'
        + '</div>'
        + '</div>';
    } else {
      html += '<div class="diary-no-companion">'
        + '<p>Choose an AI companion to share your diary with</p>'
        + '<button id="diary-choose-companion">Select Companion</button>'
        + '</div>';
    }

    // Day detail panel (if a date is selected)
    if (selectedDate) {
      html += renderDayDetail(selectedDate, entries[selectedDate], companion);
    }

    container.innerHTML = html;bindEvents();
  }

  function renderDayDetail(ds, dayData, companion) {
    if (!dayData) dayData = { stickers: [], note: '', aiMessages: [] };

    var html = '<div class="diary-detail">';

    // Header
    html += '<div class="diary-detail-header">'
      + '<div class="diary-detail-date">' + formatDateDisplay(ds) + '</div>'
      + '<div class="diary-detail-actions">'
      + '<button id="diary-add-sticker-btn">\u002B Sticker</button>'
      + '</div>'
      + '</div>';

    // Stickers
    html += '<div class="diary-stickers-section">'
      + '<div class="diary-stickers-label">Stickers</div>'
      + '<div class="diary-stickers-list">';

    for (var i = 0; i < dayData.stickers.length; i++) {
      html += '<div class="diary-sticker-item" data-index="' + i + '">'
        + dayData.stickers[i]
        + '<button class="remove-sticker" data-index="' + i + '">\u00D7</button>'
        + '</div>';
    }

    html += '<button class="diary-sticker-add" id="diary-add-sticker-btn2">\u002B</button>'
      + '</div></div>';

    // Note
    html += '<div class="diary-note-section">'
      + '<textarea class="diary-note-textarea" id="diary-note-input" placeholder="Write a note for today...">'
      + UI.escapeHtml(dayData.note || '')
      + '</textarea></div>';

    // AI messages
    html += '<div class="diary-ai-section">'
      + '<div class="diary-ai-label">';

    if (companion) {
      html += UI.renderAvatar(companion.avatar) + ' ' + UI.escapeHtml(companion.name) + '\'s messages';
    } else {
      html += 'AI Messages';
    }
    html += '</div>';

    if (dayData.aiMessages && dayData.aiMessages.length > 0) {
      html += '<div class="diary-ai-messages">';
      for (var j = 0; j < dayData.aiMessages.length; j++) {
        var msg = dayData.aiMessages[j];
        html += '<div class="diary-ai-msg">'
          + '<div class="diary-ai-msg-avatar">' + UI.renderAvatar(msg.charAvatar) + '</div>'
          + '<div class="diary-ai-msg-body">'
          + '<div class="diary-ai-msg-name">' + UI.escapeHtml(msg.charName) + '</div>'
          + '<div class="diary-ai-msg-content">' + UI.escapeHtml(msg.content) + '</div>'
          + '<div class="diary-ai-msg-time">' + formatTimestamp(msg.timestamp) + '</div>'
          + '</div></div>';
      }
      html += '</div>';
    } else {
      html += '<div class="diary-no-ai-msg">No messages yet</div>';
    }

    html += '</div></div>';

    return html;
  }

  // --- Event Binding ---
  function bindEvents() {
    // Month navigation
    var prevBtn = document.getElementById('diary-prev-month');
    var nextBtn = document.getElementById('diary-next-month');
    if (prevBtn) {
      prevBtn.onclick = function() {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        selectedDate = null;
        render();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = function() {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        selectedDate = null;
        render();
      };
    }

    // Cell click
    var cells = document.querySelectorAll('.diary-cell:not(.other-month)');
    cells.forEach(function(cell) {
      cell.onclick = function() {
        var ds = cell.getAttribute('data-date');
        if (selectedDate === ds) {
          selectedDate = null;
        } else {
          selectedDate = ds;
        }
        render();
      };
    });

    // Add sticker buttons
    var addBtn1 = document.getElementById('diary-add-sticker-btn');
    var addBtn2 = document.getElementById('diary-add-sticker-btn2');
    if (addBtn1) addBtn1.onclick = function() { showStickerPicker(); };
    if (addBtn2) addBtn2.onclick = function() { showStickerPicker(); };

    // Remove sticker
    var removeBtns = document.querySelectorAll('.remove-sticker');
    removeBtns.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        if (selectedDate) {
          Store.removeDiarySticker(selectedDate, idx);
          render();
        }
      };
    });

    // Note input
    var noteInput = document.getElementById('diary-note-input');
    if (noteInput) {
      var debounceTimer = null;
      noteInput.oninput = function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          if (selectedDate) {
            Store.saveDiaryNote(selectedDate, noteInput.value);
          }
        }, 500);
      };
    }

    // Companion buttons
    var chooseBtn = document.getElementById('diary-choose-companion');
    var changeBtn = document.getElementById('diary-change-companion');
    if (chooseBtn) chooseBtn.onclick = function() { showCompanionPicker(); };
    if (changeBtn) changeBtn.onclick = function() { showCompanionPicker(); };

    // Settings button
    var settingsBtn = document.getElementById('diary-settings-btn');
    if (settingsBtn) {
      settingsBtn.onclick = function() { showDiarySettingsModal(); };
    }
  }

  // --- Sticker Picker ---
  function showStickerPicker() {
    if (!selectedDate) return;

    var activeTab = 0;

    function buildPickerHtml(tabIdx) {
      var h = '<div class="sticker-picker">';

      // Tabs
      h += '<div class="sticker-picker-tabs">';
      for (var t = 0; t < STICKER_CATEGORIES.length; t++) {
        var cat = STICKER_CATEGORIES[t];
        h += '<button class="sticker-picker-tab' + (t === tabIdx ? ' active' : '') + '" data-tab="' + t + '">'
          + cat.icon + ' ' + cat.name + '</button>';
      }
      h += '</div>';

      // Grid
      var items = STICKER_CATEGORIES[tabIdx].items;
      h += '<div class="sticker-picker-grid">';
      for (var i = 0; i < items.length; i++) {
        h += '<div class="sticker-picker-item" data-sticker="' + items[i] + '">' + items[i] + '</div>';
      }
      h += '</div>';

      // Custom input
      h += '<div class="sticker-custom-input">'
        + '<input type="text" id="sticker-custom-val" placeholder="Type emoji or text..." maxlength="8" />'
        + '<button id="sticker-custom-add">Add</button>'
        + '</div>';

      h += '</div>';
      return h;
    }

    UI.showModal(buildPickerHtml(activeTab), 'Add Sticker');

    // Bind picker events after modal renders
    setTimeout(function() {
      bindPickerEvents();
    }, 50);

    function bindPickerEvents() {
      // Tab clicks
      var tabs = document.querySelectorAll('.sticker-picker-tab');
      tabs.forEach(function(tab) {
        tab.onclick = function() {
          activeTab = parseInt(tab.getAttribute('data-tab'), 10);
          var modalBody = document.querySelector('#modal-content .sticker-picker');
          if (modalBody) {
            modalBody.outerHTML = buildPickerHtml(activeTab);
            setTimeout(bindPickerEvents, 30);
          }
        };
      });

      // Sticker item clicks
      var items = document.querySelectorAll('.sticker-picker-item');
      items.forEach(function(item) {
        item.onclick = function() {
          var sticker = item.getAttribute('data-sticker');
          Store.addDiarySticker(selectedDate, sticker);
          UI.closeModal();
          render();
          UI.toast('Sticker added!');
        };
      });

      // Custom add
      var customBtn = document.getElementById('sticker-custom-add');
      var customInput = document.getElementById('sticker-custom-val');
      if (customBtn && customInput) {
        customBtn.onclick = function() {
          var val = customInput.value.trim();
          if (val) {
            Store.addDiarySticker(selectedDate, val);
            UI.closeModal();
            render();
            UI.toast('Sticker added!');
          }
        };
        customInput.onkeydown = function(e) {
          if (e.key === 'Enter') {
            customBtn.click();
          }
        };
      }
    }
  }

  // --- Companion Picker ---
  function showCompanionPicker() {
    var chars = Store.getChars();
    if (!chars || chars.length === 0) {
      UI.toast('No characters found. Create one in Chat first.');
      return;
    }

    var html = '<div style="max-height:320px;overflow-y:auto;">';
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      html += '<div class="diary-companion-card" style="margin-bottom:8px;cursor:pointer;" data-char-id="' + c.id + '">'
        + '<div class="diary-companion-avatar">' + UI.renderAvatar(c.avatar) + '</div>'
        + '<div class="diary-companion-info">'
        + '<div class="diary-companion-name">' + UI.escapeHtml(c.name) + '</div>'
        + '</div></div>';
    }
    html += '</div>';

    UI.showModal(html, 'Choose Companion');

    setTimeout(function() {
      var cards = document.querySelectorAll('#modal-content .diary-companion-card');
      cards.forEach(function(card) {
        card.onclick = function() {
          var charId = card.getAttribute('data-char-id');
          var ds = Store.getDiarySettings();
          ds.companionCharId = charId;
          Store.saveDiarySettings(ds);
          UI.closeModal();
          render();
          var ch = Store.getChar(charId);
          UI.toast(ch ? ch.name + ' is now your companion!' : 'Companion set!');
        };
      });
    }, 50);
  }

  // --- Diary Settings Modal ---
  function showDiarySettingsModal() {
    var ds = Store.getDiarySettings();

    var html = '<div>'
      + '<div style="margin-bottom:16px;">'
      + '<label style="font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;">'
      + '<input type="checkbox" id="diary-bg-enabled" ' + (ds.bgEnabled ? 'checked' : '') + ' /> '
      + 'Enable AI companion messages'
      + '</label>'
      + '</div>'
      + '<div style="margin-bottom:12px;">'
      + '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Interval (seconds)</label>'
      + '<input type="number" id="diary-bg-interval" value="' + ds.bgInterval + '" '
      + 'style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);'
      + 'border-radius:var(--radius-sm);color:var(--text-primary);padding:8px 12px;font-size:13px;outline:none;" />'
      + '</div>'
      + '<div style="margin-bottom:16px;">'
      + '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Chance(%)</label>'
      + '<input type="number" id="diary-bg-chance" value="' + ds.bgChance + '" min="0" max="100" '
      + 'style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);'
      + 'border-radius:var(--radius-sm);color:var(--text-primary);padding:8px 12px;font-size:13px;outline:none;" />'
      + '</div>'
      + '<button id="diary-settings-save" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);'
      + 'border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);'
      + 'font-size:13px;cursor:pointer;">Save</button>'
      + '</div>';

    UI.showModal(html, 'Diary Settings');

    setTimeout(function() {
      var saveBtn = document.getElementById('diary-settings-save');
      if (saveBtn) {
        saveBtn.onclick = function() {
          var newDs = Store.getDiarySettings();
          newDs.bgEnabled = document.getElementById('diary-bg-enabled').checked;
          newDs.bgInterval = parseInt(document.getElementById('diary-bg-interval').value, 10) || 3600;
          newDs.bgChance = parseInt(document.getElementById('diary-bg-chance').value, 10) || 40;
          Store.saveDiarySettings(newDs);
          UI.closeModal();
          UI.toast('Diary settings saved');restartBgTask();
        };
      }
    }, 50);
  }

  // --- AI Background Task ---
  function startBgTask() {
    stopBgTask();
    scheduleDiaryAction();
  }

  function stopBgTask() {
    if (bgTimerId) {
      clearTimeout(bgTimerId);
      bgTimerId = null;
    }
  }

  function restartBgTask() {
    stopBgTask();
    startBgTask();
  }

  function scheduleDiaryAction() {
    var bgSettings = Store.getBgSettings();
    var diarySettings = Store.getDiarySettings();

    if (!bgSettings.enabled || !diarySettings.bgEnabled || !diarySettings.companionCharId) {
      bgTimerId = setTimeout(scheduleDiaryAction, 60000); // check again in 60s
      return;
    }

    var interval = (diarySettings.bgInterval || 3600) * 1000;
    var jitter = interval * 0.3;
    var delay = interval + (Math.random() * jitter * 2 - jitter);

    bgTimerId = setTimeout(function() {
      performDiaryAction().catch(function(err) {
          Store.addLog({
            level: 'error',
            source: 'diary-bg',
            message: 'Diary bg action failed',
            detail: err.message || String(err),
            stack: err.stack || ''
          });
        })
        .finally(function() {
          scheduleDiaryAction();
        });
    }, delay);
  }

  function performDiaryAction() {
    var diarySettings = Store.getDiarySettings();
    var chance = diarySettings.bgChance || 40;

    if (Math.random() * 100 > chance) {
      return Promise.resolve();
    }

    var companion = getCompanionChar();
    if (!companion) return Promise.resolve();

    var today = todayStr();
    var dayData = Store.getDiaryDay(today);
    var settings = Store.getSettings();

    // Build context about today's stickers and note
    var context = 'Today is ' + formatDateDisplay(today) + '.';
    if (dayData.stickers.length > 0) {
      context += ' The user placed these stickers/emojis on today\'s calendar: ' + dayData.stickers.join(' ') + '.';
    }
    if (dayData.note) {
      context += ' The user\'s note for today: "' + dayData.note + '".';
    }
    if (dayData.stickers.length === 0 && !dayData.note) {
      context += ' The user hasn\'t added anything to the calendar today yet.';
    }

    // Use char's userPersona or global persona
    var userPersona = companion.userPersona || settings.persona || '';
    var userPersonaLine = userPersona ? '\nAbout the user: ' + userPersona : '';

    var systemPrompt = 'You are ' + companion.name + '. '
      + (companion.persona || companion.systemPrompt || '')
      + '\nYou are the user\'s diary companion. You care about their daily life. '
      + 'Leave a short, warm message based on what they did today (or if they haven\'t logged anything, gently check in). '
      + 'Keep it natural,1-3 sentences. Match your character\'s personality.'
      + userPersonaLine;

    var userPrompt = context
      + '\nLeave a caring message for the user. Be natural and in-character.';

    return AI.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.9, max_tokens: 1024 })
    .then(function(reply) {
      if (!reply || !reply.trim()) return;

      var now = Date.now();

      // 1. Write to diary
      Store.addDiaryAiMessage(today, {
        charId: companion.id,
        charName: companion.name,
        charAvatar: companion.avatar,
        content: reply.trim(),
        timestamp: now
      });

      // 2. Write to chat as a notification (方案B: hint message in chat)
      // Find or create conversation with this char
      var convId = findOrCreateConvWithChar(companion.id);
      if (convId) {
        Store.addMessage(convId, {
          id: UI.genId('msg'),
          senderId: companion.id,
          senderName: companion.name,
          senderAvatar: companion.avatar,
          content: '\uD83D\uDCC5 I left you a message on the diary! Go check it out~',
          role: 'assistant',
          type: 'text',
          timestamp: now
        });
        Store.updateConversation(convId, {
          lastMessage: '\uD83D\uDCC5 Left a diary message',
          lastMessageTime: now
        });
      }

      Store.addLog({
        level: 'info',
        source: 'diary-bg',
        message: 'Diary AI message sent by ' + companion.name,
        detail: reply.trim().substring(0, 100)
      });

      // Re-render if diary page is visible
      var diaryPage = document.getElementById('page-diary');
      if (diaryPage && diaryPage.classList.contains('active')) {
        render();
      }
    });
  }

  function findOrCreateConvWithChar(charId) {
    var convs = Store.getConversations();
    for (var i = 0; i < convs.length; i++) {
      if (convs[i].type === 'single' && convs[i].charIds && convs[i].charIds.indexOf(charId) !== -1) {
        return convs[i].id;
      }
    }
    // Create new conversation
    var ch = Store.getChar(charId);
    if (!ch) return null;
    var conv = Store.addConversation({
      id: UI.genId('conv'),
      name: ch.name,
      type: 'single',
      charIds: [charId],
      bgImage: '',
      bubbleCss: '',
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return conv.id;
  }

  // --- Public API ---
  function init() {
    render();
    startBgTask();
  }

  return {
    init: init,
    render: render,
    restartBgTask: restartBgTask,
    performDiaryAction: performDiaryAction
  };
})();
