var Forum = (function() {
    var currentPostId = null;
    var autoPostTimer = null;
    var autoChatTimer = null;
    var currentBoard = 'all';

    var BOARDS = [
        { id: 'all',name: 'All',     icon: '\u2726' },
        { id: 'game',   name: 'Gaming',  icon: '\u2694' },
        { id: 'gossip', name: 'Gossip',  icon: '\u263E' },
        { id: 'news',   name: 'News',    icon: '\u2620' },
        { id: 'story',  name: 'Stories', icon: '\u270E' },
        { id: 'social', name: 'Social',  icon: '\u2661' }
    ];

    var NPC_NAMES = [
        'Wraith','Nyx','Obsidian','Hollow','Vesper','Shade','Grimm',
        'Phantom','Cinder','Raven','Dusk','Ember','Void','Specter',
        'Onyx','Thorn','Mist','Echo','Veil','Ash','Sable','Gloom',
        'Nocturne','Bane','Wisp','Murk','Dirge','Hex','Bleak','Rue'
    ];
    var NPC_AVATARS = [
        '\uD83D\uDC7B','\uD83D\uDDA4','\uD83D\uDD73','\u2620\uFE0F',
        '\uD83C\uDF11','\uD83E\uDDA7','\uD83D\uDC80','\uD83C\uDF0C',
        '\uD83D\uDD6F','\uD83E\uDDB4','\uD83C\uDF2B','\u26B0\uFE0F',
        '\uD83D\uDC41','\uD83E\uDDA2','\uD83D\uDC3A','\uD83E\uDD89'
    ];

    function init() {
        renderTabBar();
        bindEvents();
        startBackgroundTasks();
    }

    function bindEvents() {
        document.getElementById('btn-new-post').addEventListener('click', showNewPostModal);
        document.getElementById('btn-comment').addEventListener('click', submitComment);
        document.getElementById('btn-post-menu').addEventListener('click', showPostMenu);

        var commentInput = document.getElementById('comment-input');
        commentInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment();
            }
        });
    }

    // ========================
    //  Tab Bar
    // ========================
    function renderTabBar() {
        var bar = document.getElementById('forum-tab-bar');
        bar.innerHTML = BOARDS.map(function(b) {
            return '<div class="forum-tab' + (b.id === currentBoard ? ' active' : '') + '" data-board="' + b.id + '">'
                + b.icon + ' ' + b.name + '</div>';
        }).join('');

        bar.querySelectorAll('.forum-tab').forEach(function(el) {
            el.addEventListener('click', function() {
                currentBoard = el.dataset.board;
                bar.querySelectorAll('.forum-tab').forEach(function(t) { t.classList.remove('active'); });
                el.classList.add('active');
                renderPostList();
            });
        });
    }

    // ========================
    //  Post List
    // ========================
    function renderPostList() {
        var container = document.getElementById('forum-posts');
        var posts = Store.getPosts();

        if (currentBoard !== 'all') {
            posts = posts.filter(function(p) { return p.board === currentBoard; });
        }

        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state">'
                + '<div class="empty-icon">\u26E7</div>'
                + '<p>The forum is silent... for now</p>'
                + '</div>';
            return;
        }

        var now = Date.now();
        var ONE_HOUR = 3600000;

        container.innerHTML = posts.map(function(post) {
            var isUpvoted = post.upvotedBy && post.upvotedBy.indexOf('__user__') >= 0;
            var isHot = (post.upvotes || 0) >=5;
            var isNew = (now - post.createdAt) < ONE_HOUR;
            var isAnon = post.isAnonymous;
            var isForwarded = post.isForwarded;
            var isImagePost = post.type === 'image_desc';

            var cardClass = 'post-card';
            if (isHot) cardClass += ' hot-post';
            else if (isNew) cardClass += ' new-post';
            if (isAnon) cardClass += ' anon-post';

            var displayName = isAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(post.authorName ||'Anonymous');
            var displayAvatar = isAnon ? '\uD83C\uDFAD' : post.authorAvatar;

            var boardInfo = post.board && post.board !== 'all'
                ? '<div class="post-board-tag">' + getBoardIcon(post.board) + ' ' + getBoardName(post.board) + '</div>'
                : '';

            var forwardedTag = isForwarded
                ? '<div class="forwarded-tag"> Forwarded</div>'
                : '';

            var tagsHtml = post.tags && post.tags.length > 0
                ? '<div class="post-tags">' + post.tags.map(function(t) { return '<span class="post-tag">' + UI.escapeHtml(t) + '</span>'; }).join('') + '</div>'
                : '';

            var bodyHtml = '';
            if (isImagePost) {
                bodyHtml = '<div class="post-image-desc">'
                    + '<div class="image-desc-frame">'
                    + '<div class="image-desc-icon">\uD83D\uDDBC\uFE0F</div>'
                    + '<div class="image-desc-text">' + UI.escapeHtml(post.body) + '</div>'
                    + '</div></div>';
            } else {
                bodyHtml = '<div class="post-card-body">' + UI.escapeHtml(post.body) + '</div>';
            }

            return '<div class="' + cardClass + '" data-post-id="' + post.id + '">'
                + forwardedTag
                + boardInfo
                + '<div class="post-card-header">'
                +   UI.renderAvatar(displayAvatar, 28)
                +   '<span class="post-author">' + displayName + '</span>'
                +   '<span class="post-timestamp">' + UI.formatTime(post.createdAt) + '</span>'
                + '</div>'
                + '<div class="post-card-title">' + UI.escapeHtml(post.title) + '</div>'
                + bodyHtml
                + tagsHtml
                + '<div class="post-card-footer">'
                +   '<div class="post-stat ' + (isUpvoted ? 'upvoted' : '') + '" data-action="upvote" data-post-id="' + post.id + '">'
                +     '\u25B2 ' + (post.upvotes || 0)
                +   '</div>'
                +   '<div class="post-stat">\uD83D\uDCAC ' + (post.comments || []).length + '</div>'
                + '</div>'
                + '</div>';
        }).join('');

        container.querySelectorAll('.post-card').forEach(function(el) {
            el.addEventListener('click', function(e) {
                if (e.target.closest('[data-action="upvote"]')) return;
                openPost(el.dataset.postId);
            });
        });

        container.querySelectorAll('[data-action="upvote"]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleUpvote(el.dataset.postId);
            });
        });
    }

    function getBoardIcon(boardId) {
        var b = BOARDS.find(function(x) { return x.id === boardId; });
        return b ? b.icon : '\u2726';
    }
    function getBoardName(boardId) {
        var b = BOARDS.find(function(x) { return x.id === boardId; });
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
        var post = Store.getPost(currentPostId);
        if (!post) return;

        var container = document.getElementById('post-detail');
        var isUpvoted = post.upvotedBy && post.upvotedBy.indexOf('__user__') >= 0;
        var isAnon = post.isAnonymous;
        var isImagePost = post.type === 'image_desc';

        var displayName = isAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(post.authorName || 'Anonymous');
        var displayAvatar = isAnon ? '\uD83C\uDFAD' : post.authorAvatar;

        var boardTag = post.board && post.board !== 'all'
            ? '<div class="post-board-tag">' + getBoardIcon(post.board) + ' ' + getBoardName(post.board) + '</div>'
            : '';

        var forwardedBanner = post.isForwarded
            ? '<div class="forwarded-banner">Forwarded from another post</div>'
            : '';

        var tagsHtml = post.tags && post.tags.length > 0
            ? '<div class="post-tags">' + post.tags.map(function(t) { return '<span class="post-tag">' + UI.escapeHtml(t) + '</span>'; }).join('') + '</div>'
            : '';

        var bodyHtml = '';
        if (isImagePost) {
            bodyHtml = '<div class="post-image-desc detail">'
                + '<div class="image-desc-frame">'
                + '<div class="image-desc-icon">\uD83D\uDDBC\uFE0F</div>'
                + '<div class="image-desc-text">' + UI.escapeHtml(post.body) + '</div>'
                + '</div></div>';
        } else {
            bodyHtml = '<div class="post-detail-body">' + UI.escapeHtml(post.body) + '</div>';
        }

        // Anon reveal
        var anonRevealHtml = '';
        if (isAnon) {
            var usedCount = Store.getAnonRevealCount();
            var remaining = 3 - usedCount;
            anonRevealHtml = '<div class="anon-reveal-btn' + (remaining <= 0 ? ' disabled' : '') + '" data-action="reveal-anon">'
                + '\uD83D\uDD0D Reveal (' + remaining + '/3)'
                + '</div>';
        }

        // Comments
        var commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(function(c) {
                var cIsAnon = c.isAnonymous;
                var cName = cIsAnon ? '\u300E\u533F\u540D\u8005\u300F' : UI.escapeHtml(c.authorName || 'Anonymous');
                var cAvatar = cIsAnon ? '\uD83C\uDFAD' : c.authorAvatar;
                var cClass = 'comment-item' + (c.isReply ? ' reply' : '') + (cIsAnon ? ' anon-comment' : '');
                var isImageComment = c.type === 'image_desc';

                var cBodyHtml = '';
                if (isImageComment) {
                    cBodyHtml = '<div class="comment-image-desc">'
                        + '<div class="image-desc-frame small">'
                        + '<div class="image-desc-icon">\uD83D\uDDBC\uFE0F</div>'
                        + '<div class="image-desc-text">' + UI.escapeHtml(c.body) + '</div>'
                        + '</div></div>';
                } else {
                    cBodyHtml = '<div class="comment-body">' + UI.escapeHtml(c.body) + '</div>';
                }

                return '<div class="' + cClass + '">'
                    + '<div class="comment-header">'
                    +   UI.renderAvatar(cAvatar, 22)
                    +   '<span class="comment-author">' + cName + '</span>'
                    +   '<span class="comment-time">' + UI.formatTime(c.createdAt) + '</span>'
                    + '</div>'
                    + cBodyHtml
                    + '<div class="comment-actions">'
                    +   '<span class="comment-action" data-action="reply-comment" data-author="' + cName + '">Reply</span>'
                    +   '<span class="comment-action forward-action" data-action="forward-comment">Forward</span>'
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
            +   bodyHtml
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
        container.querySelector('[data-action="upvote-detail"]')?.addEventListener('click', function() {
            toggleUpvote(currentPostId);
            renderPostDetail();
        });

        container.querySelector('[data-action="reveal-anon"]')?.addEventListener('click', revealAnonymous);

        container.querySelector('[data-action="summon"]')?.addEventListener('click', function(e) {
            summonPassersby(e.currentTarget);
        });

        container.querySelectorAll('[data-action="forward-comment"]').forEach(function(el) {
            el.addEventListener('click', function() { forwardPost(currentPostId); });
        });

        container.querySelectorAll('[data-action="reply-comment"]').forEach(function(el) {
            el.addEventListener('click', function() {
                var authorName = el.dataset.author || '';
                var input = document.getElementById('comment-input');
                input.value = '@' + authorName + ' ';
                input.focus();
            });
        });
    }

    // ========================
    //  Upvote
    // ========================
    function toggleUpvote(postId) {
        var post = Store.getPost(postId);
        if (!post) return;
        if (!post.upvotedBy) post.upvotedBy = [];

        var idx = post.upvotedBy.indexOf('__user__');
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
        var input = document.getElementById('comment-input');
        var body = input.value.trim();
        if (!body) return;
        input.value = '';

        var settings = Store.getSettings();
        var post = Store.getPost(currentPostId);
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

        // Trigger multiple AI replies
        triggerCharReplies(currentPostId, body);
    }

    // ========================
    //  New Post Modal
    // ========================
    function showNewPostModal() {
        var html = '<h3>\u26E7 New Post</h3>'
            + '<div class="setting-item">'
            +   '<label>Board</label>'
            +   '<div class="board-select-grid" id="modal-board-select">';BOARDS.forEach(function(b) {
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
            + '<div class="setting-item">'
            +   '<div class="anon-toggle" id="image-toggle">'
            +     '<div class="anon-toggle-track"></div>'
            +     '<span class="anon-toggle-label">\uD83D\uDDBC\uFE0F Image Description Post</span>'
            +   '</div>'
            + '</div>'
            + '<div class="modal-btns">'
            +   '<button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>'
            +   '<button class="gothic-btn primary" id="btn-submit-post">Post</button>'
            + '</div>';

        UI.showModal(html);

        // Board selection
        var selectedBoard = 'gossip';
        var boardGrid = document.getElementById('modal-board-select');
        var firstBoardEl = boardGrid.querySelector('[data-board="gossip"]');
        if (firstBoardEl) firstBoardEl.classList.add('selected');

        boardGrid.querySelectorAll('.board-select-item').forEach(function(el) {
            el.addEventListener('click', function() {
                boardGrid.querySelectorAll('.board-select-item').forEach(function(x) { x.classList.remove('selected'); });
                el.classList.add('selected');
                selectedBoard = el.dataset.board;
            });
        });

        // Toggles
        var isAnon = false;
        var isImage = false;
        document.getElementById('anon-toggle').addEventListener('click', function() {
            isAnon = !isAnon;
            this.classList.toggle('on', isAnon);
        });
        document.getElementById('image-toggle').addEventListener('click', function() {
            isImage = !isImage;
            this.classList.toggle('on', isImage);
        });

        // Submit
        document.getElementById('btn-submit-post').addEventListener('click', function() {
            var title = document.getElementById('new-post-title').value.trim();
            var body = document.getElementById('new-post-body').value.trim();
            var tagsRaw = document.getElementById('new-post-tags').value.trim();

            if (!title) { UI.toast('Title is required'); return; }

            var tags = tagsRaw
                ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean).slice(0, 3)
                : [];

            var settings = Store.getSettings();
            var postData = {
                authorId: '__user__',
                authorName: settings.username || 'User',
                authorAvatar: settings.userAvatar || '\uD83D\uDE08',
                title: title,
                body: body,
                board: selectedBoard,
                tags: tags,
                isAnonymous: isAnon,
                type: isImage ? 'image_desc' : 'text'
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
    //  Post Menu
    // ========================
    function showPostMenu() {
        if (!currentPostId) return;
        var post = Store.getPost(currentPostId);
        if (!post) return;

        var html = '<h3>\u2726 Post Options</h3>'
            + '<div style="display:flex;flex-direction:column;gap:8px;">'
            +   '<button class="gothic-btn full-width" id="menu-forward">\u21BB Forward This Post</button>';

        if (post.authorId === '__user__') {
            html += '<button class="gothic-btn full-width" id="menu-delete" style="color:var(--accent-red);">\u2716 Delete Post</button>';
        }

        html += '<button class="gothic-btn full-width" onclick="UI.closeModal()">Cancel</button>'
            + '</div>';

        UI.showModal(html);

        document.getElementById('menu-forward')?.addEventListener('click', function() {
            UI.closeModal();
            forwardPost(currentPostId);
        });

        document.getElementById('menu-delete')?.addEventListener('click', function() {
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
        var post = Store.getPost(postId);
        if (!post) return;

        var chars = Store.getChars().filter(function(c) { return c.id !== '__model__'; });
        var npcPool = Store.getNpcPool();
        var allCandidates = [];

        chars.forEach(function(c) { allCandidates.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64' }); });
        npcPool.forEach(function(n) { allCandidates.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64' }); });

        if (allCandidates.length === 0) {
            var npc = createRandomNpc();
            allCandidates.push({ id: npc.id, name: npc.name, avatar: npc.avatar });
        }

        var forwarder = allCandidates[Math.floor(Math.random() * allCandidates.length)];

        Store.addPost({
            authorId: forwarder.id,
            authorName: forwarder.name,
            authorAvatar: forwarder.avatar,
            title:'Fwd: ' + post.title,
            body: post.body,
            board: post.board || 'gossip',
            tags: post.tags || [],
            isForwarded: true,
            forwardFrom: postId,
            type: post.type || 'text'
        });

        renderPostList();
        UI.toast(forwarder.name + ' forwarded this post');

        Store.addLog({
            level: 'info',
            source: 'forum',
            message: forwarder.name + ' forwarded post: ' + post.title
        });
    }

    // ========================
    //  Reveal Anonymous
    // ========================
    function revealAnonymous() {
        var post = Store.getPost(currentPostId);
        if (!post || !post.isAnonymous) return;

        var canReveal = Store.useAnonReveal();
        if (!canReveal) {
            UI.toast('No reveals left today (3/3 used)');
            return;
        }

        var realName = post.realAuthorName ||'Unknown';
        var realAvatar = post.realAuthorAvatar || '\uD83D\uDC64';
        var remaining = 3 - Store.getAnonRevealCount();

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
    //  AI Reply to User Comment
    // ========================
    function triggerCharReplies(postId, userComment) {
        var chars = Store.getChars().filter(function(c) { return c.id !== '__model__'; });
        var npcPool = Store.getNpcPool();
        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        var allActors = [];
        chars.forEach(function(c) { allActors.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64', persona: c.persona || '' }); });
        npcPool.forEach(function(n) { allActors.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64', persona: n.persona || '' }); });
        if (allActors.length === 0) return;

        //1-3 replies with staggered delays
        var replyCount = 1+ Math.floor(Math.random() * 3);
        var usedActors = [];

        for (var i = 0; i < replyCount && i < allActors.length; i++) {
            var available = allActors.filter(function(a) { return usedActors.indexOf(a.id) < 0; });
            if (available.length === 0) break;
            var actor = available[Math.floor(Math.random() * available.length)];
            usedActors.push(actor.id);

            (function(a, delay) {
                setTimeout(function() {
                    autoReplyToPost(postId, a, settings.forumPrompt || '', userComment);
                }, delay);
            })(actor, (3+ Math.random() * 8+ i * 5) * 1000);
        }
    }

    // ========================
    //  Summon Passers-by
    // ========================
    function summonPassersby(btnEl) {
        if (!currentPostId) return;
        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) {
            UI.toast('Configure API first');
            return;
        }

        btnEl.classList.add('loading');
        btnEl.textContent = 'Summoning...';

        var post = Store.getPost(currentPostId);
        if (!post) { btnEl.classList.remove('loading'); return; }

        var count = 1+ Math.floor(Math.random() * 3);
        var npcs = [];
        for (var i = 0; i < count; i++) {
            var npc = Store.getRandomNpc();
            if (!npc || Math.random() > 0.6) {
                npc = createRandomNpc();
            }
            npcs.push(npc);
        }

        var existingComments = (post.comments || []).map(function(c) {
            return c.authorName +': ' + c.body;
        }).join('\n');

        var forumPrompt = settings.forumPrompt || '';
        var npcNames = npcs.map(function(n) { return n.name; }).join(', ');

        var prompt = 'You are generating forum comments from multiple passers-by on a dark gothic-themed forum.\n'
            + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
            + 'The passers-by are: ' + npcNames + '\n'
            + 'Each person should have a distinct voice. Keep each reply brief (1-2 sentences).\n'
            + 'Some replies may describe an image they want to share — if so, add "type":"image_desc" to that entry.\n'
            + 'Respond in JSON array: [{"name":"...","body":"...","type":"text"},...]';

        var context = 'Post title: ' + post.title + '\n'
            + 'Post body: ' + post.body + '\n'
            + (existingComments ? '\nExisting comments:\n' + existingComments : '')
            + '\n\nGenerate ' + count + ' comments from: ' + npcNames;

        AI.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: context }
        ], { temperature: 1.0, max_tokens: 12800 }).then(function(reply) {
            if (!post.comments) post.comments = [];

            try {
                var parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                if (Array.isArray(parsed)) {
                    parsed.forEach(function(item) {
                        var matchNpc = npcs.find(function(n) { return n.name === item.name; }) || npcs[0];
                        post.comments.push({
                            id: UI.genId('cmt'),
                            authorId: matchNpc.id,
                            authorName: matchNpc.name,
                            authorAvatar: matchNpc.avatar,
                            body: (item.body || item.content || '').trim(),
                            type: item.type === 'image_desc' ? 'image_desc' : 'text',
                            createdAt: Date.now() + Math.floor(Math.random() * 5000)
                        });
                    });
                }
            } catch (e) {
                var npc0 = npcs[0];
                post.comments.push({
                    id: UI.genId('cmt'),
                    authorId: npc0.id,
                    authorName: npc0.name,
                    authorAvatar: npc0.avatar,
                    body: reply.trim().slice(0, 300),
                    createdAt: Date.now()
                });
            }

            Store.updatePost(currentPostId, { comments: post.comments });
            renderPostDetail();
            renderPostList();

            Store.addLog({
                level: 'info',
                source: 'forum-summon',
                message: 'Summoned ' + npcs.length + ' passers-by for post: ' + post.title.slice(0, 40)
            });
        }).catch(function(e) {
            Store.addLog({
                level: 'error',
                source: 'forum-summon',
                message: 'Summon failed',
                detail: e.message || String(e),
                stack: e.stack || ''
            });
            UI.toast('Summoning failed...');
        }).finally(function() {
            btnEl.classList.remove('loading');
            btnEl.textContent = '\u2726 Summon Passers-by \u2726';
        });
    }

    // ========================
    //  NPC Creation
    // ========================
    function createRandomNpc() {
        var name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]
            + '_' + Math.floor(Math.random() * 999);
        var avatar = NPC_AVATARS[Math.floor(Math.random() * NPC_AVATARS.length)];
        return Store.addNpc({ name: name, avatar: avatar });
    }

    function aiCreateNpc() {
        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return Promise.resolve(createRandomNpc());

        var forumPrompt = settings.forumPrompt || '';
        var prompt = 'Create a unique forum user for a dark gothic-themed forum.\n'
            + (forumPrompt ? 'Forum vibe: ' + forumPrompt + '\n' : '')
            + 'Respond in JSON: {"name":"...","avatar":"(single emoji)","persona":"(one sentence)"}';

        return AI.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: 'Generate one new forum user.' }
        ], { temperature: 1.2, max_tokens: 100 }).then(function(reply) {
            try {
                var parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                if (parsed.name) {
                    return Store.addNpc({
                        name: parsed.name,
                        avatar: parsed.avatar || '\uD83D\uDC64',
                        persona: parsed.persona || ''
                    });
                }
            } catch (e) { /* fallback */ }
            return createRandomNpc();
        }).catch(function() {
            return createRandomNpc();
        });
    }

    // ========================
    //  Background Tasks
    // ========================
    function startBackgroundTasks() {
        scheduleForumAction();
        scheduleChatAction();
    }

    function stopBackgroundTasks() {
        if (autoPostTimer) { clearTimeout(autoPostTimer); autoPostTimer = null; }
        if (autoChatTimer) { clearTimeout(autoChatTimer); autoChatTimer = null; }
    }

    function restartBackgroundTasks() {
        stopBackgroundTasks();
        startBackgroundTasks();
    }

    // --- Forum auto-post/reply ---
    function scheduleForumAction() {
        var bgSettings = Store.getBgSettings();
        if (!bgSettings.enabled) {
            autoPostTimer = setTimeout(scheduleForumAction, 30000);
            return;
        }

        var interval = (bgSettings.forumPostInterval || 180) * 1000;
        var jitter = interval * 0.3* (Math.random() - 0.5);

        autoPostTimer = setTimeout(function() {
            performForumAction().finally(scheduleForumAction);
        }, interval + jitter);
    }

    function performForumAction() {
        var bgSettings = Store.getBgSettings();
        if (!bgSettings.enabled) return Promise.resolve();

        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return Promise.resolve();

        var postChance = (bgSettings.forumPostChance || 50) / 100;
        if (Math.random() > postChance) {
            Store.addLog({ level: 'info', source: 'forum-bg', message: 'Skipped (chance roll failed)' });
            return Promise.resolve();
        }

        var chars = Store.getChars().filter(function(c) { return c.id !== '__model__'; });
        var npcPool = Store.getNpcPool();
        var allActors = [];
        chars.forEach(function(c) { allActors.push({ id: c.id, name: c.name, avatar: c.avatar || '\uD83D\uDC64', persona: c.persona || '' }); });
        npcPool.forEach(function(n) { allActors.push({ id: n.id, name: n.name, avatar: n.avatar || '\uD83D\uDC64', persona: n.persona || '' }); });

        if (allActors.length === 0) {
            return aiCreateNpc().then(function(npc) {
                return autoCreatePost(npc, settings.forumPrompt || '');
            });
        }

        var actor = allActors[Math.floor(Math.random() * allActors.length)];
        var posts = Store.getPosts();
        var forumPrompt = settings.forumPrompt || '';

        var roll = Math.random();
        if (roll < 0.15&& npcPool.length < 30) {
            return aiCreateNpc().then(function(npc) {
                return autoCreatePost(npc, forumPrompt);
            });
        } else if (posts.length === 0 || roll < 0.55) {
            return autoCreatePost(actor, forumPrompt);
        } else {
            var replyChance = (bgSettings.forumReplyChance || 50) / 100;
            if (Math.random() <= replyChance) {
                var randomPost = posts[Math.floor(Math.random() * posts.length)];
                return autoReplyToPost(randomPost.id, actor, forumPrompt, null);
            }
            return Promise.resolve();
        }
    }

    // --- Chat auto-message ---
    function scheduleChatAction() {
        var bgSettings = Store.getBgSettings();
        if (!bgSettings.enabled || !bgSettings.chatMessageEnabled) {
            autoChatTimer = setTimeout(scheduleChatAction, 30000);
            return;
        }

        var interval = (bgSettings.chatMessageInterval || 300) * 1000;
        var jitter = interval * 0.3 * (Math.random() - 0.5);

        autoChatTimer = setTimeout(function() {
            performChatAction().finally(scheduleChatAction);
        }, interval + jitter);
    }

    function performChatAction() {
        var bgSettings = Store.getBgSettings();
        if (!bgSettings.enabled || !bgSettings.chatMessageEnabled) return Promise.resolve();

        var settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return Promise.resolve();

        var chatChance = (bgSettings.chatMessageChance || 30) / 100;
        if (Math.random() > chatChance) {
            Store.addLog({ level: 'info', source: 'chat-bg', message: 'Skipped (chance roll failed)' });
            return Promise.resolve();
        }

        var chars = Store.getChars().filter(function(c) { return c.id !== '__model__'; });
        if (chars.length === 0) return Promise.resolve();

        var char = chars[Math.floor(Math.random() * chars.length)];

        Store.addLog({
            level: 'info',
            source: 'chat-bg',
            message: 'Triggering proactive message from ' + char.name
        });

        return Chat.sendBgMessage(char.id).catch(function(e) {
            Store.addLog({
                level: 'error',
                source: 'chat-bg',
                message: 'Proactive chat failed for ' + char.name,
                detail: e.message || String(e),
                stack: e.stack || ''
            });
        });
    }

    // ========================
    //  Auto Create Post
    // ========================
    function autoCreatePost(actor, forumPrompt) {
        var randomBoard = BOARDS.filter(function(b) { return b.id !=='all'; });
        var board = randomBoard[Math.floor(Math.random() * randomBoard.length)];

        var prompt = 'You are ' + actor.name + '. ' + (actor.persona || '') + '\n'
            + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
            + 'You are posting in the "' + board.name + '" section of a dark gothic-themed forum.\n'
            + 'Write a short forum post. Stay in character.\n'
            + 'If you want to describe an image, set type to "image_desc".\n'
            + 'Respond in JSON: {"title":"...","body":"...","tags":["tag1"],"type":"text or image_desc"}';

        return AI.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: 'Write a new forum post for the ' + board.name + ' board.' }
        ], { temperature: 1.0, max_tokens: 12800 }).then(function(reply) {
            var title, body, tags = [], postType = 'text';
            try {
                var parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                title = parsed.title;
                body = parsed.body;
                tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [];
                postType = parsed.type === 'image_desc' ? 'image_desc' : 'text';
            } catch (e) {
                title = actor.name + '\'s thoughts';
                body = reply.slice(0, 500);
            }

            if (title && body) {
                var isAnon = Math.random() < 0.15;
                var postData = {
                    authorId: actor.id,
                    authorName: actor.name,
                    authorAvatar: actor.avatar,
                    title: title,
                    body: body,
                    board: board.id,
                    tags: tags,
                    isAnonymous: isAnon,
                    type: postType
                };
                if (isAnon) {
                    postData.realAuthorId = actor.id;
                    postData.realAuthorName = actor.name;
                    postData.realAuthorAvatar = actor.avatar;
                }
                Store.addPost(postData);

                Store.addLog({
                    level: 'info',
                    source: 'forum-bg',
                    message: actor.name + ' posted: ' + title.slice(0, 50),
                    detail: 'Board: ' + board.id + ' | Type: ' + postType + (isAnon ? ' | Anonymous' : '')
                });

                if (document.getElementById('page-forum-list').classList.contains('active')) {
                    renderPostList();
                }
            }
        }).catch(function(e) {
            Store.addLog({
                level: 'error',
                source: 'forum-bg',
                message: 'Auto-post failed for ' + actor.name,
                detail: e.message || String(e),
                stack: e.stack || ''
            });
        });
    }

    // ========================
    //  Auto Reply to Post
    // ========================
    function autoReplyToPost(postId, actor, forumPrompt, userComment) {
        var post = Store.getPost(postId);
        if (!post) return Promise.resolve();

        var existingComments = (post.comments || []).map(function(c) {
            return c.authorName + ': ' + c.body;
        }).join('\n');

        var prompt = 'You are ' + actor.name + '. ' + (actor.persona || '') + '\n'
            + (forumPrompt ? 'Forum rules: ' + forumPrompt + '\n' : '')
            + 'You are replying to a forum post. Stay in character. Keep your reply brief (1-3 sentences).\n'
            + 'If you want to describe an image in your reply, start with [IMAGE] then describe it.';

        var context = 'Post title: ' + post.title + '\n'
            + 'Post body: ' + post.body + '\n'
            + (existingComments ? '\nExisting comments:\n' + existingComments : '');

        if (userComment) {
            context += '\n\nThe user just commented: "' + userComment + '"\nReply to the user\'s comment specifically.';
        } else {
            context += '\n\nWrite your reply:';
        }

        return AI.chat([
            { role: 'system', content: prompt },
            { role: 'user', content: context }
        ], { temperature: 0.9, max_tokens: 128000 }).then(function(reply) {
            if (!post.comments) post.comments = [];

            var replyText = reply.trim();
            var commentType = 'text';
            if (replyText.startsWith('[IMAGE]')) {
                commentType = 'image_desc';replyText = replyText.replace(/^\[IMAGE\]\s*/i, '');
            }

            var isAnon = Math.random() < 0.1;
            post.comments.push({
                id: UI.genId('cmt'),
                authorId: actor.id,
                authorName: actor.name,
                authorAvatar: actor.avatar,
                body: replyText,
                type: commentType,
                createdAt: Date.now(),
                isAnonymous: isAnon
            });

            //10% chance to forward
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
                    forwardFrom: postId,
                    type: post.type || 'text'
                });
            }

            Store.updatePost(postId, { comments: post.comments });

            Store.addLog({
                level: 'info',
                source: 'forum-reply',
                message: actor.name + ' replied to: ' + post.title.slice(0, 40),
                detail: replyText.slice(0, 80)
            });

            if (currentPostId === postId && document.getElementById('page-forum-post').classList.contains('active')) {
                renderPostDetail();
            }
            if (document.getElementById('page-forum-list').classList.contains('active')) {
                renderPostList();
            }
        }).catch(function(e) {
            Store.addLog({
                level: 'error',
                source: 'forum-reply',
                message: 'Reply failed for ' + actor.name,
                detail: e.message || String(e),
                stack: e.stack || ''
            });
        });
    }

    return {
        init: init,
        renderPostList: renderPostList,
        openPost: openPost,
        renderTabBar: renderTabBar,
        restartBackgroundTasks: restartBackgroundTasks
    };
})();

