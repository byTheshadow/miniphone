const Store = (() => {
    const PREFIX = 'mp_';

    function get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.warn('Storage full or error:', e);
        }
    }

    function remove(key) {
        localStorage.removeItem(PREFIX + key);
    }

    // --- Settings ---
    function getSettings() {
        return get('settings', {
            apiUrl: '',
            apiKey: '',
            model: '',
            username: 'User',
            userAvatar: '😈',
            persona: '',
            summaryPrompt: `You are a conversation summarizer. Summarize the following conversation concisely, preserving key facts, character traits, emotional states, and important plot points. Write in third person. Keep it under 300 words.\n\nConversation:\n{{conversation}}\n\nSummary:`
        });
    }

    function saveSettings(s) {
        set('settings', s);
    }

    // --- Characters ---
    function getChars() {
        return get('chars', []);
    }

    function saveChars(chars) {
        set('chars', chars);
    }

    function addChar(char) {
        const chars = getChars();
        char.id = char.id || 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        char.createdAt = char.createdAt || Date.now();
        chars.push(char);
        saveChars(chars);
        return char;
    }

    function getChar(id) {
        return getChars().find(c => c.id === id) || null;
    }

    function updateChar(id, updates) {
        const chars = getChars();
        const idx = chars.findIndex(c => c.id === id);
        if (idx >= 0) {
            chars[idx] = { ...chars[idx], ...updates };
            saveChars(chars);
        }
    }

    function deleteChar(id) {
        saveChars(getChars().filter(c => c.id !== id));
        // Also delete associated chats
        const convos = getConversations();
        convos.forEach(conv => {
            if (conv.charIds && conv.charIds.includes(id) && conv.charIds.length === 1) {
                deleteConversation(conv.id);
            }
        });
    }

    // --- Conversations ---
    function getConversations() {
        return get('conversations', []);
    }

    function saveConversations(convos) {
        set('conversations', convos);
    }

    function addConversation(conv) {
        const convos = getConversations();
        conv.id = conv.id || 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        conv.createdAt = Date.now();
        conv.updatedAt = Date.now();
        convos.unshift(conv);
        saveConversations(convos);
        return conv;
    }

    function getConversation(id) {
        return getConversations().find(c => c.id === id) || null;
    }

    function updateConversation(id, updates) {
        const convos = getConversations();
        const idx = convos.findIndex(c => c.id === id);
        if (idx >= 0) {
            convos[idx] = { ...convos[idx], ...updates, updatedAt: Date.now() };
            saveConversations(convos);
        }
    }

    function deleteConversation(id) {
        saveConversations(getConversations().filter(c => c.id !== id));
        remove('messages_' + id);
        remove('summary_' + id);
    }

    // --- Messages ---
    function getMessages(convId) {
        return get('messages_' + convId, []);
    }

    function saveMessages(convId, msgs) {
        set('messages_' + convId, msgs);
    }

    function addMessage(convId, msg) {
        const msgs = getMessages(convId);
        msg.id = msg.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        msg.timestamp = msg.timestamp || Date.now();
        msgs.push(msg);
        saveMessages(convId, msgs);

        // Update conversation preview
        updateConversation(convId, {
            lastMessage: msg.content.slice(0, 50),
            lastMessageTime: msg.timestamp
        });

        return msg;
    }

    // --- Summaries ---
    function getSummary(convId) {
        return get('summary_' + convId, '');
    }

    function saveSummary(convId, summary) {
        set('summary_' + convId, summary);
    }

    // --- Forum ---
    function getPosts() {
        return get('forum_posts', []);
    }

    function savePosts(posts) {
        set('forum_posts', posts);
    }

    function addPost(post) {
        const posts = getPosts();
        post.id = post.id || 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        post.createdAt = Date.now();
        post.upvotes = 0;
        post.upvotedBy = [];
        post.comments = post.comments || [];
        posts.unshift(post);
        savePosts(posts);
        return post;
    }

    function getPost(id) {
        return getPosts().find(p => p.id === id) || null;
    }

    function updatePost(id, updates) {
        const posts = getPosts();
        const idx = posts.findIndex(p => p.id === id);
        if (idx >= 0) {
            posts[idx] = { ...posts[idx], ...updates };
            savePosts(posts);
        }
    }

    function deletePost(id) {
        savePosts(getPosts().filter(p => p.id !== id));
    }

    // --- Export / Import ---
    function exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(PREFIX)) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }

    function importAll(data) {
        Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith(PREFIX)) {
                localStorage.setItem(key, value);
            }
        });
    }

    return {
        get, set, remove,
        getSettings, saveSettings,
        getChars, saveChars, addChar, getChar, updateChar, deleteChar,
        getConversations, saveConversations, addConversation, getConversation,
        updateConversation, deleteConversation,
        getMessages, saveMessages, addMessage,
        getSummary, saveSummary,
        getPosts, savePosts, addPost, getPost, updatePost, deletePost,
        exportAll, importAll
    };
})();
