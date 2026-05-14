const App = (() => {
    let currentPage = 'home';
    const pageHistory = ['home'];

    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        Chat.init();
        Forum.init();

        bindNavigation();
        bindSettings();
        loadSettings();

        // Register SW
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(e => console.log('SW reg failed:', e));
        }
    }

    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('status-time').textContent = timeStr;document.getElementById('home-clock').textContent = timeStr;
    }

    function bindNavigation() {
        // Nav bar
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                navigateTo(page);
            });
        });

        // Home app icons
        document.querySelectorAll('.home-app').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                navigateTo(page);
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.back;
                navigateTo(target, true);
            });
        });
    }

    function navigateTo(pageId, isBack = false) {
        const prevPage = document.querySelector('.page.active');
        const nextPage = document.getElementById('page-' + pageId);

        if (!nextPage || (prevPage === nextPage)) return;

        // Trigger page-specific renders
        if (pageId === 'chat-list') Chat.renderContactList();
        if (pageId === 'forum-list') Forum.renderPostList();

        // Animate
        if (prevPage) {
            prevPage.classList.remove('active');
            if (!isBack) {
                prevPage.classList.add('slide-out-left');
                setTimeout(() => prevPage.classList.remove('slide-out-left'), 350);
            }
        }

        nextPage.classList.add('active');

        // Update nav bar
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navMap = {
            'home': 'home',
            'chat-list': 'chat-list',
            'chat': 'chat-list',
            'forum-list': 'forum-list',
            'forum-post': 'forum-list',
            'settings': 'settings'
        };
        const navTarget = navMap[pageId] || pageId;
        document.querySelector(`.nav-item[data-page="${navTarget}"]`)?.classList.add('active');

        currentPage = pageId;

        if (!isBack) {
            pageHistory.push(pageId);}
    }

    function bindSettings() {
        document.getElementById('btn-fetch-models').addEventListener('click', async () => {
            // Save URL and key first
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
                UI.toast(`Found ${models.length} models`);
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
            UI.toast('Settings saved✦');
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
                    UI.toast('Character imported ✦');
                } catch (err) {
                    UI.toast('Invalid JSON file');
                }
            };
            reader.readAsText(file);e.target.value = '';
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
                    setTimeout(() => location.reload(), 1000);
                } catch {
                    UI.toast('Invalid backup file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    function importCharFromJson(data) {
        // Support common char card formats (TavernAI, SillyTavern, etc.)
        let char = {};

        if (data.data) {
            // V2 format
            char.name = data.data.name || data.name || 'Unknown';
            char.persona = data.data.description || data.data.personality || '';
            char.systemPrompt = data.data.system_prompt || data.data.scenario || '';
            char.firstMessage = data.data.first_mes || '';
            char.avatar = data.data.avatar || '👤';
        } else {
            // V1 / simple format
            char.name = data.name || data.char_name || 'Unknown';
            char.persona = data.description || data.personality || data.persona || '';
            char.systemPrompt = data.system_prompt || data.scenario || '';
            char.firstMessage = data.first_mes || data.greeting || '';
            char.avatar = data.avatar || '👤';
        }

        Store.addChar(char);

        // Auto-create a conversation
        const chars = Store.getChars();
        const newChar = chars[chars.length - 1];

        const conv = Store.addConversation({
            name: newChar.name,
            charIds: [newChar.id],
            type: 'single'
        });

        // Add first message if exists
        if (char.firstMessage) {
            Store.addMessage(conv.id, {
                senderId: newChar.id,
                senderName: newChar.name,
                senderAvatar: newChar.avatar,
                content: char.firstMessage,
                role: 'assistant'
            });
        }
    }

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

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
