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
            // Check for updates on every load
            reg.update();

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available — auto reload
                        UI.toast('New version available, updating...');
                        setTimeout(() => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }, 1000);
                    }
                });
            });
        }).catch(e => console.log('SW registration failed:', e));

        // Reload when new SW takes control
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

        // Update nav highlight
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
                UI.toast(`Found ${models.length} models ✦`);
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

        // Import char JSON
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
                } catch {
                    UI.toast('Invalid JSON file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Export all data
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

        // Import all data
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
                } catch {
                    UI.toast('Invalid backup file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // ── Import Char JSON (fixed) ───────────────────────────────────

    function importCharFromJson(data) {
        let char = {};

        if (data.spec === 'chara_card_v2' || data.data) {
            // V2 format (SillyTavern / TavernAI V2)
            const d = data.data || {};
            char.name = d.name || data.name || 'Unknown';
            char.persona = [d.description, d.personality, d.mes_example]
                .filter(Boolean).join('\n\n');
            char.systemPrompt = d.system_prompt || d.scenario || '';
            char.firstMessage = d.first_mes || '';
            const rawAvatar = data.avatar || d.avatar || '';
            char.avatar = rawAvatar.startsWith('data:') || rawAvatar.startsWith('http')
                ? rawAvatar : '👤';
        } else {
            // V1 / simple format
            char.name = data.name || data.char_name || 'Unknown';
            char.persona = data.description || data.personality || data.persona || '';
            char.systemPrompt = data.system_prompt || data.scenario || '';
            char.firstMessage = data.first_mes || data.greeting || '';
            const rawAvatar = data.avatar || '';
            char.avatar = rawAvatar.startsWith('data:') || rawAvatar.startsWith('http')
                ? rawAvatar : '👤';
        }

        if (!char.name || char.name === 'Unknown') {
            UI.toast('Warning: could not read character name');
        }

        const newChar = Store.addChar(char);

        const conv = Store.addConversation({
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

        UI.toast(`Imported: ${newChar.name} ✦`);
    }

    // ── Knowledge Books UI ────────────────────────────────────────

    function bindKnowledgeBooks() {
        document.getElementById('btn-manage-kb').addEventListener('click', showKnowledgeBooksModal);
    }

    function showKnowledgeBooksModal() {
        renderKBList();
    }

   function renderKBList() {
    const books = Store.getKnowledgeBooks();
    const chars = Store.getChars().filter(c => c.id !== '__model__');

    const booksHtml = books.length === 0
        ? '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px;">No knowledge books yet</p>'
        : books.map(b => `
            <div class="kb-item" style="padding:10px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:13px;font-weight:500;">${UI.escapeHtml(b.name)}</div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                                ${b.global ? '🌐 Global' : '👤 ' + (Store.getChar(b.charId)?.name || 'Unknown char')}
                                · ${(b.entries || []).length} entries
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button class="small-btn kb-edit" data-id="${b.id}">Edit</button>
                            <button class="small-btn kb-delete" data-id="${b.id}" style="border-color:var(--accent-red);">Del</button>
                        </div>
                    </div>
                </div>`).join('');

        const charOptions = chars.map(c =>
            `<option value="${c.id}">${UI.escapeHtml(c.name)}</option>`
        ).join('');

        UI.showModal(`
            <h3>📚 Knowledge Books</h3>
            <div style="max-height:240px;overflow-y:auto;margin-bottom:12px;">
                ${booksHtml}
            </div>
            <div style="border-top:1px solid var(--border-color);padding-top:12px;">
                <div class="setting-item">
                    <label>New Book Name</label>
                    <input type="text" id="kb-new-name" placeholder="e.g. World Lore">
                </div>
                <div class="setting-item">
                    <label>Scope</label>
                    <select id="kb-new-scope">
                        <option value="global">🌐 Global (all chats)</option>
                        ${charOptions ? `<optgroup label="Char-specific">${charOptions}</optgroup>` : ''}
                    </select>
                </div>
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Close</button>
                <button class="gothic-btn primary" id="btn-kb-create">Create Book</button>
            </div>
        `);

        document.getElementById('btn-kb-create').addEventListener('click', () => {
            const name = document.getElementById('kb-new-name').value.trim();
            if (!name) { UI.toast('Enter a book name'); return; }
            const scope = document.getElementById('kb-new-scope').value;
            const isGlobal = scope === 'global';
            Store.addKnowledgeBook({
                name,
                global: isGlobal,
                charId: isGlobal ? null : scope,
                entries: []
            });
            UI.toast(`Book "${name}" created`);
            renderKBList();
        });

        // Edit / Delete buttons
        document.querySelectorAll('.kb-edit').forEach(btn => {
            btn.addEventListener('click', () => showKBEditModal(btn.dataset.id));
        });

        document.querySelectorAll('.kb-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                Store.deleteKnowledgeBook(btn.dataset.id);
                UI.toast('Book deleted');
                renderKBList();
            });
        });
    }

    function showKBEditModal(bookId) {
        const book = Store.getKnowledgeBook(bookId);
        if (!book) return;

        const entriesHtml = (book.entries || []).map((entry, idx) => `
            <div class="kb-entry" data-idx="${idx}" style="display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;">
                <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                    <input type="text" class="kb-entry-keyword" value="${UI.escapeHtml(entry.keyword || '')}"
                        placeholder="Keyword (optional)" style="font-size:12px;">
                    <textarea class="kb-entry-content" rows="2"
                        style="font-size:12px;">${UI.escapeHtml(entry.content || '')}</textarea>
                </div>
                <button class="small-btn kb-entry-del" data-idx="${idx}"
                    style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">✕</button>
            </div>`).join('');

        UI.showModal(`
            <h3>✎ Edit: ${UI.escapeHtml(book.name)}</h3>
            <div id="kb-entries-list" style="max-height:300px;overflow-y:auto;margin-bottom:10px;">
                ${entriesHtml || '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">No entries yet</p>'}
            </div>
            <button class="gothic-btn full-width" id="btn-kb-add-entry" style="margin-bottom:12px;">＋ Add Entry</button>
            <div class="modal-btns">
                <button class="gothic-btn" id="btn-kb-back">← Back</button>
                <button class="gothic-btn primary" id="btn-kb-save">Save</button>
            </div>
        `);

        document.getElementById('btn-kb-back').addEventListener('click', () => renderKBList());

        document.getElementById('btn-kb-add-entry').addEventListener('click', () => {
            const list = document.getElementById('kb-entries-list');
            const idx = list.querySelectorAll('.kb-entry').length;
            const div = document.createElement('div');
            div.className = 'kb-entry';
            div.dataset.idx = idx;
            div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;';
            div.innerHTML = `
                <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                    <input type="text" class="kb-entry-keyword" placeholder="Keyword (optional)" style="font-size:12px;">
                    <textarea class="kb-entry-content" rows="2" style="font-size:12px;"></textarea>
                </div>
                <button class="small-btn kb-entry-del" data-idx="${idx}"
                    style="border-color:var(--accent-red);flex-shrink:0;margin-top:2px;">✕</button>`;
            list.appendChild(div);
            bindEntryDeleteBtns();
        });

        bindEntryDeleteBtns();

        document.getElementById('btn-kb-save').addEventListener('click', () => {
            const entries = [];
            document.querySelectorAll('.kb-entry').forEach(row => {
                const keyword = row.querySelector('.kb-entry-keyword')?.value.trim() || '';
                const content = row.querySelector('.kb-entry-content')?.value.trim() || '';
                if (content) entries.push({ keyword, content });
            });
            Store.updateKnowledgeBook(bookId, { entries });
            UI.toast('Knowledge book saved ✦');
            renderKBList();
        });
    }

    function bindEntryDeleteBtns() {
        document.querySelectorAll('.kb-entry-del').forEach(btn => {
            btn.onclick = () => {
                btn.closest('.kb-entry')?.remove();
            };
        });
    }

    // ── Load Settings into UI ─────────────────────────────────────

    function loadSettings() {
        const settings = Store.getSettings();
        document.getElementById('setting-api-url').value = settings.apiUrl || '';
        document.getElementById('setting-api-key').value = settings.apiKey || '';
        document.getElementById('setting-username').value = settings.username || '';
        document.getElementById('setting-user-avatar').value = settings.userAvatar || '';
        document.getElementById('setting-persona').value = settings.persona || '';
        document.getElementById('setting-summary-prompt').value = settings.summaryPrompt || '';

        if (settings.model) {
            const select = document.getElementById('setting-model');
            select.innerHTML = `<option value="${settings.model}" selected>${settings.model}</option>`;
        }
    }

    return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());

