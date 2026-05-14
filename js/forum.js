const Forum = (() => {
    let currentPostId = null;
    let autoPostTimer = null;

    function init() {
        bindEvents();
        startAutoPosting();
    }

    function bindEvents() {
        document.getElementById('btn-new-post').addEventListener('click', showNewPostModal);
        document.getElementById('btn-comment').addEventListener('click', submitComment);

        const commentInput = document.getElementById('comment-input');
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment();
            }
        });
    }

    function renderPostList() {
        const container = document.getElementById('forum-posts');
        const posts = Store.getPosts();
        const settings = Store.getSettings();

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⛧</div>
                    <p>The forum is silent... for now</p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            const isUpvoted = post.upvotedBy && post.upvotedBy.includes('__user__');
            return `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-card-header">
                        ${UI.renderAvatar(post.authorAvatar, 28)}
                        <span class="post-author">${UI.escapeHtml(post.authorName || 'Anonymous')}</span>
                        <span class="post-timestamp">${UI.formatTime(post.createdAt)}</span>
                    </div>
                    <div class="post-card-title">${UI.escapeHtml(post.title)}</div>
                    <div class="post-card-body">${UI.escapeHtml(post.body)}</div>
                    <div class="post-card-footer">
                        <div class="post-stat ${isUpvoted ? 'upvoted' : ''}" data-action="upvote" data-post-id="${post.id}">
                            ▲ ${post.upvotes || 0}
                        </div>
                        <div class="post-stat">💬 ${(post.comments || []).length}
                        </div>
                    </div>
                </div>`;
        }).join('');

        // Bind click events
        container.querySelectorAll('.post-card').forEach(el => {
            el.addEventListener('click', (e) => {
                // Don't navigate if clicking upvote
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

        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(c => `
                <div class="comment-item ${c.isReply ? 'reply' : ''}">
                    <div class="comment-header">
                        ${UI.renderAvatar(c.authorAvatar, 22)}
                        <span class="comment-author">${UI.escapeHtml(c.authorName || 'Anonymous')}</span>
                        <span class="comment-time">${UI.formatTime(c.createdAt)}</span>
                    </div>
                    <div class="comment-body">${UI.escapeHtml(c.body)}</div></div>
            `).join('');
        }

        container.innerHTML = `
            <div class="post-detail-card">
                <div class="post-card-header">
                    ${UI.renderAvatar(post.authorAvatar, 32)}
                    <span class="post-author">${UI.escapeHtml(post.authorName || 'Anonymous')}</span>
                    <span class="post-timestamp">${UI.formatTime(post.createdAt)}</span>
                </div>
                <div class="post-detail-title">${UI.escapeHtml(post.title)}</div>
                <div class="post-detail-body">${UI.escapeHtml(post.body)}</div>
                <div class="post-detail-footer">
                    <div class="post-stat ${isUpvoted ? 'upvoted' : ''}" data-action="upvote-detail">
                        ▲ ${post.upvotes || 0}
                    </div>
                    <div class="post-stat">
                        💬 ${(post.comments || []).length}
                    </div>
                </div>
            </div>
            <div class="comments-section">
                <div class="comments-header">☽ Comments</div>
                ${commentsHtml || '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px;">No comments yet</div>'}
            </div>`;

        // Bind upvote
        container.querySelector('[data-action="upvote-detail"]')?.addEventListener('click', () => {
            toggleUpvote(currentPostId);
            renderPostDetail();
        });
    }

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
            authorAvatar: settings.userAvatar || '😈',
            body: body,
            createdAt: Date.now()
        });

        Store.updatePost(currentPostId, { comments: post.comments });
        renderPostDetail();
        renderPostList();

        // Trigger AI reply after a delay
        triggerCharReply(currentPostId);
    }

    function showNewPostModal() {
        UI.showModal(`
            <h3>⛧ New Post</h3>
            <div class="setting-item">
                <label>Title</label>
                <input type="text" id="new-post-title" placeholder="Post title...">
            </div>
            <div class="setting-item">
                <label>Body</label>
                <textarea id="new-post-body" rows="5" placeholder="What's on your mind..."></textarea>
            </div>
            <div class="modal-btns">
                <button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>
                <button class="gothic-btn primary" id="btn-submit-post">Post</button>
            </div>
        `);

        document.getElementById('btn-submit-post').addEventListener('click', () => {
            const title = document.getElementById('new-post-title').value.trim();
            const body = document.getElementById('new-post-body').value.trim();

            if (!title) {
                UI.toast('Title is required');
                return;
            }

            const settings = Store.getSettings();
            Store.addPost({
                authorId: '__user__',
                authorName: settings.username || 'User',
                authorAvatar: settings.userAvatar || '😈',
                title,
                body
            });

            UI.closeModal();
            renderPostList();
            UI.toast('Post created');
        });
    }

    // --- AI Auto-posting ---
    function startAutoPosting() {
        // Every 2-5 minutes, a random char might post or reply
        scheduleNextAutoAction();
    }

    function scheduleNextAutoAction() {
        const delay = (120+ Math.random() * 180) * 1000; // 2-5 min
        autoPostTimer = setTimeout(async () => {
            await performAutoAction();
            scheduleNextAutoAction();
        }, delay);
    }

    async function performAutoAction() {
        const chars = Store.getChars().filter(c => c.id !== '__model__');
        if (chars.length === 0) return;

        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        const char = chars[Math.floor(Math.random() * chars.length)];
        const posts = Store.getPosts();

        //50% chance to create post, 50% to reply
        if (posts.length === 0 || Math.random() > 0.5) {
            // Create a new post
            try {
                const prompt = `You are ${char.name}. ${char.persona || ''}\n\nWrite a short forum post. You're posting on a dark gothic-themed forum. Be in character. Respond in JSON format: {"title": "...", "body": "..."}`;

                const reply = await AI.chat([
                    { role: 'system', content: prompt },
                    { role: 'user', content: 'Write a new forum post. Keep it brief and in character.' }
                ], { temperature: 1.0, max_tokens: 300 });

                try {
                    const parsed = JSON.parse(reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
                    if (parsed.title && parsed.body) {
                        Store.addPost({
                            authorId: char.id,
                            authorName: char.name,
                            authorAvatar: char.avatar || '👤',
                            title: parsed.title,
                            body: parsed.body
                        });

                        // Refresh if on forum page
                        if (document.getElementById('page-forum-list').classList.contains('active')) {
                            renderPostList();
                        }
                    }
                } catch {
                    // If JSON parse fails, use raw text
                    Store.addPost({
                        authorId: char.id,
                        authorName: char.name,
                        authorAvatar: char.avatar || '👤',
                        title: char.name + '\'s thoughts',
                        body: reply.slice(0, 500)
                    });
                }
            } catch (e) {
                console.error('Auto-post failed:', e);
            }
        } else {
            // Reply to a random post
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            await triggerCharReplyForChar(randomPost.id, char);
        }
    }

    async function triggerCharReply(postId) {
        const chars = Store.getChars().filter(c => c.id !== '__model__');
        if (chars.length === 0) return;

        const settings = Store.getSettings();
        if (!settings.apiUrl || !settings.model) return;

        // Random delay5-15 seconds
        const delay = (5 + Math.random() * 10) * 1000;
        setTimeout(async () => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            await triggerCharReplyForChar(postId, char);
        }, delay);
    }

    async function triggerCharReplyForChar(postId, char) {
        const post = Store.getPost(postId);
        if (!post) return;

        try {
            const existingComments = (post.comments || []).map(c =>
                `${c.authorName}: ${c.body}`
            ).join('\n');

            const prompt = `You are ${char.name}. ${char.persona || ''}\n\nYou're replying to a forum post on a dark gothic-themed forum. Stay in character. Keep your reply brief (1-3 sentences).`;

            const context = `Post title: ${post.title}\nPost body: ${post.body}\n${existingComments ? '\nExisting comments:\n' + existingComments : ''}\n\nWrite your reply:`;

            const reply = await AI.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: context }
            ], { temperature: 0.9, max_tokens: 200 });

            if (!post.comments) post.comments = [];
            post.comments.push({
                id: UI.genId('cmt'),
                authorId: char.id,
                authorName: char.name,
                authorAvatar: char.avatar || '👤',
                body: reply.trim(),
                createdAt: Date.now()
            });

            Store.updatePost(postId, { comments: post.comments });

            // Refresh views
            if (currentPostId === postId && document.getElementById('page-forum-post').classList.contains('active')) {
                renderPostDetail();
            }
            if (document.getElementById('page-forum-list').classList.contains('active')) {
                renderPostList();
            }
        } catch (e) {
            console.error('Char reply failed:', e);
        }
    }

    return { init, renderPostList, openPost };
})();
