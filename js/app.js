var App = (function() {
    var currentPage = 'home';

    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        Chat.init();
        Forum.init();
        Diary.init();
        Receipt.init();
        Widgets.init();
        initHomeSwipe();


        bindNavigation();
        bindSettings();
        bindKnowledgeBooks();
        bindBgSettings();
        bindLogs();
        loadSettings();
        loadBgSettings();
        registerSW();
        bindClearButtons();
        

    }
   function initHomeSwipe() {
    var screens = document.getElementById('home-screens');
    var dots = document.querySelectorAll('.home-dot');
    if (!screens) return;

    var currentIdx = 0;
    var totalScreens = 2;
    var startX = 0;
    var startY = 0;
    var isDragging = false;
    var THRESHOLD = 50;
    var phoneW = 0;

    // 设置每个 screen 的宽度为手机容器宽度
    function setWidths() {
        var container = document.getElementById('phone-container') || document.body;
        phoneW = container.offsetWidth;
        screens.style.width = (phoneW * totalScreens) + 'px';
        var screenEls = screens.querySelectorAll('.home-screen');
        screenEls.forEach(function(s) {
            s.style.width = phoneW + 'px';
            s.style.height = '100%';
        });
    }

    function goTo(idx) {
        currentIdx = Math.max(0, Math.min(totalScreens - 1, idx));
        screens.style.transform = 'translateX(-' + (currentIdx * phoneW) + 'px)';
        dots.forEach(function(d, i) {
            d.classList.toggle('active', i === currentIdx);
        });
        if (currentIdx === 1) {
            Widgets.render();
        }
    }

    // 初始化宽度
    setWidths();
    // 窗口 resize 时重新计算
    window.addEventListener('resize', function() {
        setWidths();
        goTo(currentIdx);
    });

    screens.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    screens.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        isDragging = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (Math.abs(dx) < THRESHOLD) return;
        if (dx < 0) goTo(currentIdx + 1);
        else goTo(currentIdx - 1);
    }, { passive: true });

    dots.forEach(function(d) {
        d.addEventListener('click', function() {
            goTo(parseInt(d.dataset.idx));
        });
    });

    screens.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
    });
    screens.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        isDragging = false;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (Math.abs(dx) < THRESHOLD) return;
        if (dx < 0) goTo(currentIdx + 1);
        else goTo(currentIdx - 1);
    });
    screens.addEventListener('mouseleave', function() { isDragging = false; });
}


    function updateClock() {
        var now = new Date();
        var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var timeEl = document.getElementById('status-time');
        var clockEl = document.getElementById('home-clock');
        if (timeEl) timeEl.textContent = timeStr;
        if (clockEl) clockEl.textContent = timeStr;
    }

    function registerSW() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/miniphone/sw.js').then(function(reg) {
            reg.update();
            reg.addEventListener('updatefound', function() {
                var newWorker = reg.installing;
                newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        UI.toast('New version available, updating...');
                        setTimeout(function() { newWorker.postMessage({ type: 'SKIP_WAITING' }); }, 1000);
                    }
                });
            });
        }).catch(function(e) { console.log('SW registration failed:', e); });

        navigator.serviceWorker.addEventListener('controllerchange', function() {
            window.location.reload();
        });
    }

    //── Navigation ────────────────────────────────────────────────

    function bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(function(btn) {
            btn.addEventListener('click', function() { navigateTo(btn.dataset.page); });
        });
        document.querySelectorAll('.home-app').forEach(function(btn) {
            btn.addEventListener('click', function() { navigateTo(btn.dataset.page); });
        });
        document.querySelectorAll('.back-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { navigateTo(btn.dataset.back, true); });
        });
    }

    function navigateTo(pageId, isBack) {
        var prevPage = document.querySelector('.page.active');
        var nextPage = document.getElementById('page-' + pageId);
        if (!nextPage || prevPage === nextPage) return;

        if (pageId === 'chat-list') Chat.renderContactList();
        if (pageId === 'forum-list') Forum.renderPostList();
        if (pageId === 'logs') renderLogs();
        if (pageId === 'receipt') { Receipt.render(); }
        

        if (prevPage) {
            prevPage.classList.remove('active');
            if (!isBack) {
                prevPage.classList.add('slide-out-left');
                setTimeout(function() { prevPage.classList.remove('slide-out-left'); }, 350);
            }
            if (pageId === 'diary') {Diary.render();
}
        }

        nextPage.classList.add('active');

        var navMap = {
            'home': 'home',
            'chat-list': 'chat-list',
            'chat': 'chat-list',
            'forum-list': 'forum-list',
            'forum-post': 'forum-list',
            'settings': 'settings',
            'logs': 'settings',
            'diary': 'home',// diary 页面时，nav bar 高亮 home
            'receipt': 'home',
        };
        document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        var activeNav = document.querySelector('.nav-item[data-page="' + (navMap[pageId] || pageId) + '"]');
        if (activeNav) activeNav.classList.add('active');

        currentPage = pageId;}

    // ── Settings ──────────────────────────────────────────────────

    function bindSettings() {
        document.getElementById('btn-fetch-models').addEventListener('click', function() {
            var url = document.getElementById('setting-api-url').value.trim();
            var key = document.getElementById('setting-api-key').value.trim();
            var settings = Store.getSettings();
            settings.apiUrl = url;
            settings.apiKey = key;
            Store.saveSettings(settings);

            UI.toast('Fetching models...');
            AI.fetchModels().then(function(models) {
                var select = document.getElementById('setting-model');
                select.innerHTML = models.map(function(m) {
                    return '<option value="' + m +'" ' + (m === settings.model ? 'selected' : '') + '>' + m + '</option>';
                }).join('');
                UI.toast('Found ' + models.length + ' models \u2726');
            }).catch(function(e) {
                UI.toast('Error: ' + e.message);
            });
        });

        document.getElementById('btn-save-settings').addEventListener('click', function() {
            var settings = {
                apiUrl: document.getElementById('setting-api-url').value.trim(),
                apiKey: document.getElementById('setting-api-key').value.trim(),
                model: document.getElementById('setting-model').value,
                username: document.getElementById('setting-username').value.trim() || 'User',
                userAvatar: document.getElementById('setting-user-avatar').value.trim() || '\uD83D\uDE08',
                persona: document.getElementById('setting-persona').value.trim(),
                summaryPrompt: document.getElementById('setting-summary-prompt').value.trim(),
                forumPrompt: document.getElementById('setting-forum-prompt').value.trim()
            };
            Store.saveSettings(settings);
            UI.toast('Settings saved \u2726');
        });

        document.getElementById('btn-import-char').addEventListener('click', function() {
            document.getElementById('file-import-char').click();
        });

        document.getElementById('file-import-char').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var data = JSON.parse(ev.target.result);
                    importCharFromJson(data);
                } catch (_) {
                    UI.toast('Invalid JSON file');
                }
            };
            reader.readAsText(file);e.target.value = '';
        });

        document.getElementById('btn-export-data').addEventListener('click', function() {
            var data = Store.exportAll();
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'miniphone_backup_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
            UI.toast('Data exported');
        });

        document.getElementById('btn-import-data').addEventListener('click', function() {
            document.getElementById('file-import-data').click();
        });

        document.getElementById('file-import-data').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var data = JSON.parse(ev.target.result);
                    Store.importAll(data);
                    UI.toast('Data imported. Reloading...');
                    setTimeout(function() { location.reload(); }, 1200);
                } catch (_) {
                    UI.toast('Invalid backup file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // ── Import Char JSON ──────────────────────────────────────────

    function importCharFromJson(data) {
        var char = {};

        if (data.spec === 'chara_card_v2' || data.data) {
            var d = data.data || {};
            char.name = d.name || data.name || 'Unknown';
            char.persona = [d.description, d.personality, d.mes_example]
                .filter(Boolean).join('\n\n');
            char.systemPrompt = d.system_prompt || d.scenario || '';
            char.firstMessage = d.first_mes || '';
            var rawAvatar1 = data.avatar || d.avatar || '';
            char.avatar = (rawAvatar1.startsWith('data:') || rawAvatar1.startsWith('http'))
                ? rawAvatar1 : '\uD83D\uDC64';} else {
            char.name = data.name || data.char_name || 'Unknown';
            char.persona = data.description || data.personality || data.persona || '';
            char.systemPrompt = data.system_prompt || data.scenario || '';
            char.firstMessage = data.first_mes || data.greeting || '';
            var rawAvatar2 = data.avatar || '';
            char.avatar = (rawAvatar2.startsWith('data:') || rawAvatar2.startsWith('http'))
                ? rawAvatar2 : '\uD83D\uDC64';
        }

        if (!char.name || char.name === 'Unknown') {
            UI.toast('Warning: could not read character name');
        }

        var newChar = Store.addChar(char);

        var conv = Store.addConversation({
            name: newChar.name,
            charIds: [newChar.id],
            type: 'single'
        });

        if (char.firstMessage) {
            Store.addMessage(conv.id, {
                senderId: newChar.id,
                senderName: newChar.name,
                senderAvatar: newChar.avatar,
                content: char.firstMessage,
                role: 'assistant',
                type: 'text'
            });
        }

        UI.toast('Imported: ' + newChar.name + ' \u2726');
    }

    // ── Knowledge Books UI ────────────────────────────────────────

    function bindKnowledgeBooks() {
        var btn = document.getElementById('btn-manage-kb');
        if (btn) btn.addEventListener('click', showKnowledgeBooksModal);
    }

    function showKnowledgeBooksModal() {
        renderKBList();
    }

    function renderKBList() {
        var books = Store.getKnowledgeBooks();
        var chars = Store.getChars().filter(function(c) { return c.id !== '__model__'; });

        var booksHtml;
        if (books.length === 0) {
            booksHtml = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px;">No knowledge books yet</p>';
        } else {
            booksHtml = books.map(function(b) {
                var scopeLabel = b.global
                    ? '\uD83C\uDF10 Global'
                    : '\uD83D\uDC64 ' + ((Store.getChar(b.charId) || {}).name || 'Unknown char');
                var entryCount = (b.entries || []).length;
                return '<div class="kb-item" style="padding:10px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;">'
                    + '<div>'
                    + '<div style="font-size:13px;font-weight:500;">' + UI.escapeHtml(b.name) + '</div>'
                    + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'
                    + UI.escapeHtml(scopeLabel) + ' \u00B7 ' + entryCount + ' entries'
                    + '</div>'
                    + '</div>'
                    + '<div style="display:flex;gap:6px;">'
                    + '<button class="small-btn kb-edit" data-id="' + b.id + '">Edit</button>'
                    + '<button class="small-btn kb-delete" data-id="' + b.id + '" style="border-color:var(--accent-red);">Del</button>'
                    + '</div>'
                    + '</div>'
                    + '</div>';
            }).join('');
        }

        var charOptions = chars.map(function(c) {
            return '<option value="' + c.id + '">' + UI.escapeHtml(c.name) + '</option>';
        }).join('');

        var optgroupHtml = charOptions
            ? '<optgroup label="Char-specific">' + charOptions + '</optgroup>'
            : '';

        UI.showModal(
            '<h3>\uD83D\uDCDA Knowledge Books</h3>'
            + '<div style="max-height:240px;overflow-y:auto;margin-bottom:12px;">'
            + booksHtml
            + '</div>'
            + '<div style="border-top:1px solid var(--border-color);padding-top:12px;">'
            + '<div class="setting-item"><label>New Book Name</label>'
            + '<input type="text" id="kb-new-name" placeholder="e.g. World Lore"></div>'
            + '<div class="setting-item"><label>Scope</label>'
            + '<select id="kb-new-scope">'
            + '<option value="global">\uD83C\uDF10 Global (all chats)</option>'
            + optgroupHtml
            + '</select></div>'
            + '</div>'
            + '<div class="modal-btns">'
            + '<button class="gothic-btn" onclick="UI.closeModal()">Close</button>'
            + '<button class="gothic-btn primary" id="btn-kb-create">Create Book</button>'
            + '</div>'
        );

        document.getElementById('btn-kb-create').addEventListener('click', function() {
            var name = document.getElementById('kb-new-name').value.trim();
            if (!name) { UI.toast('Enter a book name'); return; }
            var scope = document.getElementById('kb-new-scope').value;
            var isGlobal = scope === 'global';
            Store.addKnowledgeBook({
                name: name,
                global: isGlobal,
                charId: isGlobal ? null : scope,
                entries: []
            });
            UI.toast('Book "' + name + '" created');
            renderKBList();
        });

        document.querySelectorAll('.kb-edit').forEach(function(btn) {
            btn.addEventListener('click', function() { showKBEditModal(btn.dataset.id); });
        });

        document.querySelectorAll('.kb-delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                Store.deleteKnowledgeBook(btn.dataset.id);
                UI.toast('Book deleted');
                renderKBList();
            });
        });
    }

    function showKBEditModal(bookId) {
        var book = Store.getKnowledgeBook(bookId);
        if (!book) return;

        var entriesHtml = (book.entries || []).map(function(entry, idx) {
            return '<div class="kb-entry" data-idx="' + idx + '" style="display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;">'
                + '<div style="flex:1;display:flex;flex-direction:column;gap:4px;">'
                + '<input type="text" class="kb-entry-keyword" value="' + UI.escapeHtml(entry.keyword || '') + '" placeholder="Keyword (optional)" style="font-size:12px;">'
                + '<textarea class="kb-entry-content" rows="2" style="font-size:12px;">' + UI.escapeHtml(entry.content || '') + '</textarea>'
                + '</div>'
                + '<button class="small-btn kb-entry-del" data-idx="' + idx + '" style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">\u2715</button>'
                + '</div>';
        }).join('');

        var emptyMsg = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">No entries yet</p>';

        UI.showModal(
            '<h3>\u270E Edit: ' + UI.escapeHtml(book.name) + '</h3>'
            + '<div id="kb-entries-list" style="max-height:300px;overflow-y:auto;margin-bottom:10px;">'
            + (entriesHtml || emptyMsg)
            + '</div>'
            + '<button class="gothic-btn full-width" id="btn-kb-add-entry" style="margin-bottom:12px;">\uFF0B Add Entry</button>'
            + '<div class="modal-btns">'
            + '<button class="gothic-btn" id="btn-kb-back">\u2190 Back</button>'
            + '<button class="gothic-btn primary" id="btn-kb-save">Save</button>'
            + '</div>'
        );

        document.getElementById('btn-kb-back').addEventListener('click', function() { renderKBList(); });

        document.getElementById('btn-kb-add-entry').addEventListener('click', function() {
            var list = document.getElementById('kb-entries-list');
            var idx = list.querySelectorAll('.kb-entry').length;
            var div = document.createElement('div');
            div.className = 'kb-entry';
            div.dataset.idx = idx;
            div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;';
            div.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;gap:4px;">'
                + '<input type="text" class="kb-entry-keyword" placeholder="Keyword (optional)" style="font-size:12px;">'
                + '<textarea class="kb-entry-content" rows="2" style="font-size:12px;"></textarea>'
                + '</div>'
                + '<button class="small-btn kb-entry-del" data-idx="' + idx + '" style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">\u2715</button>';
            list.appendChild(div);
            bindEntryDeleteBtns();
        });

        bindEntryDeleteBtns();

        document.getElementById('btn-kb-save').addEventListener('click', function() {
            var entries = [];
            document.querySelectorAll('.kb-entry').forEach(function(row) {
                var keyword = (row.querySelector('.kb-entry-keyword') || {}).value || '';
                var content = (row.querySelector('.kb-entry-content') || {}).value || '';
                keyword = keyword.trim();
                content = content.trim();
                if (content) entries.push({ keyword: keyword, content: content });
            });
            Store.updateKnowledgeBook(bookId, { entries: entries });
            UI.toast('Knowledge book saved \u2726');
            renderKBList();
        });
    }

    function bindEntryDeleteBtns() {
        document.querySelectorAll('.kb-entry-del').forEach(function(btn) {
            btn.onclick = function() {
                var entry = btn.closest('.kb-entry');
                if (entry) entry.remove();
            };
        });
    }

    // ── Background Settings ───────────────────────────────────────

    function bindBgSettings() {
        // Toggle bindings
        document.getElementById('bg-enabled-toggle').addEventListener('click', function() {
            this.classList.toggle('on');
        });
        document.getElementById('bg-chat-toggle').addEventListener('click', function() {
            this.classList.toggle('on');
        });

        // Range display
        document.getElementById('bg-forum-chance').addEventListener('input', function() {
            document.getElementById('bg-forum-chance-val').textContent = this.value + '%';
        });
        document.getElementById('bg-reply-chance').addEventListener('input', function() {
            document.getElementById('bg-reply-chance-val').textContent = this.value + '%';
        });
        document.getElementById('bg-chat-chance').addEventListener('input', function() {
            document.getElementById('bg-chat-chance-val').textContent = this.value + '%';
        });

        // Save
        document.getElementById('btn-save-bg-settings').addEventListener('click', function() {
            var bgSettings = {
                enabled: document.getElementById('bg-enabled-toggle').classList.contains('on'),
                forumPostInterval: parseInt(document.getElementById('bg-forum-interval').value) || 180,
                forumPostChance: parseInt(document.getElementById('bg-forum-chance').value) || 50,
                forumReplyChance: parseInt(document.getElementById('bg-reply-chance').value) || 50,
                chatMessageEnabled: document.getElementById('bg-chat-toggle').classList.contains('on'),
                chatMessageInterval: parseInt(document.getElementById('bg-chat-interval').value) || 300,
                chatMessageChance: parseInt(document.getElementById('bg-chat-chance').value) || 30
            };
            Store.saveBgSettings(bgSettings);
            Forum.restartBackgroundTasks();
            UI.toast('Background settings saved \u2726');
        });
    }

    function loadBgSettings() {
        var bg = Store.getBgSettings();
        document.getElementById('bg-enabled-toggle').classList.toggle('on', bg.enabled);
        document.getElementById('bg-forum-interval').value = bg.forumPostInterval || 180;
        document.getElementById('bg-forum-chance').value = bg.forumPostChance || 50;
        document.getElementById('bg-forum-chance-val').textContent = (bg.forumPostChance || 50) + '%';
        document.getElementById('bg-reply-chance').value = bg.forumReplyChance || 50;
        document.getElementById('bg-reply-chance-val').textContent = (bg.forumReplyChance || 50) + '%';
        document.getElementById('bg-chat-toggle').classList.toggle('on', bg.chatMessageEnabled || false);
        document.getElementById('bg-chat-interval').value = bg.chatMessageInterval || 300;
        document.getElementById('bg-chat-chance').value = bg.chatMessageChance || 30;
        document.getElementById('bg-chat-chance-val').textContent = (bg.chatMessageChance || 30) + '%';
    }

    // ── Logs ──────────────────────────────────────────────────────

    var logFilter = 'all';

    function bindLogs() {
        document.getElementById('btn-view-logs').addEventListener('click', function() {
            navigateTo('logs');
        });
        document.getElementById('btn-clear-logs').addEventListener('click', function() {
            Store.clearLogs();
            renderLogs();
            UI.toast('Logs cleared');
        });
    }

    function renderLogs() {
        var logs = Store.getLogs();
        var controlsEl = document.getElementById('log-controls');
        var listEl = document.getElementById('log-list');

        // Filter buttons
        var filters = ['all', 'error', 'warn', 'info'];
        controlsEl.innerHTML = filters.map(function(f) {
            return '<div class="log-filter' + (logFilter === f ? ' active' : '') + '" data-filter="' + f + '">'
                + f.toUpperCase() + '</div>';
        }).join('');

        controlsEl.querySelectorAll('.log-filter').forEach(function(el) {
            el.addEventListener('click', function() {
                logFilter = el.dataset.filter;
                renderLogs();
            });
        });

        // Filter logs
        var filtered = logFilter === 'all'
            ? logs
            : logs.filter(function(l) { return l.level === logFilter; });

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="empty-state">'
                + '<div class="empty-icon">\uD83D\uDCCB</div>'
                + '<p>No logs yet</p>'
                + '</div>';
            return;
        }

        listEl.innerHTML = filtered.map(function(log) {
            var time = new Date(log.timestamp);
            var timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            var dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

            var detailText = '';
            if (log.detail) detailText += log.detail;
            if (log.stack) detailText += '\n\nStack:\n' + log.stack;

            return '<div class="log-item level-' + log.level + '" data-log-id="' + log.id + '">'
                + '<div class="log-item-header">'
                +   '<span class="log-level ' + log.level + '">' + log.level + '</span>'
                +   '<span class="log-source">' + UI.escapeHtml(log.source) + '</span>'
                +   '<span class="log-time">' + dateStr + ' ' + timeStr + '</span>'
                + '</div>'
                + '<div class="log-message">' + UI.escapeHtml(log.message) + '</div>'
                + (detailText ? '<div class="log-detail">' + UI.escapeHtml(detailText) + '</div>' : '')
                + '</div>';
        }).join('');

        // Click to expand
        listEl.querySelectorAll('.log-item').forEach(function(el) {
            el.addEventListener('click', function() {
                el.classList.toggle('expanded');
            });
        });
    }

    // ── Load Settings into UI ─────────────────────────────────────

    function loadSettings() {
        var settings = Store.getSettings();
        document.getElementById('setting-api-url').value = settings.apiUrl || '';
        document.getElementById('setting-api-key').value = settings.apiKey || '';
        document.getElementById('setting-username').value = settings.username || '';
        document.getElementById('setting-user-avatar').value = settings.userAvatar || '';
        document.getElementById('setting-persona').value = settings.persona || '';
        document.getElementById('setting-summary-prompt').value = settings.summaryPrompt || '';
        document.getElementById('setting-forum-prompt').value = settings.forumPrompt || '';

        if (settings.model) {
            var select = document.getElementById('setting-model');
            select.innerHTML = '<option value="' + settings.model + '" selected>' + settings.model + '</option>';
        }
    }
        // ── Data Clear Buttons ────────────────────────────────────────

    function bindClearButtons() {
        var clearMap = [
            { id: 'btn-clear-chat', label: 'Chat Data', fn: function() { Store.clearChatData(); Chat.init(); } },
            { id: 'btn-clear-forum', label: 'Forum Data', fn: function() { Store.clearForumData(); Forum.renderPostList(); } },
            { id: 'btn-clear-diary', label: 'Diary Data', fn: function() { Store.clearDiaryData(); Diary.render(); } },
            { id: 'btn-clear-npc', label: 'NPC Pool', fn: function() { Store.clearNpcPool(); } }
        ];

        clearMap.forEach(function(item) {
            var btn = document.getElementById(item.id);
            if (btn) {
                btn.onclick = function() {
                    UI.showModal(
                        '<p style="margin-bottom:16px;color:var(--text-secondary);">Clear all<strong>' + item.label + '</strong>? This cannot be undone.</p>'+ '<div style="display:flex;gap:8px;">'
                        + '<button id="confirm-clear-yes" style="flex:1;padding:10px;background:rgba(139,58,58,0.3);border:1px solid rgba(139,58,58,0.5);border-radius:var(--radius-sm);color:#e0d8e8;cursor:pointer;">Confirm</button>'
                        + '<button id="confirm-clear-no" style="flex:1;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:#e0d8e8;cursor:pointer;">Cancel</button>'
                        + '</div>',
                        'Confirm Clear'
                    );
                    setTimeout(function() {
                        var yesBtn = document.getElementById('confirm-clear-yes');
                        var noBtn = document.getElementById('confirm-clear-no');
                        if (yesBtn) yesBtn.onclick = function() { item.fn(); UI.closeModal(); UI.toast(item.label + ' cleared'); };
                        if (noBtn) noBtn.onclick = function() { UI.closeModal(); };
                    }, 50);
                };
            }
        });

        // Clear ALL — double confirm with typing
        var clearAllBtn = document.getElementById('btn-clear-all');
        if (clearAllBtn) {
            clearAllBtn.onclick = function() {
                UI.showModal(
                    '<p style="margin-bottom:12px;color:#c47070;font-weight:bold;">\u26A0 DANGER ZONE</p>'
                    + '<p style="margin-bottom:16px;color:var(--text-secondary);">This will permanently delete <strong>ALL</strong> data: chats, forum posts, diary entries, characters, settings \u2014 everything. The page will reload after clearing.</p>'
                    + '<p style="margin-bottom:16px;color:var(--text-muted);font-size:12px;">Type "DELETE" to confirm:</p>'
                    + '<input type="text" id="confirm-delete-input" placeholder="Type DELETE here" '
                    + 'style="width:100%;margin-bottom:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(139,58,58,0.4);'
                    + 'border-radius:var(--radius-sm);color:var(--text-primary);padding:10px 12px;font-size:14px;outline:none;text-align:center;box-sizing:border-box;" />'
                    + '<div style="display:flex;gap:8px;">'
                    + '<button id="confirm-delete-yes" style="flex:1;padding:10px;background:rgba(139,58,58,0.4);border:1px solid rgba(139,58,58,0.6);border-radius:var(--radius-sm);color:#e0d8e8;cursor:pointer;">Delete Everything</button>'
                    + '<button id="confirm-delete-no" style="flex:1;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:#e0d8e8;cursor:pointer;">Cancel</button>'
                    + '</div>',
                    '\u2620Clear ALL Data'
                );
                setTimeout(function() {
                    var yesBtn = document.getElementById('confirm-delete-yes');
                    var noBtn = document.getElementById('confirm-delete-no');
                    if (yesBtn) {
                        yesBtn.onclick = function() {
                            var input = document.getElementById('confirm-delete-input');
                            if (input && input.value.trim() === 'DELETE') {
                                Store.clearAllData();
                                UI.closeModal();
                                UI.toast('All data cleared. Reloading...');
                                setTimeout(function() { window.location.reload(); }, 1000);
                            } else {
                                UI.toast('Please type DELETE to confirm');
                            }
                        };
                    }
                    if (noBtn) noBtn.onclick = function() { UI.closeModal(); };
                }, 50);
            };
        }
    }


    return { init: init, navigateTo: navigateTo };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });
