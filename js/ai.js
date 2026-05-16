const AI = (() => {
    async function fetchModels() {
        const settings = Store.getSettings();
        if (!settings.apiUrl) throw new Error('API URL not set');

        const url = settings.apiUrl.replace(/\/+$/, '') + '/v1/models';
        const headers = {};
        if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch models: ' + res.status);

        const data = await res.json();
        return (data.data || []).map(function(m) { return m.id; }).sort();
    }

    async function chat(messages, options) {
        options = options || {};
        const settings = Store.getSettings();
        if (!settings.apiUrl) throw new Error('API URL not set');
        if (!settings.model) throw new Error('Model not selected');

        const url = settings.apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

        const body = {
            model: settings.model,
            messages: messages,
            temperature: options.temperature !== undefined ? options.temperature : 0.8,
            max_tokens: options.max_tokens || 2048
        };
        if (options.extra) Object.assign(body, options.extra);

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            throw new Error('API Error ' + res.status + ': ' + errText);
        }

        const data = await res.json();
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }

    async function chatWithUsage(messages, options) {
        options = options || {};
        const settings = Store.getSettings();
        if (!settings.apiUrl) throw new Error('API URL not set');
        if (!settings.model) throw new Error('Model not selected');

        const url = settings.apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

        const body = {
            model: settings.model,
            messages: messages,
            temperature: options.temperature !== undefined ? options.temperature : 0.8,
            max_tokens: options.max_tokens || 2048
        };
        if (options.extra) Object.assign(body, options.extra);

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            throw new Error('API Error ' + res.status + ': ' + errText);
        }

        const data = await res.json();
        return {
            content: (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '',
            tokens: (data.usage && data.usage.total_tokens) || 0
        };
    }

    function buildMessages(convId, charIds) {
        const settings = Store.getSettings();
        const messages = [];
        const chars = charIds.map(function(id) { return Store.getChar(id); }).filter(Boolean);

        // ── System Prompt ──
        var systemPrompt = '';

        if (chars.length === 1 && chars[0].id === '__model__') {
            systemPrompt = 'You are a helpful AI assistant.';
        } else if (chars.length === 1) {
            const c = chars[0];
            systemPrompt = c.systemPrompt ? c.systemPrompt : ('You are ' + c.name + '.');
            if (c.persona) systemPrompt += '\n\n' + c.persona;
        } else {
            systemPrompt = 'This is a group chat. Characters present:\n\n';
            chars.forEach(function(c) {
                if (c.id !== '__model__') {
                    systemPrompt += '- ' + c.name + ': ' + (c.persona || 'No description') + '\n';
                }
            });
            systemPrompt += '\nRespond as the character most likely to reply next. '
                + 'Start your message with the character name followed by a colon, e.g. "Alice: ..."';
        }

        // ── User Persona (char-specific overrides global) ──
        const charUserPersona = chars.length === 1 ? (chars[0].userPersona || '') : '';
        const effectivePersona = charUserPersona || settings.persona || '';
        if (effectivePersona) {
            systemPrompt += '\n\nThe user\'s persona: ' + effectivePersona;
        }

        // ── Conversation Summary ──
        const summary = Store.getSummary(convId);
        if (summary) {
            systemPrompt += '\n\n[Previous conversation summary]:\n' + summary;
        }

        // ── Knowledge Books ──
        const allBooks = Store.getKnowledgeBooks();
        const relevantBooks = allBooks.filter(function(b) {
            return b.global || (charIds.length === 1 && b.charId === charIds[0]);
        });

        if (relevantBooks.length > 0) {
            const allMsgs = Store.getMessages(convId);
            const lastUserMsg = allMsgs.slice().reverse().find(function(m) { return m.senderId === '__user__'; });
            const lastContent = ((lastUserMsg && lastUserMsg.content) || '').toLowerCase();

            var injected = '';
            relevantBooks.forEach(function(book) {
                (book.entries || []).forEach(function(entry) {
                    if (!entry.keyword || lastContent.includes(entry.keyword.toLowerCase())) {
                        injected += '\n- ' + entry.content;
                    }
                });
            });

            if (injected) {
                systemPrompt += '\n\n[World Knowledge]:' + injected;
            }
        }

        messages.push({ role: 'system', content: systemPrompt });

        // ── Message History (last 40) ──
        const allMsgs = Store.getMessages(convId);
        const recentMsgs = allMsgs.slice(-40);

        recentMsgs.forEach(function(msg) {
            if (msg.role === 'system') return;
            if (msg.senderId === '__user__') {
                var content = msg.content;
                if (msg.type && msg.type !== 'text') {
                    const typeLabels = {
                        sticker: '[Sticker]',
                        redpacket: '[Red Packet]',
                        transfer: '[Transfer]',
                        location: '[Location]',
                        payment: '[Payment Request]',
                        image_desc: '[Image]'
                    };
                    content = (typeLabels[msg.type] || '') + ' ' + msg.content;
                }
                messages.push({ role: 'user', content: content });
            } else {
                messages.push({ role: 'assistant', content: msg.content });
            }
        });

        return messages;
    }

    async function checkAndSummarize(convId) {
        const allMsgs = Store.getMessages(convId);
        if (allMsgs.length === 0 || allMsgs.length % 30 !== 0) return;

        try {
            const settings = Store.getSettings();
            const existingSummary = Store.getSummary(convId);
            const msgsToSummarize = allMsgs.slice(-35, -5);
            if (msgsToSummarize.length === 0) return;

            const conversationText = msgsToSummarize.map(function(m) {
                const name = m.senderName || (m.senderId === '__user__' ? (settings.username || 'User') : 'Assistant');
                return name + ': ' + m.content;
            }).join('\n');

            var prompt = settings.summaryPrompt || getDefaultSummaryPrompt();
            prompt = prompt.replace('{{conversation}}', conversationText);

            if (existingSummary) {
                prompt = 'Previous summary:\n' + existingSummary + '\n\n' + prompt;
            }

            const summary = await chat([
                { role: 'system', content: 'You are a precise conversation summarizer.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.3, max_tokens: 500 });

            Store.saveSummary(convId, summary);
            return summary;
        } catch (e) {
            console.error('Summary failed:', e);
        }
    }

    function getDefaultSummaryPrompt() {
        return 'Summarize the following conversation concisely, preserving key facts, character traits, emotional states, and important plot points. Write in third person. Keep it under 300 words.\n\nConversation:\n{{conversation}}\n\nSummary:';
    }

    // ── 导出所有公开函数 ──
    return {
        fetchModels: fetchModels,
        chat: chat,
        chatWithUsage: chatWithUsage,
        buildMessages: buildMessages,
        checkAndSummarize: checkAndSummarize
    };
})();

