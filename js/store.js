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
            console.warn('Storage error:', e);
        }
    }

    function remove(key) {
        localStorage.removeItem(PREFIX + key);
    }

    // ── Settings ──────────────────────────────────────────────────

    function getSettings() {
    return get('settings', {
        apiUrl: '',
        apiKey: '',
        model: '',
        username: 'User',
        userAvatar: '😈',
        persona: '',
        summaryPrompt: `Summarize the following conversation concisely, preserving key facts, character traits, emotional states, and important plot points. Write in third person. Keep it under 300 words.\n\nConversation:\n{{conversation}}\n\nSummary:`,
        forumPrompt: ''
    });
}

    function saveSettings(s) {
        set('settings', s);
    }

    // ── Characters ────────────────────────────────────────────────

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
        getConversations().forEach(conv => {
            if (conv.charIds && conv.charIds.includes(id) && conv.charIds.length === 1) {
                deleteConversation(conv.id);
            }
        });
    }

    // ── Conversations ─────────────────────────────────────────────

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

    // ── Messages ──────────────────────────────────────────────────

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
        updateConversation(convId, {
            lastMessage: msg.content.slice(0, 50),
            lastMessageTime: msg.timestamp
        });
        return msg;
    }

    // ── Summaries ─────────────────────────────────────────────────

    function getSummary(convId) {
        return get('summary_' + convId, '');
    }

    function saveSummary(convId, summary) {
        set('summary_' + convId, summary);
    }

    // ── Forum ─────────────────────────────────────────────────────

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

    // ── Knowledge Books ───────────────────────────────────────────

    function getKnowledgeBooks() {
        return get('knowledge_books', []);
    }

    function saveKnowledgeBooks(books) {
        set('knowledge_books', books);
    }

    function addKnowledgeBook(book) {
        const books = getKnowledgeBooks();
        book.id = book.id || 'kb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        book.createdAt = Date.now();
        book.entries = book.entries || [];
        books.push(book);
        saveKnowledgeBooks(books);
        return book;
    }

    function getKnowledgeBook(id) {
        return getKnowledgeBooks().find(b => b.id === id) || null;
    }

    function updateKnowledgeBook(id, updates) {
        const books = getKnowledgeBooks();
        const idx = books.findIndex(b => b.id === id);
        if (idx >= 0) {
            books[idx] = { ...books[idx], ...updates };
            saveKnowledgeBooks(books);
        }
    }

    function deleteKnowledgeBook(id) {
        saveKnowledgeBooks(getKnowledgeBooks().filter(b => b.id !== id));
    }

    // ── Export / Import ───────────────────────────────────────────

    function exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
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
    // ===== 在Store模块内部（return 之前）添加以下内容 =====

// --- NPC Pool ---
function getNpcPool() {
    const raw = localStorage.getItem('mp_npc_pool');
    return raw ? JSON.parse(raw) : [];
}
function saveNpcPool(arr) {
    localStorage.setItem('mp_npc_pool', JSON.stringify(arr));
}
function addNpc(obj) {
    const pool = getNpcPool();
    const npc = Object.assign({
        id: 'npc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: 'Stranger',
        avatar: '\uD83D\uDC64',
        persona: '',
        createdAt: Date.now()
    }, obj);
    pool.push(npc);
    saveNpcPool(pool);return npc;
}
function getRandomNpc() {
    const pool = getNpcPool();
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

// --- Anon Reveal Tracking ---
function getAnonReveals() {
    const raw = localStorage.getItem('mp_anon_reveals');
    if (!raw) return { date: '', count: 0 };
    const obj = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (obj.date !== today) return { date: today, count: 0 };
    return obj;
}
function useAnonReveal() {
    const today = new Date().toISOString().slice(0, 10);
    const reveals = getAnonReveals();
    if (reveals.date !== today) {
        reveals.date = today;
        reveals.count = 0;
    }
    if (reveals.count >= 3) return false;
    reveals.count++;
    localStorage.setItem('mp_anon_reveals', JSON.stringify(reveals));
    return true;
}
function getAnonRevealCount() {
    const reveals = getAnonReveals();
    const today = new Date().toISOString().slice(0, 10);
    if (reveals.date !== today) return 0;
    return reveals.count;
}
// --- Error Log ---
function getLogs() {
    return get('error_logs', []);
}
function saveLogs(arr) {
    set('error_logs', arr);
}
function addLog(entry) {
    var logs = getLogs();
    var logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
        level: entry.level || 'error',
        source: entry.source || 'unknown',
        message: entry.message || '',
        detail: entry.detail || '',
        stack: entry.stack || ''
    };
    logs.unshift(logEntry);
    // Keep max 200 logs
    if (logs.length > 200) logs = logs.slice(0, 200);
    saveLogs(logs);
    return logEntry;
}
function clearLogs() {
    saveLogs([]);
}

// --- Background Task Settings ---
function getBgSettings() {
    return get('bg_settings', {
        enabled: false,
        forumPostInterval: 180,
        forumPostChance: 50,
        forumReplyChance: 50,
        chatMessageEnabled: false,
        chatMessageInterval: 300,
        chatMessageChance: 30
    });
}
function saveBgSettings(s) {
    set('bg_settings', s);
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
        getKnowledgeBooks, saveKnowledgeBooks, addKnowledgeBook,
        getKnowledgeBook, updateKnowledgeBook, deleteKnowledgeBook,
        exportAll, importAll, getNpcPool, saveNpcPool, addNpc, getRandomNpc,getAnonReveals, useAnonReveal, getAnonRevealCount,getLogs, saveLogs, addLog, clearLogs,
getBgSettings, saveBgSettings,

    };
})();

