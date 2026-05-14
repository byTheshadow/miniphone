const AI = (() => {
    async function fetchModels() {
        const settings = Store.getSettings();
        if (!settings.apiUrl) throw new Error('API URL not set');

        const url = settings.apiUrl.replace(/\/+$/, '') + '/v1/models';
        const headers = {};
        if (settings.apiKey) {
            headers['Authorization'] = 'Bearer ' + settings.apiKey;
        }

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
        if (settings.apiKey) {
            headers['Authorization'] = 'Bearer ' + settings.apiKey;
        }

        const body = {
            model: settings.model,
            messages: messages,
            temperature: options.temperature ?? 0.8,
            max_tokens: options.max_tokens ?? 2048,
            ...options.extra
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

    // Build messages array for a conversation
    function buildMessages(convId, charIds) {
        const settings = Store.getSettings();
        const messages = [];
        const chars = charIds.map(id => Store.getChar(id)).filter(Boolean);

        // System prompt
        let systemPrompt = '';

        if (chars.length === 1&& chars[0].id === '__model__') {
            systemPrompt = 'You are a helpful AI assistant.';
        } else if (chars.length === 1) {
            const c = chars[0];
            systemPrompt = c.systemPrompt || `You are ${c.name}. ${c.persona || ''}`;
        } else {
            // Group chat
            systemPrompt = 'This is a group chat. The following characters are present:\n\n';
            chars.forEach(c => {
                if (c.id !== '__model__') {
                    systemPrompt += `- ${c.name}: ${c.persona || 'No description'}\n`;
                }
            });
            systemPrompt += '\nRespond as the character who is most likely to reply next. Start your message with the character name followed by a colon.';
        }

        if (settings.persona) {
            systemPrompt += `\n\nThe user's persona: ${settings.persona}`;
        }

        // Add summary if exists
        const summary = Store.getSummary(convId);
        if (summary) {
            systemPrompt += `\n\n[Previous conversation summary]: ${summary}`;
        }

        messages.push({ role: 'system', content: systemPrompt });

        // Add recent messages (after last summary point, max 40)
        const allMsgs = Store.getMessages(convId);
        const recentMsgs = allMsgs.slice(-40);

        recentMsgs.forEach(msg => {
            if (msg.role === 'system') {
                // skip system messages in history} else if (msg.senderId === '__user__') {
                messages.push({ role: 'user', content: msg.content });
            } else {
                const charName = msg.senderName || 'Assistant';
                messages.push({ role: 'assistant', content: msg.content });}
        });

        return messages;
    }

    // Check if summary is needed (every 30 messages)
    async function checkAndSummarize(convId) {
        const allMsgs = Store.getMessages(convId);
        const existingSummary = Store.getSummary(convId);

        // Summarize every 30 messages
        if (allMsgs.length > 0 && allMsgs.length % 30 === 0) {
            try {
                const settings = Store.getSettings();
                const msgsToSummarize = allMsgs.slice(-35, -5); // Summarize older messages

                if (msgsToSummarize.length === 0) return;

                const conversationText = msgsToSummarize.map(m => {
                    const name = m.senderName || (m.senderId === '__user__' ? settings.username : 'Assistant');
                    return `${name}: ${m.content}`;
                }).join('\n');

                let prompt = settings.summaryPrompt || Store.getSettings().summaryPrompt;
                prompt = prompt.replace('{{conversation}}', conversationText);

                if (existingSummary) {
                    prompt = `Previous summary:\n${existingSummary}\n\n` + prompt;
                }

                const summary = await chat([
                    { role: 'system', content: 'You are a precise summarizer.' },
                    { role: 'user', content: prompt }
                ], { temperature: 0.3, max_tokens: 500 });

                Store.saveSummary(convId, summary);return summary;
            } catch (e) {
                console.error('Summary failed:', e);
            }
        }
    }

    return { fetchModels, chat, buildMessages, checkAndSummarize };
})();
