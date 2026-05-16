const Chat = (() => {
    let currentConvId = null;
    let isSending = false; // 防止重复发送

    function init() {
        const chars = Store.getChars();
        if (!chars.find(c => c.id === '__model__')) {
            chars.push({
                id: '__model__',
                name: 'AI Assistant',
                avatar: '🤖',
                persona: '',
                systemPrompt: 'You are a helpful AI assistant.',
                createdAt: Date.now()
            });
            Store.saveChars(chars);
        }

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
        document.getElementById('btn-extra').addEventListener('click', showExtraPanel);

        const input = document.getElementById('chat-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        const commentInput = document.getElementById('comment-input');
        if (commentInput) {
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                }
            });
        }
    }

    // ── Contact List ──────────────────────────────────────────────

    function renderContactList() {
        const container = document.getElementById('chat-contacts');
        const convos = Store.getConversations();

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
            let charId = null;

            if (conv.charIds && conv.charIds.length === 1) {
                const char = Store.getChar(conv.charIds[0]);
                if (char) {
                    avatar = char.avatar || '👤';
                    name = char.name || name;
                    charId = char.id;
                }
            } else if (conv.type === 'group') {
                avatar = '👥';
            }

            return `
                <div class="contact-item" data-conv-id="${conv.id}">
                    ${UI.renderAvatar(avatar)}
                    <div class="contact-info">
                        <div class="contact-name">${UI.escapeHtml(name)}</div>
                        <div class="contact-preview">${UI.escapeHtml(conv.lastMessage || 'Start a conversation...')}</div>
                    </div>
                    <div class="contact-meta">
                        <span class="contact-time">${UI.formatTime(conv.lastMessageTime || conv.createdAt)}</span>
                        ${charId ? `<button class="edit-char-btn" data-char-id="${charId}" title="Edit character">✎</button>` : ''}
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.contact-item').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.convId));
        });

        container.querySelectorAll('.edit-char-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showEditCharModal(btn.dataset.charId);
            });
        });
    }

    // ── Edit Char Modal ───────────────────────────────────────────

    function showEditCharModal(charId) {
        const char = Store.getChar(charId);
        if (!char) return;

        UI.showModal(`
            <h3>✎ Edit Character</h3>
            <div class="setting-item">
                <label>Name</label>
                <input type="text" id="edit-char-name" value="${UI.escapeHtml(char.name || '')}">
            </div>
            <div class="setting-item">
                <label>Avatar (emoji or URL)</label>
                <input type="text" id="edit-char-avatar" value="${UI.escapeHtml(char.avatar || '')}">
            </div>
            <div class="setting-item">
                <label>Char Persona / Description</label>
                <textarea id="edit-char-persona" rows="3">${UI.escapeHtml(char.persona || '')}</textarea>
            </div>
            <div class="setting-item">
                <label>System Prompt</label>
                <textarea id="edit-char-system" rows="2">${UI.escapeHtml(char.systemPrompt || '')}</textarea>
            </div>
            <div class="setting-item">
                <label>Your Persona with this Char</label>
                <textarea id="edit-char-user-persona" rows="2"
                    placeholder="Overrides global persona for this char only">${UI.escapeHtml(char.userPersona || '')}</textarea>
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
                <button class="gothic-btn primary" id="btn-save-char">Save</button>
            </div>
        `);

        document.getElementById('btn-save-char').addEventListener('click', () => {
            Store.updateChar(charId, {
                name: document.getElementById('edit-char-name').value.trim(),
                avatar: document.getElementById('edit-char-avatar').value.trim() || '👤',
                persona: document.getElementById('edit-char-persona').value.trim(),
                systemPrompt: document.getElementById('edit-char-system').value.trim(),
                userPersona: document.getElementById('edit-char-user-persona').value.trim()
            });
            UI.closeModal();
            renderContactList();
            UI.toast('Character updated ✦');
        });
    }

    // ── Open Chat ─────────────────────────────────────────────────

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

        document.getElementById('chat-title').textContent = name;
        const avatarEl = document.getElementById('chat-avatar');
        const isUrl = avatar.startsWith('http') || avatar.startsWith('data:');
        if (isUrl) {
            avatarEl.innerHTML = `<img src="${UI.escapeHtml(avatar)}" alt="avatar" onerror="this.parentElement.textContent='👤'">`;
        } else {
            avatarEl.textContent = avatar;
        }

        const msgContainer = document.getElementById('chat-messages');
        if (conv.bgImage) {
            msgContainer.style.backgroundImage = `url(${conv.bgImage})`;
            msgContainer.style.backgroundSize = 'cover';
            msgContainer.style.backgroundPosition = 'center';
        } else {
            msgContainer.style.backgroundImage = '';
        }

        document.getElementById('custom-bubble-style')?.remove();
        if (conv.bubbleCss) {
            const style = document.createElement('style');
            style.id = 'custom-bubble-style';
            style.textContent = conv.bubbleCss;
            document.head.appendChild(style);
        }

        renderMessages();
        App.navigateTo('chat');

        setTimeout(() => {
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }, 100);
    }

    // ── Render Messages ───────────────────────────────────────────

    function renderMessages() {
        if (!currentConvId) return;
        const container = document.getElementById('chat-messages');
        const messages = Store.getMessages(currentConvId);
        const settings = Store.getSettings();

        if (messages.length === 0) {
            container.innerHTML = `<div class="msg-system">— Conversation started —</div>`;
            return;
        }

        container.innerHTML = messages.map((msg, idx) => {
            if (msg.role === 'system') {
                return `<div class="msg-system">${UI.escapeHtml(msg.content)}</div>`;
            }

            const isSelf = msg.senderId === '__user__';
            const avatar = isSelf ? (settings.userAvatar || '😈') : (msg.senderAvatar || '🤖');
            const name = isSelf ? (settings.username || 'User') : (msg.senderName || 'Assistant');

            return `
                <div class="msg-row ${isSelf ? 'self' : 'other'}" data-msg-idx="${idx}">
                    <div class="msg-avatar">${renderMsgAvatar(avatar)}</div>
                    <div class="msg-content">
                        ${!isSelf ? `<div class="msg-sender">${UI.escapeHtml(name)}</div>` : ''}
                        <div class="msg-bubble" data-msg-idx="${idx}">${renderBubbleContent(msg)}</div>
                        <div class="msg-time">${UI.formatFullTime(msg.timestamp)}</div>
                    </div>
                </div>`;
        }).join('');

        // 绑定长按 / 右键菜单
        container.querySelectorAll('.msg-bubble').forEach(bubble => {
            let pressTimer = null;

            bubble.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showMsgMenu(parseInt(bubble.dataset.msgIdx));
            });

            bubble.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    showMsgMenu(parseInt(bubble.dataset.msgIdx));
                }, 500);
            }, { passive: true });

            bubble.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });

            bubble.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        });

        container.scrollTop = container.scrollHeight;
    }

    // ── 消息操作菜单 ──────────────────────────────────────────────

    function showMsgMenu(msgIdx) {
        const messages = Store.getMessages(currentConvId);
        const msg = messages[msgIdx];
        if (!msg) return;

        const isLastAiMsg = msg.senderId !== '__user__' && msgIdx === messages.length - 1;
        const isUserMsg = msg.senderId === '__user__';

        UI.showModal(`
            <h3>💬 Message</h3>
            <div style="
                background: var(--bg-glass);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 10px 14px;
                font-size: 13px;
                color: var(--text-secondary);
                max-height: 80px;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 14px;
                line-height: 1.5;
            ">${UI.escapeHtml((msg.content || '').slice(0, 120))}${msg.content && msg.content.length > 120 ? '…' : ''}</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${isLastAiMsg ? `<button class="gothic-btn full-width" id="btn-msg-reroll">🎲 Reroll (Regenerate)</button>` : ''}
                ${isUserMsg ? `<button class="gothic-btn full-width" id="btn-msg-resend">🔄 Resend & Regenerate</button>` : ''}
                <button class="gothic-btn full-width" id="btn-msg-copy">📋 Copy Text</button>
                <button class="gothic-btn full-width danger" id="btn-msg-delete">🗑️ Delete Message</button>
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
            </div>
        `);

        document.getElementById('btn-msg-copy')?.addEventListener('click', () => {
            navigator.clipboard.writeText(msg.content || '').then(() => {
                UI.closeModal();
                UI.toast('Copied ✦');
            }).catch(() => {
                UI.closeModal();
                UI.toast('Copy failed');
            });
        });

        document.getElementById('btn-msg-delete')?.addEventListener('click', () => {
            const msgs = Store.getMessages(currentConvId);
            msgs.splice(msgIdx, 1);
            Store.saveMessages(currentConvId, msgs);
            UI.closeModal();
            renderMessages();
            UI.toast('Message deleted');
        });

        document.getElementById('btn-msg-reroll')?.addEventListener('click', () => {
            UI.closeModal();
            rerollLastAiMessage();
        });

        document.getElementById('btn-msg-resend')?.addEventListener('click', () => {
            UI.closeModal();
            resendUserMessage(msgIdx);
        });
    }

    // 重新生成最后一条 AI 消息
    async function rerollLastAiMessage() {
        if (!currentConvId || isSending) return;
        const msgs = Store.getMessages(currentConvId);
        // 删掉最后一条 AI 消息
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx] && msgs[lastIdx].senderId !== '__user__') {
            msgs.splice(lastIdx, 1);
            Store.saveMessages(currentConvId, msgs);
        }
        renderMessages();
        await triggerAiReply();
    }

    // 重发用户消息并重新生成 AI 回复
    async function resendUserMessage(msgIdx) {
        if (!currentConvId || isSending) return;
        const msgs = Store.getMessages(currentConvId);
        // 删掉该用户消息之后的所有消息（包括之前的 AI 回复）
        msgs.splice(msgIdx + 1);
        Store.saveMessages(currentConvId, msgs);
        renderMessages();
        await triggerAiReply();
    }

    function renderMsgAvatar(value) {
        if (!value) return '👤';
        const isUrl = value.startsWith('http') || value.startsWith('data:');
        if (isUrl) {
            return `<img src="${UI.escapeHtml(value)}" alt=""
                onerror="this.parentElement.textContent='👤'"
                style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        }
        return UI.escapeHtml(value);
    }

    function renderBubbleContent(msg) {
        switch (msg.type) {
            case 'sticker':
                return `<div class="msg-sticker">${UI.escapeHtml(msg.content)}</div>`;
            case 'transfer':
                return `<div class="msg-special transfer">
                    <span class="special-icon">💸</span>
                    <div><div class="special-title">Transfer</div>
                    <div class="special-desc">${UI.escapeHtml(msg.content)}</div></div>
                </div>`;
            case 'redpacket':
                return `<div class="msg-special redpacket">
                    <span class="special-icon">🧧</span>
                    <div><div class="special-title">Red Packet</div>
                    <div class="special-desc">${UI.escapeHtml(msg.content)}</div></div>
                </div>`;
            case 'location':
                return `<div class="msg-special location">
                    <span class="special-icon">📍</span>
                    <div><div class="special-title">Location</div>
                    <div class="special-desc">${UI.escapeHtml(msg.content)}</div></div>
                </div>`;
            case 'payment':
                return `<div class="msg-special payment">
                    <span class="special-icon">💳</span>
                    <div><div class="special-title">Payment Request</div>
                    <div class="special-desc">${UI.escapeHtml(msg.content)}</div></div>
                </div>`;
            case 'image_desc':
                return `<div class="msg-special image-desc">
                    <span class="special-icon">🖼️</span>
                    <div><div class="special-title">Image</div>
                    <div class="special-desc">${UI.escapeHtml(msg.content)}</div></div>
                </div>`;
            default:
                return formatMsgContent(msg.content);
        }
    }

    function formatMsgContent(content) {
        let html = UI.escapeHtml(content);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>\$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>\$1</em>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // ── 打字指示器 ────────────────────────────────────────────────

    function showTypingIndicator(charName, charAvatar) {
        removeTypingIndicator();
        const msgContainer = document.getElementById('chat-messages');
        const el = document.createElement('div');
        el.className = 'msg-row other';
        el.id = 'typing-indicator';
        el.innerHTML = `
            <div class="msg-avatar">${renderMsgAvatar(charAvatar || '🤖')}</div>
            <div class="msg-content">
                <div class="msg-sender typing-name">${UI.escapeHtml(charName || 'Assistant')}</div>
                <div class="msg-bubble typing-bubble">
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span class="typing-label">正在输入…</span>
                </div>
            </div>`;
        msgContainer.appendChild(el);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        document.getElementById('typing-indicator')?.remove();
    }

    // ── 内联错误卡 ────────────────────────────────────────────────

    function showInlineError(errorMsg) {
        removeTypingIndicator();
        const msgContainer = document.getElementById('chat-messages');
        const el = document.createElement('div');
        el.className = 'msg-error-card';
        el.id = 'msg-error-card';
        el.innerHTML = `
            <span class="msg-error-icon">⚠️</span>
            <div class="msg-error-body">
                <div class="msg-error-title">发送失败</div>
                <div class="msg-error-detail">${UI.escapeHtml(errorMsg)}</div>
            </div>
            <button class="msg-error-retry" id="btn-error-retry">重试</button>`;
        msgContainer.appendChild(el);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        document.getElementById('btn-error-retry')?.addEventListener('click', () => {
            el.remove();
            triggerAiReply();
        });
    }

    function removeInlineError() {
        document.getElementById('msg-error-card')?.remove();
    }

    // ── 发送状态控制 ──────────────────────────────────────────────

    function setSendingState(sending) {
        isSending = sending;
        const btn = document.getElementById('btn-send');
        const input = document.getElementById('chat-input');
        if (!btn) return;
        if (sending) {
            btn.disabled = true;
            btn.textContent = '⏳';
            btn.style.opacity = '0.6';
            if (input) input.disabled = true;
        } else {
            btn.disabled = false;
            btn.textContent = '➤';
            btn.style.opacity = '';
            if (input) {
                input.disabled = false;
                input.focus();
            }
        }
    }

    // ── Send Message ──────────────────────────────────────────────

    async function sendMessage() {
        if (!currentConvId || isSending) return;

        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        removeInlineError();

        input.value = '';
        input.style.height = 'auto';

        const settings = Store.getSettings();

        Store.addMessage(currentConvId, {
            senderId: '__user__',
            senderName: settings.username || 'User',
            senderAvatar: settings.userAvatar || '😈',
            content,
            role: 'user',
            type: 'text'
        });

        renderMessages();
        await triggerAiReply();
    }

    // ── 核心 AI 回复逻辑（sendMessage / reroll / resend 共用）────

    async function triggerAiReply() {
        if (!currentConvId || isSending) return;

        const conv = Store.getConversation(currentConvId);
        if (!conv) return;

        // 获取角色信息用于指示器
        let charName = 'Assistant';
        let charAvatar = '🤖';
        if (conv.charIds && conv.charIds.length === 1) {
            const char = Store.getChar(conv.charIds[0]);
            if (char) {
                charName = char.name;
                charAvatar = char.avatar || '🤖';
            }
        }

        setSendingState(true);
        showTypingIndicator(charName, charAvatar);

        try {
            const apiMessages = AI.buildMessages(currentConvId, conv.charIds || ['__model__']);
            const apiResult = await AI.chatWithUsage(apiMessages);
            const reply = apiResult.content;

            if (apiResult.tokens) {
                Store.addTokenUsage(currentConvId, apiResult.tokens);
            }

            removeTypingIndicator();

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
                const match = reply.match(/^([^:]+):\s*/);
                if (match) {
                    const charName = match[1].trim();
                    const char = (conv.charIds || [])
                        .map(id => Store.getChar(id))
                        .find(c => c && c.name === charName);
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
                role: 'assistant',
                type: 'text'
            });

            renderMessages();
            AI.checkAndSummarize(currentConvId);

        } catch (err) {
            console.error(err);
            // 判断错误类型给出更友好的提示
            let errMsg = err.message || 'Unknown error';
            if (!navigator.onLine) {
                errMsg = '网络已断开，请检查连接后重试';
            } else if (errMsg.includes('401')) {
                errMsg = 'API Key 无效或已过期';
            } else if (errMsg.includes('429')) {
                errMsg = '请求过于频繁，请稍后再试';
            } else if (errMsg.includes('500') || errMsg.includes('502') || errMsg.includes('503')) {
                errMsg = '服务器错误，请稍后重试';
            } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
                errMsg = '无法连接到 API，请检查 API URL 设置';
            }
            showInlineError(errMsg);
            UI.toast('⚠️ ' + errMsg);
        } finally {
            setSendingState(false);
        }
    }

    // ── Special Messages ──────────────────────────────────────────

    function sendSpecialMessage(type, content) {
        if (!currentConvId) return;
        const settings = Store.getSettings();

        Store.addMessage(currentConvId, {
            senderId: '__user__',
            senderName: settings.username || 'User',
            senderAvatar: settings.userAvatar || '😈',
            content,
            role: 'user',
            type
        });

        renderMessages();
    }

    // ── Extra Panel ───────────────────────────────────────────────

    function showExtraPanel() {
        UI.showModal(`
            <h3>⛧ Send</h3>
            <div class="extra-grid">
                <button class="extra-item" data-type="sticker">
                    <span>😄</span><label>Sticker</label>
                </button>
                <button class="extra-item" data-type="redpacket">
                    <span>🧧</span><label>Red Packet</label>
                </button>
                <button class="extra-item" data-type="transfer">
                    <span>💸</span><label>Transfer</label>
                </button>
                <button class="extra-item" data-type="location">
                    <span>📍</span><label>Location</label>
                </button>
                <button class="extra-item" data-type="payment">
                    <span>💳</span><label>Payment</label>
                </button>
                <button class="extra-item" data-type="image_desc">
                    <span>🖼️</span><label>Image</label>
                </button>
            </div>
            <style>
                .extra-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-top: 8px;
                }
                .extra-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 16px 8px;
                    border-radius: 12px;
                    background: var(--bg-glass);
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .extra-item:hover { background: var(--bg-glass-hover); border-color: rgba(120,120,120,0.5); }
                .extra-item span { font-size: 28px; }
                .extra-item label { font-size: 11px; color: var(--text-secondary); cursor: pointer; }
            </style>
        `);

        document.querySelectorAll('.extra-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                UI.closeModal();
                showSpecialInputModal(type);
            });
        });
    }

    function showSpecialInputModal(type) {
        const labels = {
            sticker: { title: 'Send Sticker', placeholder: 'Enter emoji or sticker URL', label: 'Sticker' },
            redpacket: { title: 'Send Red Packet 🧧', placeholder: 'e.g. ¥88.88 — Happy New Year!', label: 'Amount & Message' },
            transfer: { title: 'Send Transfer 💸', placeholder: 'e.g. ¥200.00', label: 'Amount' },
            location: { title: 'Share Location 📍', placeholder: 'e.g. Tokyo Tower, Japan', label: 'Location' },
            payment: { title: 'Payment Request 💳', placeholder: 'e.g. ¥50.00 for dinner', label: 'Details' },
            image_desc: { title: 'Send Image 🖼️', placeholder: 'Describe the image...', label: 'Description' }
        };

        const info = labels[type] || { title: 'Send', placeholder: 'Content', label: 'Content' };

        UI.showModal(`
            <h3>${info.title}</h3>
            <div class="setting-item">
                <label>${info.label}</label>
                <input type="text" id="special-msg-input" placeholder="${info.placeholder}">
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
                <button class="gothic-btn primary" id="btn-send-special">Send</button>
            </div>
        `);

        const input = document.getElementById('special-msg-input');
        input.focus();

        document.getElementById('btn-send-special').addEventListener('click', () => {
            const content = input.value.trim();
            if (!content) { UI.toast('Please enter content'); return; }
            UI.closeModal();
            sendSpecialMessage(type, content);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                                e.preventDefault();
                document.getElementById('btn-send-special')?.click();
            }
        });
    }

    // ── New Chat Modal ────────────────────────────────────────────

    function showNewChatModal() {
        const chars = Store.getChars();

        const charOptions = chars.map(c =>
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
                <div class="char-check-list" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                    ${charOptions || '<p style="color:var(--text-muted);font-size:12px;">No characters yet. Create one below.</p>'}
                </div>
            </div>
            <div class="setting-item" style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                <label>— Or create a new character —</label>
                <input type="text" id="new-char-name" placeholder="Character name" style="margin-top:6px;">
                <input type="text" id="new-char-avatar" placeholder="Avatar emoji or URL" style="margin-top:6px;">
                <textarea id="new-char-persona" placeholder="Character persona / description" rows="3" style="margin-top:6px;"></textarea>
                <textarea id="new-char-system" placeholder="System prompt (optional)" rows="2" style="margin-top:6px;"></textarea>
                <textarea id="new-char-user-persona" placeholder="Your persona with this char (overrides global)" rows="2" style="margin-top:6px;"></textarea>
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
                <button class="gothic-btn primary" id="btn-create-conv">Create</button>
            </div>
            <style>
                .char-check-item {
                    display: flex; align-items: center; gap: 8px; padding: 8px;
                    border-radius: 8px; cursor: pointer; transition: background 0.2s;
                }
                .char-check-item:hover { background: var(--bg-glass-hover); }
                .char-check-item input { accent-color: var(--text-primary); }
                .char-check-item span { font-size: 13px; }
            </style>
        `);

        document.getElementById('btn-create-conv').addEventListener('click', () => {
            const checked = document.querySelectorAll('.char-check-list input:checked');
            const selectedIds = Array.from(checked).map(cb => cb.value);

            const newName = document.getElementById('new-char-name').value.trim();
            if (newName) {
                const newChar = Store.addChar({
                    name: newName,
                    avatar: document.getElementById('new-char-avatar').value.trim() || '👤',
                    persona: document.getElementById('new-char-persona').value.trim(),
                    systemPrompt: document.getElementById('new-char-system').value.trim(),
                    userPersona: document.getElementById('new-char-user-persona').value.trim()
                });
                selectedIds.push(newChar.id);
            }

            if (selectedIds.length === 0) {
                UI.toast('Select at least one character or create a new one');
                return;
            }

            const isGroup = selectedIds.length > 1;
            const convName = isGroup
                ? selectedIds.map(id => { const c = Store.getChar(id); return c ? c.name : 'Unknown'; }).join(', ')
                : (() => { const c = Store.getChar(selectedIds[0]); return c ? c.name : 'Chat'; })();

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

    // ── Chat Menu ─────────────────────────────────────────────────

    function showChatMenu() {
        if (!currentConvId) return;
        const conv = Store.getConversation(currentConvId);

        UI.showModal(`
            <h3>⛧ Chat Options</h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="gothic-btn full-width" id="btn-chat-bg">🖼️ Set Background Image</button>
                <button class="gothic-btn full-width" id="btn-chat-bubble">🎨 Custom Bubble CSS</button>
                <button class="gothic-btn full-width" id="btn-view-summary">📜 View Summary</button>
                <button class="gothic-btn full-width" id="btn-clear-chat">🗑️ Clear Messages</button>
                <button class="gothic-btn full-width" id="btn-delete-chat">☠️ Delete Conversation</button>
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
            </div>
        `);

        document.getElementById('btn-chat-bg').addEventListener('click', () => {
            UI.closeModal();
            UI.showModal(`
                <h3>🖼️ Background Image</h3>
                <div class="setting-item">
                    <label>Image URL</label>
                    <input type="text" id="bg-url-input"
                        placeholder="https://..."
                        value="${UI.escapeHtml(conv.bgImage || '')}">
                </div>
                <div class="modal-btns">
                    <button class="gothic-btn" id="btn-clear-bg">Clear</button>
                    <button class="gothic-btn primary" id="btn-save-bg">Apply</button>
                </div>
            `);
            document.getElementById('btn-save-bg').addEventListener('click', () => {
                const url = document.getElementById('bg-url-input').value.trim();
                Store.updateConversation(currentConvId, { bgImage: url });
                const msgContainer = document.getElementById('chat-messages');
                if (url) {
                    msgContainer.style.backgroundImage = `url(${url})`;
                    msgContainer.style.backgroundSize = 'cover';
                    msgContainer.style.backgroundPosition = 'center';
                } else {
                    msgContainer.style.backgroundImage = '';
                }
                UI.closeModal();
                UI.toast('Background updated');
            });
            document.getElementById('btn-clear-bg').addEventListener('click', () => {
                Store.updateConversation(currentConvId, { bgImage: '' });
                document.getElementById('chat-messages').style.backgroundImage = '';
                UI.closeModal();
                UI.toast('Background cleared');
            });
        });

        document.getElementById('btn-chat-bubble').addEventListener('click', () => {
            UI.closeModal();
            UI.showModal(`
                <h3>🎨 Custom Bubble CSS</h3>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">
                    Target <code>.msg-row.self .msg-bubble</code> and <code>.msg-row.other .msg-bubble</code>
                </p>
                <div class="setting-item">
                    <textarea id="bubble-css-input" rows="6"
                        placeholder=".msg-row.self .msg-bubble { background: rgba(255,0,100,0.3); }"
                        style="font-family:monospace;font-size:12px;">${UI.escapeHtml(conv.bubbleCss || '')}</textarea>
                </div>
                <div class="modal-btns">
                    <button class="gothic-btn" id="btn-clear-bubble">Clear</button>
                    <button class="gothic-btn primary" id="btn-save-bubble">Apply</button>
                </div>
            `);
            document.getElementById('btn-save-bubble').addEventListener('click', () => {
                const css = document.getElementById('bubble-css-input').value;
                Store.updateConversation(currentConvId, { bubbleCss: css });
                document.getElementById('custom-bubble-style')?.remove();
                if (css) {
                    const style = document.createElement('style');
                    style.id = 'custom-bubble-style';
                    style.textContent = css;
                    document.head.appendChild(style);
                }
                UI.closeModal();
                UI.toast('Bubble style applied');
            });
            document.getElementById('btn-clear-bubble').addEventListener('click', () => {
                Store.updateConversation(currentConvId, { bubbleCss: '' });
                document.getElementById('custom-bubble-style')?.remove();
                UI.closeModal();
                UI.toast('Bubble style cleared');
            });
        });

        document.getElementById('btn-view-summary').addEventListener('click', () => {
            const summary = Store.getSummary(currentConvId);
            UI.closeModal();
            UI.showModal(`
                <h3>📜 Conversation Summary</h3>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap;max-height:300px;overflow-y:auto;">
                    ${summary ? UI.escapeHtml(summary) : 'No summary yet. Summary is generated every 30 messages.'}
                </div>
                <div class="modal-btns">
                    <button class="gothic-btn full-width" onclick="UI.closeModal()">Close</button>
                </div>
            `);
        });

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
    }

    // ── Background Message ────────────────────────────────────────

    async function sendBgMessage(charId) {
        var char = Store.getChar(charId);
        if (!char) return;
        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        var convos = Store.getConversations();
        var conv = convos.find(function(c) {
            return c.charIds && c.charIds.length === 1 && c.charIds[0] === charId;
        });
        if (!conv) return;

        var existingMsgs = Store.getMessages(conv.id);
        if (existingMsgs.length === 0) return;

        try {
            var apiMessages = AI.buildMessages(conv.id, [charId]);
            apiMessages.push({
                role: 'user',
                content: '[System: ' + char.name + ' decides to send a proactive message to the user. '
                    + 'This could be sharing something interesting, asking about their day, '
                    + 'reacting to a recent forum post, or just casual conversation. '
                    + 'Stay in character. Do NOT include any system notes in your reply.]'
            });

            var reply = await AI.chat(apiMessages, { temperature: 1.0, max_tokens: 300 });

            Store.addMessage(conv.id, {
                senderId: char.id,
                senderName: char.name,
                senderAvatar: char.avatar || '👤',
                content: reply.trim(),
                role: 'assistant',
                type: 'text'
            });

            Store.addLog({
                level: 'info',
                source: 'chat-bg',
                message: char.name + ' sent a proactive message',
                detail: 'Conv: ' + conv.id + ' | Content: ' + reply.trim().slice(0, 80)
            });

            if (currentConvId === conv.id
                && document.getElementById('page-chat').classList.contains('active')) {
                renderMessages();
            }
            if (document.getElementById('page-chat-list').classList.contains('active')) {
                renderContactList();
            }
        } catch (e) {
            Store.addLog({
                level: 'error',
                source: 'chat-bg',
                message: 'Background message failed for ' + char.name,
                detail: e.message || String(e),
                stack: e.stack || ''
            });
        }
    }

    return {
        init: init,
        renderContactList: renderContactList,
        openChat: openChat,
        getCurrentConvId: function() { return currentConvId; },
        sendBgMessage: sendBgMessage
    };

})();
