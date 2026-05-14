const Forum = (() => {
    let currentPostId = null;
    let autoPostTimer = null;
    let currentBoard = 'all';

    const BOARDS = [
        { id: 'all',name: 'All',     icon: '\u2726' },
        { id: 'game',   name: 'Gaming',  icon: '\u2694' },
        { id: 'gossip', name: 'Gossip',  icon: '\u263E' },
        { id: 'news',   name: 'News',    icon: '\u2620' },
        { id: 'story',  name: 'Stories', icon: '\u270E' },
        { id: 'social', name: 'Social',  icon: '\u2661' }
    ];

    // Random NPC name pools
    const NPC_NAMES = [
        'Wraith','Nyx','Obsidian','Hollow','Vesper','Shade','Grimm',
        'Phantom','Cinder','Raven','Dusk','Ember','Void','Specter',
        'Onyx','Thorn','Mist','Echo','Veil','Ash','Sable','Gloom',
        'Nocturne','Bane','Wisp','Murk','Dirge','Hex','Bleak','Rue'
    ];
    const NPC_AVATARS = [
        '\uD83D\uDC7B','\uD83D\uDDA4','\uD83D\uDD73','\u2620\uFE0F',
        '\uD83C\uDF11','\uD83E\uDDA7','\uD83D\uDC80','\uD83C\uDF0C',
        '\uD83D\uDD6F','\uD83E\uDDB4','\uD83C\uDF2B','\u26B0\uFE0F',
        '\uD83D\uDC41','\uD83E\uDDA2','\uD83D\uDC3A','\uD83E\uDD89'
    ];

    function init() {
        renderTabBar();
        bindEvents();
        startAutoPosting();
    }

    function bindEvents() {
        document.getElementById('btn-new-post').addEventListener('click', showNewPostModal);
        document.getElementById('btn-comment').addEventListener('click', submitComment);
        document.getElementById('btn-post-menu').addEventListener('click', showPostMenu);

        const commentInput = document.getElementById('comment-input');
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment();
            }
        });
    }

    //========================
    //  Tab Bar
    // ========================
    function renderTabBar() {
        const bar = document.getElementById('forum-tab-bar');
        bar.innerHTML = BOARDS.map(b =>
            '<div class="forum-tab' + (b.id === currentBoard ? ' active' : '') + '" data-board="' + b.id + '">'
            + b.icon + ' ' + b.name + '</div>'
        ).join('');

        bar.querySelectorAll('.forum-tab').forEach(el => {
            el.addEventListener('click', () => {
                currentBoard = el.dataset.board;
                bar.querySelectorAll('.forum-tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                renderPostList();
            });
        });
    }

    // ========================
    //  Post List
    // ========================
    function renderPostList() {
        const container = document.getElementById('forum-posts');
        let posts = Store.getPosts();

        // Filter by board
        if (currentBoard !== 'all') {
            posts = posts.filter(p => p.board === currentBoard);
        }

        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state">'
                + '<div class="empty-icon">\u26E7</div>'
                + '<p>The forum is silent... for now</p>'
                + '</div>';
            return;
        }

        const now = Date.now();
        const ONE_HOUR = 3600000;

        container.innerHTML = posts.map(post => {
            const isUpvoted = post.upvotedBy && post.upvotedBy.includes('__user__');
            const isHot = (post.upvotes ||0) >= 5;
            const isNew = (now - post.createdAt) < ONE_HOUR;
            const isAnon = post.isAnonymous;
            const isForwarded = post.isForwarded;

            let cardClass = 'post-card';
            if (isHot) cardClass += ' hot-post';
            else if (isNew) cardClass += ' new-post';
            if (isAnon) cardClass += ' anon-post';

            const displayName = isAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(post.authorName ||'Anonymous');
            const displayAvatar = isAnon ? '\uD83C\uDFAD' : post.authorAvatar;

            const boardInfo = post.board && post.board !== 'all'
                ? '<div class="post-board-tag">' + getBoardIcon(post.board) + ' ' + getBoardName(post.board) + '</div>'
                : '';

            const forwardedTag = isForwarded && post.forwardFrom
                ? '<div class="forwarded-tag">Forwarded</div>'
                : '';

            const tagsHtml = post.tags && post.tags.length > 0
                ? '<div class="post-tags">' + post.tags.map(t => '<span class="post-tag">' + UI.escapeHtml(t) + '</span>').join('') + '</div>'
                : '';

            return '<div class="' + cardClass + '" data-post-id="' + post.id + '">'
                + forwardedTag
                + boardInfo
                + '<div class="post-card-header">'
                +   UI.renderAvatar(displayAvatar, 28)
                +   '<span class="post-author">' + displayName + '</span>'
                +   '<span class="post-timestamp">' + UI.formatTime(post.createdAt) + '</span>'
                + '</div>'
                + '<div class="post-card-title">' + UI.escapeHtml(post.title) + '</div>'
                + '<div class="post-card-body">' + UI.escapeHtml(post.body) + '</div>'
                + tagsHtml
                + '<div class="post-card-footer">'
                +   '<div class="post-stat ' + (isUpvoted ? 'upvoted' : '') + '" data-action="upvote" data-post-id="' + post.id + '">'
                +     '\u25B2 ' + (post.upvotes || 0)
                +   '</div>'
                +   '<div class="post-stat">\uD83D\uDCAC ' + (post.comments || []).length + '</div>'
                + '</div>'
                + '</div>';
        }).join('');

        // Bind click events
        container.querySelectorAll('.post-card').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="upvote"]')) return;
                openPost(el.dataset.postId);
            });
        });

        container.querySelectorAll('[data-action="upvote"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleUpvote(el.dataset.postId);
            });
        });
    }

    function getBoardIcon(boardId) {
        const b = BOARDS.find(x => x.id === boardId);
        return b ? b.icon : '\u2726';
    }
    function getBoardName(boardId) {
        const b = BOARDS.find(x => x.id === boardId);
        return b ? b.name : boardId;
    }

    // ========================
    //  Post Detail
    // ========================
    function openPost(postId) {
        currentPostId = postId;
        renderPostDetail();
        App.navigateTo('forum-post');
    }

    function renderPostDetail() {
        if (!currentPostId) return;
        const post = Store.getPost(currentPostId);
        if (!post) return;

        const container = document.getElementById('post-detail');
        const isUpvoted = post.upvotedBy && post.upvotedBy.includes('__user__');
        const isAnon = post.isAnonymous;

        const displayName = isAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(post.authorName || 'Anonymous');
        const displayAvatar = isAnon ? '\uD83C\uDFAD' : post.authorAvatar;

        const boardTag = post.board && post.board !== 'all'
            ? '<div class="post-board-tag">' + getBoardIcon(post.board) + ' ' + getBoardName(post.board) + '</div>'
            : '';

        const forwardedBanner = post.isForwarded && post.forwardFrom
            ? '<div class="forwarded-banner">Forwarded from another post</div>'
            : '';

        const tagsHtml = post.tags && post.tags.length > 0
            ? '<div class="post-tags">' + post.tags.map(t => '<span class="post-tag">' + UI.escapeHtml(t) + '</span>').join('') + '</div>'
            : '';

        // Anon reveal button
        let anonRevealHtml = '';
        if (isAnon) {
            const usedCount = Store.getAnonRevealCount();
            const remaining = 3 - usedCount;
            anonRevealHtml = '<div class="anon-reveal-btn' + (remaining <= 0 ? ' disabled' : '') + '" data-action="reveal-anon">'
                + '\uD83D\uDD0D Reveal (' + remaining + '/3)'
                + '</div>';
        }

        // Comments
        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(c => {
                const cIsAnon = c.isAnonymous;
                const cName = cIsAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(c.authorName || 'Anonymous');
                const cAvatar = cIsAnon ? '\uD83C\uDFAD' : c.authorAvatar;
                const cClass = 'comment-item' + (c.isReply ? ' reply' : '') + (cIsAnon ? ' anon-comment' : '');

                return '<div class="' + cClass + '">'
                    + '<div class="comment-header">'
                    +   UI.renderAvatar(cAvatar, 22)
                    +   '<span class="comment-author">' + cName + '</span>'
                    +   '<span class="comment-time">' + UI.formatTime(c.createdAt) + '</span>'
                    + '</div>'
                    + '<div class="comment-body">' + UI.escapeHtml(c.body) + '</div>'
                    + '<div class="comment-actions">'
                    +   '<span class="comment-action forward-action" data-action="forward-comment" data-comment-id="' + c.id + '">Forward</span>'
                    + '</div>'
                    + '</div>';
            }).join('');
        }

        container.innerHTML = forwardedBanner
            + '<div class="post-detail-card">'
            +   boardTag
            +   '<div class="post-card-header">'
            +     UI.renderAvatar(displayAvatar, 32)
            +     '<span class="post-author">' + displayName + '</span>'
            +     '<span class="post-timestamp">' + UI.formatTime(post.createdAt) + '</span>'
            +   '</div>'
            +   '<div class="post-detail-title">' + UI.escapeHtml(post.title) + '</div>'
            +   '<div class="post-detail-body">' + UI.escapeHtml(post.body) + '</div>'
            +   tagsHtml
            +   '<div class="post-detail-footer">'
            +     '<div class="post-stat ' + (isUpvoted ? 'upvoted' : '') + '" data-action="upvote-detail">'
            +       '\u25B2 ' + (post.upvotes || 0)
            +     '</div>'
            +     '<div class="post-stat">\uD83D\uDCAC ' + (post.comments || []).length + '</div>'
            +     anonRevealHtml
            +   '</div>'
            + '</div>'
            + '<div class="comments-section">'
            +   '<div class="comments-header">\u263E Comments</div>'
            +   (commentsHtml || '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px;">No comments yet</div>')
            +   '<div class="summon-btn" data-action="summon">\u2726 Summon Passers-by \u2726</div>'
            + '</div>';

        // Bind events
        container.querySelector('[data-action="upvote-detail"]')?.addEventListener('click', () => {
            toggleUpvote(currentPostId);
            renderPostDetail();
        });

        container.querySelector('[data-action="reveal-anon"]')?.addEventListener('click', revealAnonymous);

        container.querySelector('[data-action="summon"]')?.addEventListener('click', (e) => {
            summonPassersby(e.currentTarget);
        });

        container.querySelectorAll('[data-action="forward-comment"]').forEach(el => {
            el.addEventListener('click', () => forwardPost(currentPostId));
        });
    }

    // ========================
    //  Upvote
    // ========================
    function toggleUpvote(postId) {
        const post = Store.getPost(postId);
        if (!post) return;

        if (!post.upvotedBy) post.upvotedBy = [];

        const idx = post.upvotedBy.indexOf('__user__');
        if (idx >= 0) {
            post.upvotedBy.splice(idx, 1);
            post.upvotes = Math.max(0, (post.upvotes || 0) - 1);
        } else {
            post.upvotedBy.push('__user__');
            post.upvotes = (post.upvotes || 0) + 1;
        }

        Store.updatePost(postId, { upvotes: post.upvotes, upvotedBy: post.upvotedBy });
        renderPostList();
    }

    // ========================
    //  Submit Comment
    // ========================
    function submitComment() {
        if (!currentPostId) return;
        const input = document.getElementById('comment-input');
        const body = input.value.trim();
        if (!body) return;

        input.value = '';

        const settings = Store.getSettings();
        const post = Store.getPost(currentPostId);
        if (!post) return;

        if (!post.comments) post.comments = [];
        post.comments.push({
            id: UI.genId('cmt'),
            authorId: '__user__',
            authorName: settings.username || 'User',
            authorAvatar: settings.userAvatar || '\uD83D\uDE08',
            body: body,
            createdAt: Date.now()
        });

        Store.updatePost(currentPostId, { comments: post.comments });
        renderPostDetail();
        renderPostList();

        // Trigger AI reply
        triggerCharReply(currentPostId);
    }

    // ========================
    //  New Post Modal
    // ========================
    function showNewPostModal() {
        let html = '<h3>\u26E7 New Post</h3>'
            + '<div class="setting-item">'
            +   '<label>Board</label>'
            +   '<div class="board-select-grid" id="modal-board-select">';

        BOARDS.forEach(b => {
            if (b.id === 'all') return;
            html += '<div class="board-select-item" data-board="' + b.id + '">' + b.icon + ' ' + b.name + '</div>';
        });

        html += '</div></div>'
            + '<div class="setting-item">'
            +   '<label>Title</label>'
            +   '<input type="text" id="new-post-title" placeholder="Post title...">'
            + '</div>'
            + '<div class="setting-item">'
            +   '<label>Body</label>'
            +   '<textarea id="new-post-body" rows="5" placeholder="What\'s on your mind..."></textarea>'
            + '</div>'
            + '<div class="setting-item">'
            +   '<label>Tags (comma separated, max 3)</label>'
            +   '<input type="text" id="new-post-tags" placeholder="e.g. dark, ritual, midnight">'
            + '</div>'
            + '<div class="setting-item">'
            +   '<div class="anon-toggle" id="anon-toggle">'
            +     '<div class="anon-toggle-track"></div>'
            +     '<span class="anon-toggle-label">\uD83C\uDFAD Anonymous Post</span>'
            +   '</div>'
            + '</div>'
            + '<div class="modal-btns">'
            +   '<button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>'
            +   '<button class="gothic-btn primary" id="btn-submit-post">Post</button>'
            + '</div>';

        UI.showModal(html);

        // Board selection
        let selectedBoard = 'gossip';
        const boardGrid = document.getElementById('modal-board-select');
        // Select first by default
        const firstBoardEl = boardGrid.querySelector('[data-board="' + selectedBoard + '"]');
        if (firstBoardEl) firstBoardEl.classList.add('selected');

        boardGrid.querySelectorAll('.board-select-item').forEach(el => {
            el.addEventListener('click', () => {
                boardGrid.querySelectorAll('.board-select-item').forEach(x => x.classList.remove('selected'));
                el.classList.add('selected');
                selectedBoard = el.dataset.board;
            });
        });

        // Anon toggle
        let isAnon = false;
        document.getElementById('anon-toggle').addEventListener('click', function() {
            isAnon = !isAnon;
            this.classList.toggle('on', isAnon);
        });

        // Submit
        document.getElementById('btn-submit-post').addEventListener('click', () => {
            const title = document.getElementById('new-post-title').value.trim();
            const body = document.getElementById('new-post-body').value.trim();
            const tagsRaw = document.getElementById('new-post-tags').value.trim();

            if (!title) {
                UI.toast('Title is required');
                return;
            }

            const tags = tagsRaw
                ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
                : [];

            const settings = Store.getSettings();
            const postData = {
                authorId: '__user__',
                authorName: settings.username || 'User',
                authorAvatar: settings.userAvatar || '\uD83D\uDE08',
                title: title,
                body: body,
                board: selectedBoard,
                tags: tags,
                isAnonymous: isAnon
            };

            if (isAnon) {
                postData.realAuthorId = '__user__';
                postData.realAuthorName = settings.username || 'User';
                postData.realAuthorAvatar = settings.userAvatar || '\uD83D\uDE08';
            }

            Store.addPost(postData);
            UI.closeModal();
            renderPostList();
            UI.toast('Post created');
        });
    }

    // ========================
    //  Post Menu (⋮)
    // ========================
    function showPostMenu() {
        if (!currentPostId) return;
        const post = Store.getPost(currentPostId);
        if (!post) return;

        let html = '<h3>\u2726 Post Options</h3>'
            + '<div style="display:flex;flex-direction:column;gap:8px;">'
            +   '<button class="gothic-btn full-width" id="menu-forward">\u21BB Forward This Post</button>';

        if (post.authorId === '__user__') {
            html += '<button class="gothic-btn full-width" id="menu-delete" style="color:var(--accent-red);">\u2716 Delete Post</button>';
        }

        html += '<button class="gothic-btn full-width" onclick="UI.closeModal()">Cancel</button>'
            + '</div>';

        UI.showModal(html);

        document.getElementById('menu-forward')?.addEventListener('click', () => {
            UI.closeModal();
            forwardPost(currentPostId);
        });

        document.getElementById('menu-delete')?.addEventListener('click', () => {
            Store.deletePost(currentPostId);
            UI.closeModal();
            currentPostId = null;
            App.navigateTo('forum-list');
            renderPostList();
            UI.toast('Post deleted');
        });
    }

    // ========================
    //  Forward Post
    // ========================
    function forwardPost(postId) {
        const post = Store.getPost(postId);
        if (!post) return;

        // Pick a random char or NPC to forward
        const chars = Store.getChars().filter(c => c.id !== '__model__');
        const npcPool = Store.getNpcPool();
        const allCandidates = [];

        chars.forEach(c => allCandidates.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64', type: 'char' }));
        npcPool.forEach(n => allCandidates.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64', type: 'npc' }));

        if (allCandidates.length === 0) {
            // Create a random NPC to forward
            const npc = createRandomNpc();
            allCandidates.push({ id: npc.id, name: npc.name, avatar: npc.avatar, type: 'npc' });
        }

        const forwarder = allCandidates[Math.floor(Math.random() * allCandidates.length)];

        Store.addPost({
            authorId: forwarder.id,
            authorName: forwarder.name,
            authorAvatar: forwarder.avatar,
            title:'Fwd: ' + post.title,
            body: post.body,
            board: post.board || 'gossip',
            tags: post.tags || [],
            isForwarded: true,
            forwardFrom: postId
        });

        renderPostList();
        UI.toast(forwarder.name + ' forwarded this post');
    }

    // ========================
    //  Reveal Anonymous
    // ========================
    function revealAnonymous() {
        const post = Store.getPost(currentPostId);
        if (!post || !post.isAnonymous) return;

        const canReveal = Store.useAnonReveal();
        if (!canReveal) {
            UI.toast('No reveals left today (3/3 used)');
            return;
        }

        const realName = post.realAuthorName || 'Unknown';
        const realAvatar = post.realAuthorAvatar || '\uD83D\uDC64';
        const remaining = 3 - Store.getAnonRevealCount();

        UI.showModal(
            '<h3>\uD83D\uDD0D Identity Revealed</h3>'
            + '<div style="text-align:center;padding:20px 0;">'
            +   UI.renderAvatar(realAvatar, 48)
            +   '<p style="margin-top:12px;font-size:16px;color:var(--text-primary);">' + UI.escapeHtml(realName) + '</p>'
            +   '<p style="margin-top:8px;font-size:11px;color:var(--text-muted);">Reveals remaining today: ' + remaining + '</p>'
            + '</div>'
            + '<div class="modal-btns">'
            +   '<button class="gothic-btn full-width" onclick="UI.closeModal()">Close</button>'
            + '</div>'
        );
    }

    // ========================
    //  Summon Passers-by
    // ========================
    async function summonPassersby(btnEl) {
        if (!currentPostId) return;
        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) {
            UI.toast('Configure API first');
            return;
        }

        btnEl.classList.add('loading');
        btnEl.textContent = 'Summoning...';

        const post = Store.getPost(currentPostId);
        if (!post) { btnEl.classList.remove('loading'); return; }

        try {
            // Decide how many passers-by (1-3)
            const count = 1 + Math.floor(Math.random() * 3);

            // Get or create NPCs
            const npcs = [];
            for (let i = 0; i < count; i++) {
                let npc = Store.getRandomNpc();
                if (!npc || Math.random() > 0.6) {
                    npc = createRandomNpc();
                }
                npcs.push(npc);
            }

            const existingComments = (post.comments || []).map(c =>
                c.authorName +': ' + c.body
            ).join('\n');

            const forumPrompt = settings.forumPrompt || '';
            const npcNames = npcs.map(n => n.name).join(', ');

            const prompt = 'You are generating forum comments from multiple passers-by on a dark gothic-themed forum.\n'
                + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
                + 'The passers-by are: ' + npcNames + '\n'
                + 'Each person should have a distinct voice and personality. Keep each reply brief (1-2 sentences).\n'
                + 'Respond in JSON array format: [{"name":"...","body":"..."},...]';

            const context = 'Post title: ' + post.title + '\n'
                + 'Post body: ' + post.body + '\n'
                + (existingComments ? '\nExisting comments:\n' + existingComments : '')
                + '\n\nGenerate ' + count + ' comments from: ' + npcNames;

            const reply = await AI.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: context }
            ], { temperature: 1.0, max_tokens: 400 });

            if (!post.comments) post.comments = [];

            try {
                const parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        const matchNpc = npcs.find(n => n.name === item.name) || npcs[0];
                        post.comments.push({
                            id: UI.genId('cmt'),
                            authorId: matchNpc.id,
                            authorName: matchNpc.name,
                            authorAvatar: matchNpc.avatar,
                            body: (item.body || item.content || '').trim(),
                            createdAt: Date.now() + Math.floor(Math.random() * 5000)
                        });
                    });
                }
            } catch {
                // Fallback: treat as single comment
                const npc = npcs[0];
                post.comments.push({
                    id: UI.genId('cmt'),
                    authorId: npc.id,
                    authorName: npc.name,
                    authorAvatar: npc.avatar,
                    body: reply.trim().slice(0, 300),
                    createdAt: Date.now()
                });
            }

            Store.updatePost(currentPostId, { comments: post.comments });
            renderPostDetail();
            renderPostList();
        } catch (e) {
            console.error('Summon failed:', e);
            UI.toast('Summoning failed...');
        }

        btnEl.classList.remove('loading');
        btnEl.textContent = '\u2726 Summon Passers-by \u2726';
    }

    // ========================
    //  NPC Creation
    // ========================
    function createRandomNpc() {
        const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]
            + '_' + Math.floor(Math.random() * 999);
        const avatar = NPC_AVATARS[Math.floor(Math.random() * NPC_AVATARS.length)];
        return Store.addNpc({ name: name, avatar: avatar });
    }

    async function aiCreateNpc() {
        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return createRandomNpc();

        try {
            const forumPrompt = settings.forumPrompt || '';
            const prompt = 'Create a unique forum user for a dark gothic-themed forum.\n'
                + (forumPrompt ? 'Forum vibe: ' + forumPrompt + '\n' : '')
                + 'Respond in JSON: {"name":"...","avatar":"(single emoji)","persona":"(one sentence description)"}';

            const reply = await AI.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: 'Generate one new forum user.' }
            ], { temperature: 1.2, max_tokens: 100 });

            const parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
            if (parsed.name) {
                return Store.addNpc({
                    name: parsed.name,
                    avatar: parsed.avatar || '\uD83D\uDC64',
                    persona: parsed.persona || ''
                });
            }
        } catch {
            // fallback
        }
        return createRandomNpc();
    }

    // ========================
    //  AI Auto-posting
    // ========================
    function startAutoPosting() {
        scheduleNextAutoAction();
    }

    function scheduleNextAutoAction() {
        const delay = (120 + Math.random() * 180) * 1000; // 2-5 min
        autoPostTimer = setTimeout(async () => {
            await performAutoAction();
            scheduleNextAutoAction();
        }, delay);
    }

    async function performAutoAction() {
        const chars = Store.getChars().filter(c => c.id !== '__model__');
        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        // Combine chars + NPCs as potential actors
        const npcPool = Store.getNpcPool();
        const allActors = [];
        chars.forEach(c => allActors.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64', persona: c.persona || '', type: 'char' }));
        npcPool.forEach(n => allActors.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64', persona: n.persona || '', type: 'npc' }));

        if (allActors.length === 0) {
            // Create an NPC via AI
            const npc = await aiCreateNpc();
            allActors.push({ id: npc.id, name: npc.name, avatar: npc.avatar, persona: npc.persona || '', type: 'npc' });
        }

        const actor = allActors[Math.floor(Math.random() * allActors.length)];
        const posts = Store.getPosts();
        const forumPrompt = settings.forumPrompt || '';

        //40% create post, 40% reply, 20% create NPC + post
        const roll = Math.random();

        if (roll < 0.2&& npcPool.length < 30) {
            // Create a new NPC then post
            const npc = await aiCreateNpc();
            await autoCreatePost(npc, forumPrompt);
        } else if (posts.length === 0 || roll < 0.6) {
            // Create a new post
            await autoCreatePost(actor, forumPrompt);
        } else {
            // Reply to a random post
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            await autoReplyToPost(randomPost.id, actor, forumPrompt);
        }
    }

    async function autoCreatePost(actor, forumPrompt) {
        try {
            const randomBoard = BOARDS.filter(b => b.id !== 'all');
            const board = randomBoard[Math.floor(Math.random() * randomBoard.length)];

            const prompt = 'You are ' + actor.name + '. ' + (actor.persona || '') + '\n'
                + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
                + 'You are posting in the "' + board.name + '" section of a dark gothic-themed forum.\n'
                + 'Write a short forum post. Stay in character.\n'
                + 'Respond in JSON: {"title":"...","body":"...","tags":["tag1","tag2"]}';

            const reply = await AI.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: 'Write a new forum post for the ' + board.name + ' board. Keep it brief and in character.' }
            ], { temperature: 1.0, max_tokens: 300 });

            let title, body, tags = [];
            try {
                const parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                title = parsed.title;
                body = parsed.body;
                tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [];
            } catch {
                title = actor.name + '\'s thoughts';
                body = reply.slice(0, 500);
            }

            if (title && body) {
                // Small chance of anonymous post
                const isAnon = Math.random()< 0.15;
                const postData = {
                    authorId: actor.id,
                    authorName: actor.name,
                    authorAvatar: actor.avatar,
                    title: title,
                    body: body,
                    board: board.id,
                    tags: tags,
                    isAnonymous: isAnon
                };
                if (isAnon) {
                    postData.realAuthorId = actor.id;
                    postData.realAuthorName = actor.name;
                    postData.realAuthorAvatar = actor.avatar;
                }
                Store.addPost(postData);

                if (document.getElementById('page-forum-list').classList.contains('active')) {
                    renderPostList();
                }
            }
        } catch (e) {
            console.error('Auto-post failed:', e);
        }
    }

    async function autoReplyToPost(postId, actor, forumPrompt) {
        const post = Store.getPost(postId);
        if (!post) return;

        try {
            const existingComments = (post.comments || []).map(c =>
                c.authorName + ': ' + c.body
            ).join('\n');

            const prompt = 'You are ' + actor.name + '. ' + (actor.persona || '') + '\n'
                + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
                + 'You are replying to a forum post on a dark gothic-themed forum. Stay in character. Keep your reply brief (1-3 sentences).';

            const context = 'Post title: ' + post.title + '\n'
                + 'Post body: ' + post.body + '\n'
                + (existingComments ? '\nExisting comments:\n' + existingComments : '')
                + '\n\nWrite your reply:';

            const reply = await AI.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: context }
            ], { temperature: 0.9, max_tokens: 200 });

            if (!post.comments) post.comments = [];

            // Small chance the reply is anonymous
            const isAnon = Math.random() < 0.1;
            const comment = {
                id: UI.genId('cmt'),
                authorId: actor.id,
                authorName: actor.name,
                authorAvatar: actor.avatar,
                body: reply.trim(),
                createdAt: Date.now(),
                isAnonymous: isAnon
            };

            post.comments.push(comment);
            Store.updatePost(postId, { comments: post.comments });

            // Maybe forward the post (10% chance)
            if (Math.random() < 0.1) {
                Store.addPost({
                    authorId: actor.id,
                    authorName: actor.name,
                    authorAvatar: actor.avatar,
                    title: 'Fwd: ' + post.title,
                    body: post.body,
                    board: post.board || 'gossip',
                    tags: post.tags || [],
                    isForwarded: true,
                    forwardFrom: postId
                });
            }

            // Refresh views
            if (currentPostId === postId && document.getElementById('page-forum-post').classList.contains('active')) {
                renderPostDetail();
            }
            if (document.getElementById('page-forum-list').classList.contains('active')) {
                renderPostList();
            }
        } catch (e) {
            console.error('Auto-reply failed:', e);
        }
    }

    // User-triggered char reply (after user comments)
    async function triggerCharReply(postId) {
        const chars = Store.getChars().filter(c => c.id !== '__model__');
        const npcPool = Store.getNpcPool();
        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        const allActors = [];
        chars.forEach(c => allActors.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64', persona: c.persona || '' }));
        npcPool.forEach(n => allActors.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64', persona: n.persona || '' }));

        if (allActors.length === 0) return;

        const delay = (5 + Math.random() * 10) * 1000;
        setTimeout(async () => {
            const actor = allActors[Math.floor(Math.random() * allActors.length)];
            await autoReplyToPost(postId, actor, settings.forumPrompt || '');
        }, delay);
    }

    return { init, renderPostList, openPost, renderTabBar };
})();
