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

    // ── Meta System Prompt ────────────────────────────────────────
    // 告诉 AI 它在手机聊天 app 里，以及所有可用的特殊消息指令
        var META_CHAT_PROMPT = [
        'IMPORTANT CONTEXT: You are roleplaying as a character in a mobile chat app, communicating with the user via text messages — just like WeChat, LINE, or iMessage.',
        'You are ONLINE and chatting in real-time. The user is on the other end of the screen right now.',
        '',
        'MULTI-BUBBLE: You can send multiple separate messages (each becomes its own chat bubble) by separating them with a line containing only: ---',
        'Example:',
        '  Haha are you serious right now',
        '  ---',
        '  [sticker:\uD83D\uDE2D]',
        '  ---',
        '  ok fine I\'ll come pick you up',
        '',
        'You may also send special message types by including ONE of the following tags ALONE on its own line:',
        '  [sticker:EMOJI]              — send an emoji sticker, e.g. [sticker:\uD83D\uDE18]',
        '  [redpacket:AMOUNT:MESSAGE]   — send a red packet, e.g. [redpacket:\uFFE5188:\u751F\u65E5\u5FEB\u4E50]',
        '  [transfer:AMOUNT:NOTE]       — send a money transfer, e.g. [transfer:\uFFE5200:\u8BF7\u5403\u996D]',
        '  [location:PLACE_NAME]        — share a location, e.g. [location:\u4E0A\u6D77\u5916\u6EE9]',
        '  [payment:AMOUNT:REASON]      — request payment, e.g. [payment:\uFFE550:\u4ECA\u665A\u7684\u996D\u9177]',
        '  [image:DESCRIPTION]          — send an image (described), e.g. [image:\u6211\u5728\u548C\u732B\u548C\u5C45\uFF0C\u5B83\u5C31\u8D74\u5728\u6211\u8138\u4E0A]',
        '',
        'Rules:',
        '- Use --- to split into multiple bubbles when it feels natural (like real texting: short bursts, reactions, follow-ups).',
        '- A special tag must be on its own line within its bubble segment.',
        '- Never explain or describe the tag — just send it naturally.',
        '- Do NOT use special tags in every message. Use them sparingly and naturally.',
        '- Keep individual bubbles short and conversational. Avoid walls of text in one bubble.'
    ].join('\n');


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

        // ── 注入 Meta Chat Prompt（非纯 AI Assistant 模式才注入）──
        if (!(chars.length === 1 && chars[0].id === '__model__')) {
            systemPrompt += '\n\n' + META_CHAT_PROMPT;
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
                // 把特殊消息类型转成 AI 能理解的格式
                if (msg.type && msg.type !== 'text') {
                    const typeMap = {
                        sticker:    '[sticker:' + msg.content + ']',
                        redpacket:  '[redpacket:' + msg.content + ']',
                        transfer:   '[transfer:' + msg.content + ']',
                        location:   '[location:' + msg.content + ']',
                        payment:    '[payment:' + msg.content + ']',
                        image_desc: '[image:' + msg.content + ']'
                    };
                    content = typeMap[msg.type] || ('[' + msg.type + ':' + msg.content + ']');
                }
                messages.push({ role: 'user', content: content });
            } else {
                // AI 发出的特殊消息，也还原成指令格式让 AI 知道它之前发过什么
                var content = msg.content;
                if (msg.type && msg.type !== 'text') {
                    const typeMap = {
                        sticker:    '[sticker:' + msg.content + ']',
                        redpacket:  '[redpacket:' + msg.content + ']',
                        transfer:   '[transfer:' + msg.content + ']',
                        location:   '[location:' + msg.content + ']',
                        payment:    '[payment:' + msg.content + ']',
                        image_desc: '[image:' + msg.content + ']'
                    };
                    content = typeMap[msg.type] || ('[' + msg.type + ':' + msg.content + ']');
                }
                messages.push({ role: 'assistant', content: content });
            }
        });

        return messages;
    }

    // ── 解析 AI 回复，拆出特殊消息指令 ──────────────────────────
    // 返回 Array<{ type: string, content: string }>
    // type 为 'text' 时 content 是普通文字，其他为特殊消息类型
        // ── 解析 AI 回复，拆出多气泡 + 特殊消息指令 ─────────────────
    // 返回 Array<{ type: string, content: string }>
    function parseReply(rawReply) {
        if (!rawReply) return [];

        // 第一步：按 --- 分隔符拆成多个气泡段
        // 支持 \n---\n 或行首 --- 单独一行
        var segments = rawReply
            .split(/\n\s*---\s*\n|\n\s*---\s*$|^\s*---\s*\n/m)
            .map(function(s) { return s.trim(); })
            .filter(function(s) { return s.length > 0; });

        if (segments.length === 0) return [];

        var parts = [];

        segments.forEach(function(segment) {
            // 第二步：每个段内检查是否是纯特殊指令
            var specialMatch = segment.match(/^\[(sticker|redpacket|transfer|location|payment|image):([^\]]+)\]$/);
            if (specialMatch) {
                var msgType = specialMatch[1] === 'image' ? 'image_desc' : specialMatch[1];
                parts.push({ type: msgType, content: specialMatch[2] });
                return;
            }

            // 第三步：段内可能混有特殊指令（指令单独一行）
            var specialPattern = /\[(sticker|redpacket|transfer|location|payment|image):([^\]]+)\]/g;
            var lastIndex = 0;
            var match;
            var hasSpecial = false;

            while ((match = specialPattern.exec(segment)) !== null) {
                hasSpecial = true;
                var before = segment.slice(lastIndex, match.index).trim();
                if (before) {
                    parts.push({ type: 'text', content: before });
                }
                var msgType = match[1] === 'image' ? 'image_desc' : match[1];
                parts.push({ type: msgType, content: match[2] });
                lastIndex = match.index + match[0].length;
            }

            if (hasSpecial) {
                var remaining = segment.slice(lastIndex).trim();
                if (remaining) {
                    parts.push({ type: 'text', content: remaining });
                }
            } else {
                // 纯文字段，直接作为一个气泡
                parts.push({ type: 'text', content: segment });
            }
        });

        return parts.filter(function(p) { return p.content && p.content.trim(); });
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

    return {
        fetchModels: fetchModels,
        chat: chat,
        chatWithUsage: chatWithUsage,
        buildMessages: buildMessages,
        parseReply: parseReply,
        checkAndSummarize: checkAndSummarize
    };
})();


