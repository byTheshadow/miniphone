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
        return (data.data || []).map(m => m.id).sort();
    }

    async function chat(messages, options = {}) {
        const settings = Store.getSettings();
        if (!settings.apiUrl) throw new Error('API URL not set');
        if (!settings.model) throw new Error('Model not selected');

        const url = settings.apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
        const headers = {
            'Content-Type': 'application/json'
        };
        if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

        const body = {
            model: settings.model,
            messages,
            temperature: options.temperature ?? 0.8,
            max_tokens: options.max_tokens ?? 2048,
            ...(options.extra || {})
        };

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    }

    function buildMessages(convId, charIds) {
        const settings = Store.getSettings();
        const messages = [];
        const chars = charIds.map(id => Store.getChar(id)).filter(Boolean);

        // ── System Prompt ──
        let systemPrompt = '';

        if (chars.length === 1 && chars[0].id === '__model__') {
            systemPrompt = 'You are a helpful AI assistant.';
        } else if (chars.length === 1) {
            const c = chars[0];
            systemPrompt = c.systemPrompt
                ? c.systemPrompt
                : `You are ${c.name}.`;
            if (c.persona) systemPrompt += `\n\n${c.persona}`;
        } else {
            systemPrompt = 'This is a group chat. Characters present:\n\n';
            chars.forEach(c => {
                if (c.id !== '__model__') {
                    systemPrompt += `- ${c.name}: ${c.persona || 'No description'}\n`;
                }
            });
            systemPrompt += '\nRespond as the character most likely to reply next. '
                + 'Start your message with the character name followed by a colon, e.g. "Alice: ..."';
        }

        // ── User Persona (char-specific overrides global) ──
        const charUserPersona = chars.length === 1 ? (chars[0].userPersona || '') : '';
        const effectivePersona = charUserPersona || settings.persona || '';
        if (effectivePersona) {
            systemPrompt += `\n\nThe user's persona: ${effectivePersona}`;
        }

        // ── Conversation Summary ──
        const summary = Store.getSummary(convId);
        if (summary) {
            systemPrompt += `\n\n[Previous conversation summary]:\n${summary}`;
        }

        // ── Knowledge Books ──
        const allBooks = Store.getKnowledgeBooks();
        const relevantBooks = allBooks.filter(b =>
            b.global || (charIds.length === 1 && b.charId === charIds[0])
        );

        if (relevantBooks.length > 0) {
            // Get last user message for keyword matching
            const allMsgs = Store.getMessages(convId);
            const lastUserMsg = [...allMsgs].reverse().find(m => m.senderId === '__user__');
            const lastContent = (lastUserMsg?.content || '').toLowerCase();

            let injected = '';
            relevantBooks.forEach(book => {
                (book.entries || []).forEach(entry => {
                    // Inject if no keyword, or keyword found in last message
                    if (!entry.keyword || lastContent.includes(entry.keyword.toLowerCase())) {
                        injected += `\n- ${entry.content}`;
                    }
                });
            });

            if (injected) {
                systemPrompt += `\n\n[World Knowledge]:${injected}`;
            }
        }

        messages.push({ role: 'system', content: systemPrompt });

        // ── Message History (last 40) ──
        const allMsgs = Store.getMessages(convId);
        const recentMsgs = allMsgs.slice(-40);

        recentMsgs.forEach(msg => {
            if (msg.role === 'system') return;
            if (msg.senderId === '__user__') {
                // Include special message types as descriptive text
                let content = msg.content;
                if (msg.type && msg.type !== 'text') {
                    const typeLabels = {
                        sticker: '[Sticker]',
                        redpacket: '[Red Packet]',
                        transfer: '[Transfer]',
                        location: '[Location]',
                        payment: '[Payment Request]',
                        image_desc: '[Image]'
                    };
                    content = `${typeLabels[msg.type] || ''} ${msg.content}`;
                }
                messages.push({ role: 'user', content });
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

            const conversationText = msgsToSummarize.map(m => {
                const name = m.senderName || (m.senderId === '__user__' ? (settings.username || 'User') : 'Assistant');
                return `${name}: ${m.content}`;
            }).join('\n');

            let prompt = settings.summaryPrompt || getDefaultSummaryPrompt();
            prompt = prompt.replace('{{conversation}}', conversationText);

            if (existingSummary) {
                prompt = `Previous summary:\n${existingSummary}\n\n` + prompt;
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
        return `Summarize the following conversation concisely, preserving key facts, character traits, emotional states, and important plot points. Write in third person. Keep it under 300 words.\n\nConversation:\n{{conversation}}\n\nSummary:`;
    }

    return { fetchModels, chat, buildMessages, checkAndSummarize };
})();
