const Chat = (() => {
    let currentConvId = null;

    function init() {
        // Ensure "Model" char exists
        const chars = Store.getChars();
        if (!chars.find(c => c.id === '__model__')) {
            const modelChar = {
                id: '__model__',
                name: 'AI Assistant',
                avatar: '🤖',
                persona: '',
                systemPrompt: 'You are a helpful AI assistant.',
                createdAt: Date.now()
            };
            chars.push(modelChar);
            Store.saveChars(chars);
        }

        // Ensure a default conversation with model exists
        const convos = Store.getConversations();
        if (!convos.find(c => c.charIds && c.charIds.includes('__model__') && c.charIds.length === 1)) {
            Store.addConversation({
                name: 'AI Assistant',
                charIds: ['__model__'],
                type: 'single'
            });
        }

        bindEvents();
    }

    function bindEvents() {
        document.getElementById('btn-new-chat').addEventListener('click', showNewChatModal);
        document.getElementById('btn-send').addEventListener('click', sendMessage);
        document.getElementById('btn-chat-menu').addEventListener('click', showChatMenu);

        const input = document.getElementById('chat-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }

    function renderContactList() {
        const container = document.getElementById('chat-contacts');
        const convos = Store.getConversations();
        const settings = Store.getSettings();

        if (convos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💀</div>
                    <p>No conversations yet</p>
                </div>`;
            return;
        }

        container.innerHTML = convos.map(conv => {
            let avatar = '💬';
            let name = conv.name || 'Chat';

            if (conv.charIds && conv.charIds.length === 1) {
                const char = Store.getChar(conv.charIds[0]);
                if (char) {
                    avatar = char.avatar || '👤';
                    name = char.name || name;
                }
            } else if (conv.type === 'group') {
                avatar = '👥';
            }

            return `
                <div class="contact-item" data-conv-id="${conv.id}">
                    ${UI.renderAvatar(avatar)}
                    <div class="contact-info">
                        <div class="contact-name">${UI.escapeHtml(name)}</div>
                        <div class="contact-preview">${UI.escapeHtml(conv.lastMessage ||'Start a conversation...')}</div>
                    </div>
                    <div class="contact-meta">
                        <span class="contact-time">${UI.formatTime(conv.lastMessageTime || conv.createdAt)}</span></div>
                </div>`;
        }).join('');

        container.querySelectorAll('.contact-item').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.convId));
        });
    }

    function openChat(convId) {
        currentConvId = convId;
        const conv = Store.getConversation(convId);
        if (!conv) return;

        let avatar = '💬';
        let name = conv.name || 'Chat';

        if (conv.charIds && conv.charIds.length === 1) {
            const char = Store.getChar(conv.charIds[0]);
            if (char) {
                avatar = char.avatar || '👤';
                name = char.name || name;
            }
        } else if (conv.type === 'group') {
            avatar = '👥';
        }

        // Set header
        document.getElementById('chat-title').textContent = name;
        const avatarEl = document.getElementById('chat-avatar');
        const isUrl = avatar.startsWith('http') || avatar.startsWith('data:');
        if (isUrl) {
            avatarEl.innerHTML = `<img src="${UI.escapeHtml(avatar)}" alt="avatar" onerror="this.parentElement.textContent='👤'">`;
        } else {
            avatarEl.textContent = avatar;
        }

        renderMessages();
        App.navigateTo('chat');

        // Scroll to bottom
        setTimeout(() => {
            const msgContainer = document.getElementById('chat-messages');
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }, 100);
    }

    function renderMessages() {
        if (!currentConvId) return;
        const container = document.getElementById('chat-messages');
        const messages = Store.getMessages(currentConvId);
        const settings = Store.getSettings();

        if (messages.length === 0) {
            container.innerHTML = `<div class="msg-system">— Conversation started —</div>`;
            return;
        }

        container.innerHTML = messages.map(msg => {
            if (msg.role === 'system') {
                return `<div class="msg-system">${UI.escapeHtml(msg.content)}</div>`;
            }

            const isSelf = msg.senderId === '__user__';
            const avatar = isSelf ? (settings.userAvatar || '😈') : (msg.senderAvatar || '🤖');
            const name = isSelf ? settings.username : (msg.senderName || 'Assistant');

            return `
                <div class="msg-row ${isSelf ? 'self' : 'other'}">
                    <div class="msg-avatar">${renderMsgAvatar(avatar)}</div>
                    <div class="msg-content">
                        ${!isSelf ? `<div class="msg-sender">${UI.escapeHtml(name)}</div>` : ''}
                        <div class="msg-bubble">${formatMsgContent(msg.content)}</div>
                        <div class="msg-time">${UI.formatFullTime(msg.timestamp)}</div>
                    </div>
                </div>`;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function renderMsgAvatar(value) {
        if (!value) return '👤';
        const isUrl = value.startsWith('http') || value.startsWith('data:');
        if (isUrl) {
            return `<img src="${UI.escapeHtml(value)}" alt="" onerror="this.parentElement.textContent='👤'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        }
        return UI.escapeHtml(value);
    }

    function formatMsgContent(content) {
        // Basic markdown-like formatting
        let html = UI.escapeHtml(content);
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    async function sendMessage() {
        if (!currentConvId) return;

        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        input.style.height = 'auto';

        const settings = Store.getSettings();
        const conv = Store.getConversation(currentConvId);

        // Add user message
        Store.addMessage(currentConvId, {
            senderId: '__user__',
            senderName: settings.username || 'User',
            senderAvatar: settings.userAvatar || '😈',
            content: content,
            role: 'user'
        });

        renderMessages();

        // Show typing indicator
        const msgContainer = document.getElementById('chat-messages');
        const typingEl = document.createElement('div');
        typingEl.className = 'msg-row other';
        typingEl.id = 'typing-indicator';

        let typingAvatar = '🤖';
        if (conv.charIds && conv.charIds.length === 1) {
            const char = Store.getChar(conv.charIds[0]);
            if (char) typingAvatar = char.avatar || '🤖';
        }

        typingEl.innerHTML = `
            <div class="msg-avatar">${renderMsgAvatar(typingAvatar)}</div>
            <div class="msg-content">
                <div class="msg-bubble">
                    <div class="typing-indicator"><span></span><span></span><span></span></div>
                </div>
            </div>`;
        msgContainer.appendChild(typingEl);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        try {
            const apiMessages = AI.buildMessages(currentConvId, conv.charIds || ['__model__']);
            const reply = await AI.chat(apiMessages);

            // Remove typing indicator
            typingEl.remove();

            // Determine sender
            let senderName = 'Assistant';
            let senderAvatar = '🤖';
            let senderId = '__model__';

            if (conv.charIds && conv.charIds.length === 1) {
                const char = Store.getChar(conv.charIds[0]);
                if (char) {
                    senderName = char.name;
                    senderAvatar = char.avatar || '🤖';
                    senderId = char.id;
                }
            } else if (conv.type === 'group') {
                // Try to parse character name from response
                const match = reply.match(/^([^:]+):\s*/);
                if (match) {
                    const charName = match[1].trim();
                    const char = (conv.charIds || []).map(id => Store.getChar(id)).find(c => c && c.name === charName);
                    if (char) {
                        senderName = char.name;
                        senderAvatar = char.avatar || '🤖';
                        senderId = char.id;
                    }
                }
            }

            Store.addMessage(currentConvId, {
                senderId,
                senderName,
                senderAvatar,
                content: reply,
                role: 'assistant'
            });

            renderMessages();// Check if summary needed
            AI.checkAndSummarize(currentConvId);

        } catch (err) {
            typingEl.remove();
            UI.toast('Error: ' + err.message);
            console.error(err);
        }
    }

    function showNewChatModal() {
        const chars = Store.getChars();

        let charOptions = chars.map(c =>
            `<label class="char-check-item">
                <input type="checkbox" value="${c.id}">
                ${UI.renderAvatar(c.avatar, 24)}
                <span>${UI.escapeHtml(c.name)}</span>
            </label>`
        ).join('');

        UI.showModal(`
            <h3>⛧ New Conversation</h3>
            <div class="setting-item">
                <label>Select characters:</label>
                <div class="char-check-list" style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                    ${charOptions || '<p style="color:var(--text-muted);font-size:12px;">No characters yet. Create one or import a JSON.</p>'}
                </div>
            </div>
            <div class="setting-item" style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                <label>— Or create a new character —</label>
                <input type="text" id="new-char-name" placeholder="Character name" style="margin-top:6px;">
                <input type="text" id="new-char-avatar" placeholder="Avatar emoji or URL" style="margin-top:6px;">
                <textarea id="new-char-persona" placeholder="Character persona / description" rows="3" style="margin-top:6px;"></textarea>
                <textarea id="new-char-system" placeholder="System prompt (optional)" rows="2" style="margin-top:6px;"></textarea>
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
                <button class="gothic-btn primary" id="btn-create-conv">Create</button>
            </div><style>
                .char-check-item {
                    display: flex; align-items: center; gap: 8px; padding: 8px;
                    border-radius: 8px; cursor: pointer; transition: background 0.2s;
                }
                .char-check-item:hover { background: var(--accent-dim); }
                .char-check-item input { accent-color: var(--accent); }
                .char-check-item span { font-size: 13px; }
            </style>
        `);

        document.getElementById('btn-create-conv').addEventListener('click', () => {
            const checked = document.querySelectorAll('.char-check-list input:checked');
            const selectedIds = Array.from(checked).map(cb => cb.value);

            // Check if creating new char
            const newName = document.getElementById('new-char-name').value.trim();
            if (newName) {
                const newChar = Store.addChar({
                    name: newName,
                    avatar: document.getElementById('new-char-avatar').value.trim() || '👤',
                    persona: document.getElementById('new-char-persona').value.trim(),
                    systemPrompt: document.getElementById('new-char-system').value.trim()
                });
                selectedIds.push(newChar.id);
            }

            if (selectedIds.length === 0) {
                UI.toast('Select at least one character or create a new one');
                return;
            }

            const isGroup = selectedIds.length > 1;
            let convName = '';

            if (isGroup) {
                const names = selectedIds.map(id => {
                    const c = Store.getChar(id);
                    return c ? c.name : 'Unknown';
                });
                convName = names.join(', ');
            } else {
                const c = Store.getChar(selectedIds[0]);
                convName = c ? c.name : 'Chat';
            }

            const conv = Store.addConversation({
                name: convName,
                charIds: selectedIds,
                type: isGroup ? 'group' : 'single'
            });

            UI.closeModal();
            renderContactList();
            openChat(conv.id);
        });
    }

    function showChatMenu() {
        if (!currentConvId) return;
        const conv = Store.getConversation(currentConvId);

        UI.showModal(`
            <h3>⛧ Chat Options</h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="gothic-btn full-width" id="btn-clear-chat">🗑️ Clear Messages</button>
                <button class="gothic-btn full-width" id="btn-delete-chat">☠️ Delete Conversation</button>
                <button class="gothic-btn full-width" id="btn-view-summary">📜 View Summary</button>
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
            </div>`);

        document.getElementById('btn-clear-chat').addEventListener('click', () => {
            Store.saveMessages(currentConvId, []);
            Store.saveSummary(currentConvId, '');
            renderMessages();
            UI.closeModal();
            UI.toast('Messages cleared');
        });

        document.getElementById('btn-delete-chat').addEventListener('click', () => {
            Store.deleteConversation(currentConvId);
            currentConvId = null;
            UI.closeModal();
            renderContactList();
            App.navigateTo('chat-list');
            UI.toast('Conversation deleted');
        });

        document.getElementById('btn-view-summary').addEventListener('click', () => {
            const summary = Store.getSummary(currentConvId);
            UI.closeModal();
            UI.showModal(`
                <h3>📜 Conversation Summary</h3>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap;">${summary ? UI.escapeHtml(summary) : 'No summary yet. Summary is generated every 30 messages.'}</div><div class="modal-btns">
                    <button class="gothic-btn" onclick="UI.closeModal()">Close</button>
                </div>
            `);
        });
    }

    return { init, renderContactList, openChat, currentConvId: () => currentConvId };
})();
