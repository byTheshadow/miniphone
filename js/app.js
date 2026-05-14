const App = (() => {
    let currentPage = 'home';

    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        Chat.init();
        Forum.init();

        bindNavigation();
        bindSettings();
        bindKnowledgeBooks();
        loadSettings();
        registerSW();
    }

    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timeEl = document.getElementById('status-time');
        const clockEl = document.getElementById('home-clock');
        if (timeEl) timeEl.textContent = timeStr;
        if (clockEl) clockEl.textContent = timeStr;
    }

    function registerSW() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/miniphone/sw.js').then(reg => {
            reg.update();
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        UI.toast('New version available, updating...');
                        setTimeout(() => newWorker.postMessage({ type: 'SKIP_WAITING' }), 1000);
                    }
                });
            });
        }).catch(e => console.log('SW registration failed:', e));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    // ── Navigation ────────────────────────────────────────────────

    function bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
        document.querySelectorAll('.home-app').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.back, true));
        });
    }

    function navigateTo(pageId, isBack = false) {
        const prevPage = document.querySelector('.page.active');
        const nextPage = document.getElementById('page-' + pageId);
        if (!nextPage || prevPage === nextPage) return;

        if (pageId === 'chat-list') Chat.renderContactList();
        if (pageId === 'forum-list') Forum.renderPostList();

        if (prevPage) {
            prevPage.classList.remove('active');
            if (!isBack) {
                prevPage.classList.add('slide-out-left');
                setTimeout(() => prevPage.classList.remove('slide-out-left'), 350);
            }
        }

        nextPage.classList.add('active');

        const navMap = {
            'home': 'home',
            'chat-list': 'chat-list',
            'chat': 'chat-list',
            'forum-list': 'forum-list',
            'forum-post': 'forum-list',
            'settings': 'settings'
        };
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${navMap[pageId] || pageId}"]`)?.classList.add('active');

        currentPage = pageId;
    }

    // ── Settings ──────────────────────────────────────────────────

    function bindSettings() {
        document.getElementById('btn-fetch-models').addEventListener('click', async () => {
            const url = document.getElementById('setting-api-url').value.trim();
            const key = document.getElementById('setting-api-key').value.trim();
            const settings = Store.getSettings();
            settings.apiUrl = url;
            settings.apiKey = key;
            Store.saveSettings(settings);
            try {
                UI.toast('Fetching models...');
                const models = await AI.fetchModels();
                const select = document.getElementById('setting-model');
                select.innerHTML = models.map(m =>
                    `<option value="${m}" ${m === settings.model ? 'selected' : ''}>${m}</option>`
                ).join('');
                UI.toast('Found ' + models.length + ' models ✦');
            } catch (e) {
                UI.toast('Error: ' + e.message);
            }
        });

        document.getElementById('btn-save-settings').addEventListener('click', () => {
            const settings = {
                apiUrl: document.getElementById('setting-api-url').value.trim(),
                apiKey: document.getElementById('setting-api-key').value.trim(),
                model: document.getElementById('setting-model').value,
                username: document.getElementById('setting-username').value.trim() || 'User',
                userAvatar: document.getElementById('setting-user-avatar').value.trim() || '😈',
                persona: document.getElementById('setting-persona').value.trim(),
                summaryPrompt: document.getElementById('setting-summary-prompt').value.trim()
            };
            Store.saveSettings(settings);
            UI.toast('Settings saved ✦');
        });

        document.getElementById('btn-import-char').addEventListener('click', () => {
            document.getElementById('file-import-char').click();
        });

        document.getElementById('file-import-char').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    importCharFromJson(data);
                } catch (_) {
                    UI.toast('Invalid JSON file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        document.getElementById('btn-export-data').addEventListener('click', () => {
            const data = Store.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'miniphone_backup_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
            UI.toast('Data exported');
        });

        document.getElementById('btn-import-data').addEventListener('click', () => {
            document.getElementById('file-import-data').click();
        });

        document.getElementById('file-import-data').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    Store.importAll(data);
                    UI.toast('Data imported. Reloading...');
                    setTimeout(() => location.reload(), 1200);
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
                ? rawAvatar1 : '👤';
        } else {
            char.name = data.name || data.char_name || 'Unknown';
            char.persona = data.description || data.personality || data.persona || '';
            char.systemPrompt = data.system_prompt || data.scenario || '';
            char.firstMessage = data.first_mes || data.greeting || '';
            var rawAvatar2 = data.avatar || '';
            char.avatar = (rawAvatar2.startsWith('data:') || rawAvatar2.startsWith('http'))
                ? rawAvatar2 : '👤';
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

        UI.toast('Imported: ' + newChar.name + ' ✦');
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
                    ? '🌐 Global'
                    : '👤 ' + ((Store.getChar(b.charId) || {}).name || 'Unknown char');
                var entryCount = (b.entries || []).length;
                return '<div class="kb-item" style="padding:10px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;">'
                    + '<div>'
                    + '<div style="font-size:13px;font-weight:500;">' + UI.escapeHtml(b.name) + '</div>'
                    + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'
                    + UI.escapeHtml(scopeLabel) + ' · ' + entryCount + ' entries'
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
            '<h3>📚 Knowledge Books</h3>'
            + '<div style="max-height:240px;overflow-y:auto;margin-bottom:12px;">'
            + booksHtml
            + '</div>'
            + '<div style="border-top:1px solid var(--border-color);padding-top:12px;">'
            + '<div class="setting-item"><label>New Book Name</label>'
            + '<input type="text" id="kb-new-name" placeholder="e.g. World Lore"></div>'
            + '<div class="setting-item"><label>Scope</label>'
            + '<select id="kb-new-scope">'
            + '<option value="global">🌐 Global (all chats)</option>'
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
                + '<button class="small-btn kb-entry-del" data-idx="' + idx + '" style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">✕</button>'
                + '</div>';
        }).join('');

        var emptyMsg = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">No entries yet</p>';

        UI.showModal(
            '<h3>✎ Edit: ' + UI.escapeHtml(book.name) + '</h3>'
            + '<div id="kb-entries-list" style="max-height:300px;overflow-y:auto;margin-bottom:10px;">'
            + (entriesHtml || emptyMsg)
            + '</div>'
            + '<button class="gothic-btn full-width" id="btn-kb-add-entry" style="margin-bottom:12px;">＋ Add Entry</button>'
            + '<div class="modal-btns">'
            + '<button class="gothic-btn" id="btn-kb-back">← Back</button>'
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
                + '<button class="small-btn kb-entry-del" data-idx="' + idx + '" style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">✕</button>';
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
            UI.toast('Knowledge book saved ✦');
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

    // ── Load Settings into UI ─────────────────────────────────────

    function loadSettings() {
        var settings = Store.getSettings();
        document.getElementById('setting-api-url').value = settings.apiUrl || '';
        document.getElementById('setting-api-key').value = settings.apiKey || '';
        document.getElementById('setting-username').value = settings.username || '';
        document.getElementById('setting-user-avatar').value = settings.userAvatar || '';
        document.getElementById('setting-persona').value = settings.persona || '';
        document.getElementById('setting-summary-prompt').value = settings.summaryPrompt || '';

        if (settings.model) {
            var select = document.getElementById('setting-model');
            select.innerHTML = '<option value="' + settings.model + '" selected>' + settings.model + '</option>';
        }
    }

    return { init: init, navigateTo: navigateTo };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });