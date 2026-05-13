/* ========== Chat App 模块 开始 ========== */

const ChatApp = (() => {
  'use strict';

  /* ========== 常量 开始 ========== */
  const STORE_KEY = 'chat_data';
  const SUMMARY_EVERY = 30; // 每30条触发一次总结
  /* ========== 常量 结束 ========== */

  /* ========== 内置贴纸库 开始 ========== */
  const STICKER_PACKS = [
    {
      id: 'basic',
      icon: '😊',
      name: '基础',
      stickers: ['😊','😂','🥹','😍','🥰','😘','😎','🤩','😭','😤','😡','🥺','😴','🤔','😏','🫡','🤗','😇','🥳','😱'],
    },
    {
      id: 'love',
      icon: '❤️',
      name: '爱心',
      stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘','💟','❣️','💔','🫀','♥️'],
    },
    {
      id: 'gesture',
      icon: '👍',
      name: '手势',
      stickers: ['👍','👎','👏','🙌','🤝','🫶','✌️','🤞','🤟','🤘','👌','🤌','🤏','☝️','👆','👇','👈','👉','🫵','✋'],
    },
    {
      id: 'nature',
      icon: '🌸',
      name: '自然',
      stickers: ['🌸','🌺','🌻','🌹','🌷','🌼','💐','🍀','🌿','🍃','🌱','🌲','🌳','🍁','🍂','🌾','🌵','🎋','🎍','🪴'],
    },
    {
      id: 'food',
      icon: '🍰',
      name: '美食',
      stickers: ['🍰','🎂','🧁','🍩','🍪','🍫','🍬','🍭','🍮','🍯','🍦','🍧','🍨','🍡','🧃','🧋','☕','🍵','🥤','🍺'],
    },
  ];
  /* ========== 内置贴纸库 结束 ========== */

  /* ========== 状态 开始 ========== */
  let _data = null;          // { contacts: [], groups: [], userStickers: [] }
  let _currentChatId = null; // 当前打开的聊天 ID
  let _currentTab = 'chats'; // 'chats' | 'groups'
  let _stickerTab = 0;       // 当前贴纸包索引
  let _stickerPanelOpen = false;
  let _isAiTyping = false;
  /* ========== 状态 结束 ========== */

  /* ========== 数据初始化 开始 ========== */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        _data = JSON.parse(raw);
      }
    } catch (e) { /* ignore */ }

    if (!_data) {
      _data = { contacts: [], groups: [], userStickers: [] };
    }
    // 兼容旧数据结构
    if (!_data.contacts) _data.contacts = [];
    if (!_data.groups)   _data.groups   = [];
    if (!_data.userStickers) _data.userStickers = [];
  }

  function saveData() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(_data));
    } catch (e) {
      MiniApp.showToast('存储空间不足 ⚠️');
    }
  }
  /* ========== 数据初始化 结束 ========== */

  /* ========== 工具函数 开始 ========== */
  function genId() {
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatListTime(ts) {
    if (!ts) return '';
    const now = new Date();
    const d = new Date(ts);
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return formatTime(ts);
    if (diffDays === 1) return '昨天';
    if (diffDays < 7)  return ['日','一','二','三','四','五','六'][d.getDay()] ? `周${['日','一','二','三','四','五','六'][d.getDay()]}` : '';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function formatDateDivider(ts) {
    const now = new Date();
    const d = new Date(ts);
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  function needDateDivider(msgs, index) {
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].ts);
    const curr = new Date(msgs[index].ts);
    return prev.toDateString() !== curr.toDateString();
  }

  function isConsecutive(msgs, index) {
    if (index === 0) return false;
    const prev = msgs[index - 1];
    const curr = msgs[index];
    return prev.role === curr.role &&
           prev.senderId === curr.senderId &&
           (curr.ts - prev.ts) < 60000;
  }

  function getChatById(id) {
    return _data.contacts.find(c => c.id === id) ||
           _data.groups.find(g => g.id === id) || null;
  }

  function isGroup(id) {
    return _data.groups.some(g => g.id === id);
  }
  /* ========== 工具函数 结束 ========== */

  /* ========== App 入口 开始 ========== */
  function open() {
    loadData();
    const $content = document.getElementById('app-content');
    // 重置 app-view 的 overflow，让内部自己管理滚动
    // 强制设置背景色
  $appView.style.background = 'var(--chat-bg)';
    const $appView = document.getElementById('app-view');
    $appView.style.overflowY = 'hidden';
    $appView.style.padding = '0';

    $content.style.padding = '0';
    $content.style.minHeight = 'unset';
    $content.style.height = '100%';

    renderListView($content);
  }
  /* ========== App 入口 结束 ========== */

  /* ========== 聊天列表视图 开始 ========== */
  function renderListView($container) {
    _currentChatId = null;

    const allChats = getTabChats();
    const listHtml = allChats.length
      ? allChats.map(c => renderChatListItem(c)).join('')
      : renderEmptyList();

    $container.innerHTML = `
      <div class="chat-app">
        <!-- 顶部栏 -->
        <div class="chat-header">
          <button class="chat-header__back" id="chat-back-home" aria-label="返回主屏幕">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="chat-header__info">
            <div class="chat-header__name">聊天</div>
          </div>
          <div class="chat-header__actions">
            <button class="chat-header__btn" id="chat-new-btn" aria-label="新建聊天">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="chat-list-tabs">
          <button class="chat-list-tab ${_currentTab === 'chats' ? 'active' : ''}" data-tab="chats">私聊</button>
          <button class="chat-list-tab ${_currentTab === 'groups' ? 'active' : ''}" data-tab="groups">群聊</button>
        </div>

        <!-- 列表 -->
        <div class="chat-list-scroll" id="chat-list-scroll">
          ${listHtml}
        </div>

        <!-- 新建 FAB（群聊 tab 时显示） -->
        ${_currentTab === 'groups' ? `<button class="chat-fab" id="chat-new-group-fab" aria-label="新建群聊">＋</button>` : ''}
      </div>
    `;

    bindListEvents($container);
  }

  function getTabChats() {
    const list = _currentTab === 'chats' ? _data.contacts : _data.groups;
    return [...list].sort((a, b) => {
      const ta = a.messages?.at(-1)?.ts || 0;
      const tb = b.messages?.at(-1)?.ts || 0;
      return tb - ta;
    });
  }

  function renderChatListItem(chat) {
    const lastMsg = chat.messages?.at(-1);
    const preview = lastMsg
      ? (lastMsg.type === 'sticker' ? '[贴纸]' : lastMsg.type === 'image' ? '[图片]' : escHtml(String(lastMsg.content || '').slice(0, 40)))
      : '暂无消息';
    const timeStr = formatListTime(lastMsg?.ts);
    const unread = chat.unread || 0;

    let avatarHtml;
    if (chat.isGroup) {
      const members = (chat.members || []).slice(0, 4);
      avatarHtml = `<div class="chat-list-item__avatar chat-list-item__avatar--group">
        ${members.map(m => `<span>${m.avatar || '👤'}</span>`).join('')}
      </div>`;
    } else if (chat.avatarUrl) {
      avatarHtml = `<div class="chat-list-item__avatar"><img src="${escHtml(chat.avatarUrl)}" alt="" onerror="this.parentElement.textContent='${escHtml(chat.avatar || '👤')}'"></div>`;
    } else {
      avatarHtml = `<div class="chat-list-item__avatar">${escHtml(chat.avatar || '👤')}</div>`;
    }

    return `
      <div class="chat-list-item" data-chat-id="${escHtml(chat.id)}">
        ${avatarHtml}
        <div class="chat-list-item__body">
          <div class="chat-list-item__top">
            <span class="chat-list-item__name">${escHtml(chat.name)}</span>
            <span class="chat-list-item__time">${timeStr}</span>
          </div>
          <div class="chat-list-item__preview">${preview}</div>
        </div>
        ${unread > 0 ? `<div class="chat-list-item__badge">${unread > 99 ? '99+' : unread}</div>` : ''}
      </div>
    `;
  }

  function renderEmptyList() {
    const isGroup = _currentTab === 'groups';
    return `
      <div class="chat-list-empty">
        <div class="chat-list-empty__icon">${isGroup ? '👥' : '💬'}</div>
        <div class="chat-list-empty__text">${isGroup ? '还没有群聊' : '还没有聊天'}</div>
        <div class="chat-list-empty__sub">${isGroup ? '点击右上角 + 创建群聊' : '点击右上角 + 添加角色卡开始聊天'}</div>
      </div>
    `;
  }

  function bindListEvents($container) {
    $container.querySelector('#chat-back-home')?.addEventListener('click', () => {
      document.getElementById('app-view').style.overflowY = '';
      document.getElementById('app-content').style.padding = '';
      document.getElementById('app-content').style.minHeight = '';
      document.getElementById('app-content').style.height = '';
      MiniApp.closeApp();
    });

    $container.querySelectorAll('.chat-list-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _currentTab = tab.dataset.tab;
        renderListView($container);
      });
    });

    $container.querySelector('#chat-new-btn')?.addEventListener('click', () => {
      if (_currentTab === 'groups') openNewGroupModal($container);
      else openNewChatModal($container);
    });

    $container.querySelector('#chat-new-group-fab')?.addEventListener('click', () => {
      openNewGroupModal($container);
    });

    $container.querySelectorAll('.chat-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.chatId;
        const chat = getChatById(id);
        if (!chat) return;
        // 清除未读
        chat.unread = 0;
        saveData();
        openChatView($container, id);
      });
    });
  }
  /* ========== 聊天列表视图 结束 ========== */

  /* ========== 聊天消息视图 开始 ========== */
  function openChatView($container, chatId) {
    _currentChatId = chatId;
    _stickerPanelOpen = false;
    const chat = getChatById(chatId);
    if (!chat) return;

    renderChatView($container, chat);
  }

  function renderChatView($container, chat) {
    const hasSummary = !!chat.summary;

    let avatarHtml;
    if (chat.avatarUrl) {
      avatarHtml = `<div class="chat-header__avatar"><img src="${escHtml(chat.avatarUrl)}" alt=""></div>`;
    } else {
      avatarHtml = `<div class="chat-header__avatar">${escHtml(chat.avatar || '👤')}</div>`;
    }

    $container.innerHTML = `
      <div class="chat-app">
        <!-- 顶部栏 -->
        <div class="chat-header">
          <button class="chat-header__back" id="chat-back-list" aria-label="返回列表">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          ${avatarHtml}
          <div class="chat-header__info">
            <div class="chat-header__name">${escHtml(chat.name)}</div>
            <div class="chat-header__sub">${chat.isGroup ? `${(chat.members || []).length} 位成员` : escHtml(chat.persona?.slice(0, 30) || '')}</div>
          </div>
          <div class="chat-header__actions">
            <button class="chat-header__btn" id="chat-sidebar-btn" aria-label="聊天信息">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 总结提示条 -->
        ${hasSummary ? `
          <div class="chat-summary-banner" id="chat-summary-banner">
            <span class="chat-summary-banner__icon">📝</span>
            <span class="chat-summary-banner__text">${escHtml(chat.summary.slice(0, 60))}…</span>
            <span class="chat-summary-banner__arrow">›</span>
          </div>
        ` : ''}

        <!-- 消息区 -->
        <div class="chat-messages-scroll" id="chat-messages-scroll">
          ${renderMessages(chat)}
        </div>

        <!-- 输入栏 -->
        <div class="chat-input-bar" id="chat-input-bar">
          <button class="chat-input-bar__btn" id="chat-sticker-btn" aria-label="贴纸">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9.5" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="8" cy="9.5" r="1.2" fill="currentColor"/>
              <circle cx="14" cy="9.5" r="1.2" fill="currentColor"/>
              <path d="M7.5 13.5c.8 1.5 6.2 1.5 7 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="chat-input-wrap">
            <textarea class="chat-input" id="chat-input" rows="1" placeholder="输入消息…" aria-label="消息输入框"></textarea>
          </div>
          <button class="chat-send-btn" id="chat-send-btn" aria-label="发送">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <!-- 贴纸面板（默认隐藏） -->
        <div class="chat-sticker-panel" id="chat-sticker-panel" style="display:none;">
          <div class="chat-sticker-panel__tabs" id="sticker-tabs"></div>
          <div class="chat-sticker-grid" id="sticker-grid"></div>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div class="chat-sidebar-overlay" id="chat-sidebar-overlay">
        <div class="chat-sidebar" id="chat-sidebar">
          ${renderSidebar(chat)}
        </div>
      </div>
    `;

    scrollToBottom(false);
    bindChatViewEvents($container, chat);
  }

  function renderMessages(chat) {
    const msgs = chat.messages || [];
    if (!msgs.length) {
      return `<div style="text-align:center;padding:40px 0;color:var(--chat-timestamp);font-size:13px;">
        发送第一条消息吧 👋
      </div>`;
    }

    let html = '';
    msgs.forEach((msg, i) => {
      if (needDateDivider(msgs, i)) {
        html += `<div class="chat-date-divider"><span>${formatDateDivider(msg.ts)}</span></div>`;
      }

      if (msg.type === 'system') {
        html += `<div class="chat-msg-system">${escHtml(msg.content)}</div>`;
        return;
      }

      const isMe = msg.role === 'user';
      const consecutive = isConsecutive(msgs, i);
      const chat_obj = getChatById(_currentChatId);

      // 头像
      let avatarHtml = '';
      if (!isMe) {
        let avatarContent;
        if (chat_obj?.isGroup) {
          const member = (chat_obj.members || []).find(m => m.id === msg.senderId);
          avatarContent = member?.avatarUrl
            ? `<img src="${escHtml(member.avatarUrl)}" alt="">`
            : escHtml(member?.avatar || '👤');
        } else {
          avatarContent = chat_obj?.avatarUrl
            ? `<img src="${escHtml(chat_obj.avatarUrl)}" alt="">`
            : escHtml(chat_obj?.avatar || '👤');
        }
        avatarHtml = `<div class="chat-msg-avatar">${avatarContent}</div>`;
      }

      // 气泡内容
      let bubbleContent;
      if (msg.type === 'sticker') {
        bubbleContent = `<div class="chat-bubble chat-bubble--sticker">
          ${msg.stickerUrl
            ? `<img src="${escHtml(msg.stickerUrl)}" alt="贴纸">`
            : `<span class="sticker-emoji">${escHtml(msg.content)}
                        </span>`
          }
        </div>`;
      } else if (msg.type === 'image') {
        bubbleContent = `<div class="chat-bubble chat-bubble--image">
          <img src="${escHtml(msg.content)}" alt="图片" loading="lazy">
        </div>`;
      } else {
        bubbleContent = `<div class="chat-bubble chat-bubble--${isMe ? 'me' : 'other'}">${escHtml(msg.content)}</div>`;
      }

      // 发送者名字（群聊非连续时显示）
      let senderName = '';
      if (!isMe && chat_obj?.isGroup && !consecutive) {
        const member = (chat_obj.members || []).find(m => m.id === msg.senderId);
        if (member) {
          senderName = `<div class="chat-msg-sender">${escHtml(member.name)}</div>`;
        }
      }

      // 时间 + 已读
      const metaHtml = `
        <div class="chat-msg-meta">
          <span class="chat-msg-time">${formatTime(msg.ts)}</span>
          ${isMe ? `<span class="chat-msg-read">已读</span>` : ''}
        </div>
      `;

      html += `
        <div class="chat-msg-row ${isMe ? 'chat-msg-row--me' : ''} ${consecutive ? 'chat-msg-row--consecutive' : ''}">
          ${!isMe ? avatarHtml : ''}
          <div class="chat-msg-content">
            ${senderName}
            ${bubbleContent}
            ${metaHtml}
          </div>
          ${isMe ? avatarHtml : ''}
        </div>
      `;
    });

    return html;
  }

  function renderSidebar(chat) {
    const isGrp = !!chat.isGroup;
    return `
      <div class="chat-sidebar__header">
        <div class="chat-sidebar__avatar">
          ${chat.avatarUrl
            ? `<img src="${escHtml(chat.avatarUrl)}" alt="">`
            : escHtml(chat.avatar || '👤')}
        </div>
        <div class="chat-sidebar__name">${escHtml(chat.name)}</div>
        <div class="chat-sidebar__sub">${isGrp ? `${(chat.members || []).length} 位成员` : escHtml(chat.persona?.slice(0, 50) || '暂无简介')}</div>
      </div>

      ${!isGrp ? `
      <div class="chat-sidebar__section">
        <div class="chat-sidebar__section-title">角色设定</div>
        <div class="chat-sidebar__summary-box">${escHtml(chat.systemPrompt || '未设置系统提示词')}</div>
      </div>
      ` : ''}

      ${chat.summary ? `
      <div class="chat-sidebar__section">
        <div class="chat-sidebar__section-title">对话摘要</div>
        <div class="chat-sidebar__summary-box">${escHtml(chat.summary)}</div>
      </div>
      ` : ''}

      ${isGrp ? `
      <div class="chat-sidebar__section">
        <div class="chat-sidebar__section-title">群成员</div>
        ${(chat.members || []).map(m => `
          <div class="chat-sidebar__row">
            <span>${escHtml(m.avatar || '👤')} ${escHtml(m.name)}</span>
            <span class="chat-sidebar__row-label">${escHtml(m.persona?.slice(0, 12) || '')}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="chat-sidebar__section">
        <div class="chat-sidebar__section-title">知识书</div>
        <div id="sidebar-kb-list">
          ${renderKbList(chat)}
        </div>
        <button class="chat-sidebar__action" id="sidebar-kb-add">
          <span>📖</span> 添加知识条目
        </button>
      </div>

      <div class="chat-sidebar__section">
        <button class="chat-sidebar__action" id="sidebar-edit-btn">
          <span>✏️</span> 编辑${isGrp ? '群聊' : '角色卡'}
        </button>
        <button class="chat-sidebar__action" id="sidebar-clear-btn">
          <span>🗑️</span> 清空聊天记录
        </button>
        <button class="chat-sidebar__action chat-sidebar__action--danger" id="sidebar-delete-btn">
          <span>❌</span> 删除${isGrp ? '群聊' : '联系人'}
        </button>
      </div>
    `;
  }

  function renderKbList(chat) {
    const kb = chat.knowledgeBase || [];
    if (!kb.length) return `<div style="font-size:12px;color:var(--text-tertiary);padding:4px 0 8px;">暂无知识条目</div>`;
    return kb.map((item, i) => `
      <div class="chat-kb-item">
        <span class="chat-kb-item__icon">📌</span>
        <span class="chat-kb-item__text">${escHtml(item)}</span>
        <button class="chat-kb-item__del" data-kb-index="${i}" aria-label="删除">✕</button>
      </div>
    `).join('');
  }
  /* ========== 聊天消息视图 结束 ========== */

  /* ========== 聊天视图事件绑定 开始 ========== */
  function bindChatViewEvents($container, chat) {
    // 返回列表
    $container.querySelector('#chat-back-list')?.addEventListener('click', () => {
      renderListView($container);
    });

    // 总结提示条点击
    $container.querySelector('#chat-summary-banner')?.addEventListener('click', () => {
      openSidebar();
    });

    // 侧边栏
    $container.querySelector('#chat-sidebar-btn')?.addEventListener('click', openSidebar);
    $container.querySelector('#chat-sidebar-overlay')?.addEventListener('click', (e) => {
      if (e.target === $container.querySelector('#chat-sidebar-overlay')) closeSidebar();
    });

    function openSidebar() {
      $container.querySelector('#chat-sidebar-overlay')?.classList.add('open');
      bindSidebarEvents($container, chat);
    }

    function closeSidebar() {
      $container.querySelector('#chat-sidebar-overlay')?.classList.remove('open');
    }

    // 输入框自动扩展
    const $input = $container.querySelector('#chat-input');
    const $sendBtn = $container.querySelector('#chat-send-btn');

    $input?.addEventListener('input', () => {
      $input.style.height = 'auto';
      $input.style.height = Math.min($input.scrollHeight, 108) + 'px';
      $sendBtn?.classList.toggle('active', $input.value.trim().length > 0);
    });

    $input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 发送按钮
    $sendBtn?.addEventListener('click', sendMessage);

    // 贴纸按钮
    $container.querySelector('#chat-sticker-btn')?.addEventListener('click', toggleStickerPanel);

    function sendMessage() {
      const text = $input?.value.trim();
      if (!text || _isAiTyping) return;
      $input.value = '';
      $input.style.height = 'auto';
      $sendBtn?.classList.remove('active');
      addMessage(chat, { role: 'user', type: 'text', content: text });
      triggerAiReply(chat, $container);
    }

    function toggleStickerPanel() {
      _stickerPanelOpen = !_stickerPanelOpen;
      const $panel = $container.querySelector('#chat-sticker-panel');
      if (!$panel) return;
      if (_stickerPanelOpen) {
        $panel.style.display = 'block';
        renderStickerPanel($container, chat);
        // 收起键盘
        $input?.blur();
      } else {
        $panel.style.display = 'none';
      }
    }
  }
  /* ========== 聊天视图事件绑定 结束 ========== */

  /* ========== 侧边栏事件 开始 ========== */
  function bindSidebarEvents($container, chat) {
    // 知识书删除
    $container.querySelectorAll('.chat-kb-item__del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.kbIndex);
        if (!chat.knowledgeBase) return;
        chat.knowledgeBase.splice(idx, 1);
        saveData();
        $container.querySelector('#sidebar-kb-list').innerHTML = renderKbList(chat);
        bindSidebarEvents($container, chat);
        MiniApp.showToast('已删除知识条目');
      });
    });

    // 添加知识条目
    $container.querySelector('#sidebar-kb-add')?.addEventListener('click', () => {
      openKbAddModal($container, chat);
    });

    // 编辑
    $container.querySelector('#sidebar-edit-btn')?.addEventListener('click', () => {
      $container.querySelector('#chat-sidebar-overlay')?.classList.remove('open');
      if (chat.isGroup) openEditGroupModal($container, chat);
      else openEditChatModal($container, chat);
    });

    // 清空记录
    $container.querySelector('#sidebar-clear-btn')?.addEventListener('click', () => {
      if (!confirm('确定清空所有聊天记录？')) return;
      chat.messages = [];
      chat.summary = '';
      saveData();
      $container.querySelector('#chat-sidebar-overlay')?.classList.remove('open');
      renderChatView($container, chat);
      MiniApp.showToast('聊天记录已清空');
    });

    // 删除联系人/群聊
    $container.querySelector('#sidebar-delete-btn')?.addEventListener('click', () => {
      if (!confirm(`确定删除「${chat.name}」？`)) return;
      if (chat.isGroup) {
        _data.groups = _data.groups.filter(g => g.id !== chat.id);
      } else {
        _data.contacts = _data.contacts.filter(c => c.id !== chat.id);
      }
      saveData();
      renderListView($container);
      MiniApp.showToast('已删除');
    });
  }
  /* ========== 侧边栏事件 结束 ========== */

  /* ========== 消息操作 开始 ========== */
  function addMessage(chat, msgData) {
    if (!chat.messages) chat.messages = [];
    const msg = {
      id: genId(),
      ts: Date.now(),
      ...msgData,
    };
    chat.messages.push(msg);
    saveData();
    appendMessageToDOM(msg, chat);
    scrollToBottom(true);
    checkAutoSummary(chat);
    return msg;
  }

  function appendMessageToDOM(msg, chat) {
    const $scroll = document.getElementById('chat-messages-scroll');
    if (!$scroll) return;

    const msgs = chat.messages || [];
    const index = msgs.findIndex(m => m.id === msg.id);
    const isMe = msg.role === 'user';
    const consecutive = isConsecutive(msgs, index);

    // 日期分隔线
    if (needDateDivider(msgs, index)) {
      const divider = document.createElement('div');
      divider.className = 'chat-date-divider';
      divider.innerHTML = `<span>${formatDateDivider(msg.ts)}</span>`;
      $scroll.appendChild(divider);
    }

    if (msg.type === 'system') {
      const el = document.createElement('div');
      el.className = 'chat-msg-system';
      el.textContent = msg.content;
      $scroll.appendChild(el);
      return;
    }

    // 头像
    let avatarHtml = '';
    if (!isMe) {
      let avatarContent;
      if (chat.isGroup) {
        const member = (chat.members || []).find(m => m.id === msg.senderId);
        avatarContent = member?.avatarUrl
          ? `<img src="${escHtml(member.avatarUrl)}" alt="">`
          : escHtml(member?.avatar || '👤');
      } else {
        avatarContent = chat.avatarUrl
          ? `<img src="${escHtml(chat.avatarUrl)}" alt="">`
          : escHtml(chat.avatar || '👤');
      }
      avatarHtml = `<div class="chat-msg-avatar">${avatarContent}</div>`;
    }

    // 气泡
    let bubbleContent;
    if (msg.type === 'sticker') {
      bubbleContent = `<div class="chat-bubble chat-bubble--sticker">
        ${msg.stickerUrl
          ? `<img src="${escHtml(msg.stickerUrl)}" alt="贴纸">`
          : `<span class="sticker-emoji">${escHtml(msg.content)}</span>`}
      </div>`;
    } else if (msg.type === 'image') {
      bubbleContent = `<div class="chat-bubble chat-bubble--image">
        <img src="${escHtml(msg.content)}" alt="图片" loading="lazy">
      </div>`;
    } else {
      bubbleContent = `<div class="chat-bubble chat-bubble--${isMe ? 'me' : 'other'}">${escHtml(msg.content)}</div>`;
    }

    // 发送者名（群聊）
    let senderName = '';
    if (!isMe && chat.isGroup && !consecutive) {
      const member = (chat.members || []).find(m => m.id === msg.senderId);
      if (member) senderName = `<div class="chat-msg-sender">${escHtml(member.name)}</div>`;
    }

    const metaHtml = `
      <div class="chat-msg-meta">
        <span class="chat-msg-time">${formatTime(msg.ts)}</span>
        ${isMe ? `<span class="chat-msg-read">已读</span>` : ''}
      </div>
    `;

    const row = document.createElement('div');
    row.className = `chat-msg-row ${isMe ? 'chat-msg-row--me' : ''} ${consecutive ? 'chat-msg-row--consecutive' : ''}`;
    row.innerHTML = `
      ${!isMe ? avatarHtml : ''}
      <div class="chat-msg-content">
        ${senderName}
        ${bubbleContent}
        ${metaHtml}
      </div>
      ${isMe ? avatarHtml : ''}
    `;
    $scroll.appendChild(row);
  }

  function scrollToBottom(smooth) {
    const $scroll = document.getElementById('chat-messages-scroll');
    if (!$scroll) return;
    $scroll.scrollTo({ top: $scroll.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }
  /* ========== 消息操作 结束 ========== */

  /* ========== AI 回复 开始 ========== */
  async function triggerAiReply(chat, $container) {
    if (_isAiTyping) return;

    const apiKey  = MiniStore.get('ai.apiKey');
    const baseUrl = MiniStore.get('ai.baseUrl');
    const model   = MiniStore.get('ai.model');

    if (!apiKey || !baseUrl) {
      addMessage(chat, {
        role: 'assistant',
        type: 'text',
        content: '⚙️ 请先在设置中配置 AI 接口（API Key 和 Base URL）',
        senderId: chat.isGroup ? (chat.members?.[0]?.id) : chat.id,
      });
      return;
    }

    _isAiTyping = true;
    const typingEl = showTypingIndicator(chat);

    try {
      const messages = buildAiMessages(chat);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error('空回复');

      typingEl?.remove();

      if (chat.isGroup) {
        // 群聊：随机选一个成员回复
        const responder = pickGroupResponder(chat);
        addMessage(chat, {
          role: 'assistant',
          type: 'text',
          content: reply,
          senderId: responder.id,
        });
      } else {
        addMessage(chat, {
          role: 'assistant',
          type: 'text',
          content: reply,
          senderId: chat.id,
        });
      }

    } catch (e) {
      typingEl?.remove();
      addMessage(chat, {
        role: 'assistant',
        type: 'text',
        content: `❌ AI 回复失败：${e.message}`,
        senderId: chat.isGroup ? (chat.members?.[0]?.id) : chat.id,
      });
    } finally {
      _isAiTyping = false;
    }
  }

  function buildAiMessages(chat) {
    const msgs = chat.messages || [];
    const kb = chat.knowledgeBase || [];

    // 系统提示词
    let systemContent = '';
    if (chat.isGroup) {
      const memberDescs = (chat.members || []).map(m =>
        `- ${m.name}：${m.persona || '无特别设定'}`
      ).join('\n');
      systemContent = `你正在模拟一个群聊场景。群聊名称：${chat.name}。\n群成员：\n${memberDescs}\n请以其中一位成员的身份自然地回复用户。`;
    } else {
      systemContent = chat.systemPrompt || `你是${chat.name}，请保持角色扮演。`;
    }

    if (kb.length) {
      systemContent += `\n\n【知识书】\n${kb.map(k => `- ${k}`).join('\n')}`;
    }

    if (chat.summary) {
      systemContent += `\n\n【之前对话摘要】\n${chat.summary}`;
    }

    const history = msgs
      .filter(m => m.type === 'text' && m.role !== 'system')
      .slice(-20) // 最近20条
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    return [
      { role: 'system', content: systemContent },
      ...history,
    ];
  }

  function pickGroupResponder(chat) {
    const members = chat.members || [];
    if (!members.length) return { id: chat.id, name: chat.name };
    return members[Math.floor(Math.random() * members.length)];
  }

  function showTypingIndicator(chat) {
    const $scroll = document.getElementById('chat-messages-scroll');
    if (!$scroll) return null;

    let avatarContent = chat.avatarUrl
      ? `<img src="${escHtml(chat.avatarUrl)}" alt="">`
      : escHtml(chat.avatar || '👤');

    const el = document.createElement('div');
    el.className = 'chat-msg-row';
    el.id = 'chat-typing-indicator';
    el.innerHTML = `
      <div class="chat-msg-avatar">${avatarContent}</div>
      <div class="chat-msg-content">
        <div class="chat-bubble chat-bubble--other chat-bubble--typing">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    `;
    $scroll.appendChild(el);
    scrollToBottom(true);
    return el;
  }
  /* ========== AI 回复 结束 ========== */

  /* ========== 自动总结 开始 ========== */
  async function checkAutoSummary(chat) {
    const msgs = (chat.messages || []).filter(m => m.type === 'text' && m.role !== 'system');
    const lastSummaryAt = chat.lastSummaryAt || 0;
    const newMsgCount = msgs.filter(m => m.ts > lastSummaryAt).length;

    if (newMsgCount < SUMMARY_EVERY) return;

    const apiKey  = MiniStore.get('ai.apiKey');
    const baseUrl = MiniStore.get('ai.baseUrl');
    const model   = MiniStore.get('ai.model');
    if (!apiKey || !baseUrl) return;

    try {
      const recentMsgs = msgs.slice(-SUMMARY_EVERY);
      const dialogue = recentMsgs.map(m =>
        `${m.role === 'user' ? '用户' : chat.name}：${m.content}`
      ).join('\n');

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: '请用3-5句话简洁总结以下对话的核心内容，保留重要信息和情感基调，用中文输出。',
            },
            { role: 'user', content: dialogue },
          ],
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const summary = data?.choices?.[0]?.message?.content?.trim();
      if (!summary) return;

      chat.summary = summary;
      chat.lastSummaryAt = Date.now();
      saveData();

      // 更新总结提示条
      const $banner = document.getElementById('chat-summary-banner');
      if ($banner) {
        $banner.querySelector('.chat-summary-banner__text').textContent = summary.slice(0, 60) + '…';
      } else {
        // 插入提示条
        const $header = document.querySelector('.chat-header');
        if ($header) {
          const banner = document.createElement('div');
          banner.className = 'chat-summary-banner';
          banner.id = 'chat-summary-banner';
          banner.innerHTML = `
            <span class="chat-summary-banner__icon">📝</span>
            <span class="chat-summary-banner__text">${escHtml(summary.slice(0, 60))}…</span>
            <span class="chat-summary-banner__arrow">›</span>
          `;
          $header.insertAdjacentElement('afterend', banner);
        }
      }

      MiniApp.showToast('对话摘要已更新 📝');
    } catch (e) {
      // 总结失败静默处理
    }
  }
  /* ========== 自动总结 结束 ========== */

  /* ========== 贴纸面板 开始 ========== */
  function renderStickerPanel($container, chat) {
    const allPacks = [...STICKER_PACKS];

    // 用户自定义贴纸包
    if (_data.userStickers?.length) {
      allPacks.push({
        id: 'custom',
        icon: '🖼️',
        name: '自定义',
        stickers: _data.userStickers,
        isCustom: true,
      });
    }

    const $tabs = $container.querySelector('#sticker-tabs');
    const $grid = $container.querySelector('#sticker-grid');
    if (!$tabs || !$grid) return;

    $tabs.innerHTML = allPacks.map((pack, i) => `
      <button class="chat-sticker-tab ${i === _stickerTab ? 'active' : ''}" data-pack="${i}" aria-label="${pack.name}">
        ${pack.icon}
      </button>
    `).join('');

    const currentPack = allPacks[_stickerTab] || allPacks[0];

    if (currentPack.isCustom) {
      $grid.innerHTML = `
        ${currentPack.stickers.map((url, i) => `
          <div class="chat-sticker-item" data-sticker-url="${escHtml(url)}" data-sticker-index="${i}">
            <img src="${escHtml(url)}" alt="贴纸" loading="lazy">
          </div>
        `).join('')}
        <div class="chat-sticker-item" id="sticker-add-custom" title="添加贴纸 URL">
          <span style="font-size:28px;">＋</span>
        </div>
      `;
    } else {
      $grid.innerHTML = currentPack.stickers.map(emoji => `
        <div class="chat-sticker-item" data-sticker="${escHtml(emoji)}">${emoji}</div>
      `).join('');
    }

    // Tab 切换
    $tabs.querySelectorAll('.chat-sticker-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _stickerTab = parseInt(tab.dataset.pack);
        renderStickerPanel($container, chat);
      });
    });

    // 发送 emoji 贴纸
    $grid.querySelectorAll('[data-sticker]').forEach(item => {
      item.addEventListener('click', () => {
        const emoji = item.dataset.sticker;
        addMessage(chat, { role: 'user', type: 'sticker', content: emoji });
        // 贴纸不触发 AI 回复（可按需开启）
      });
    });

    // 发送自定义图片贴纸
    $grid.querySelectorAll('[data-sticker-url]').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.stickerUrl;
        addMessage(chat, { role: 'user', type: 'sticker', content: '🖼️', stickerUrl: url });
      });
    });

    // 添加自定义贴纸
    $grid.querySelector('#sticker-add-custom')?.addEventListener('click', () => {
      const url = prompt('输入贴纸图片 URL：');
      if (!url?.trim()) return;
      _data.userStickers.push(url.trim());
      saveData();
      renderStickerPanel($container, chat);
      MiniApp.showToast('贴纸已添加 🖼️');
    });
  }
  /* ========== 贴纸面板 结束 ========== */

  /* ========== 新建私聊弹窗 开始 ========== */
  function openNewChatModal($container) {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">新建聊天</span>
          <button class="chat-modal__close" id="modal-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-card-preview" id="card-preview">
            <div class="chat-card-preview__avatar" id="preview-avatar">👤</div>
            <div class="chat-card-preview__info">
              <div class="chat-card-preview__name" id="preview-name">新角色</div>
              <div class="chat-card-preview__desc" id="preview-desc">填写下方信息来创建角色卡</div>
            </div>
          </div>

          <div class="chat-form-field">
            <label class="chat-form-label">角色名称 *</label>
            <input class="chat-form-input" id="nc-name" placeholder="例：小助手" maxlength="30">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像 Emoji</label>
            <input class="chat-form-input" id="nc-avatar" placeholder="例：🤖" maxlength="4">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像图片 URL（可选）</label>
            <input class="chat-form-input" id="nc-avatar-url" placeholder="https://...">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">简介（列表显示）</label>
            <input class="chat-form-input" id="nc-persona" placeholder="例：温柔体贴的AI伴侣" maxlength="60">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">系统提示词（角色设定）</label>
            <textarea class="chat-form-textarea" id="nc-prompt" placeholder="例：你是小助手，性格温柔，说话带有关心的语气…" rows="4"></textarea>
          </div>

          <div class="chat-form-field">
            <label class="chat-form-label">或导入角色卡 JSON</label>
            <div class="chat-json-drop" id="nc-json-drop">
              <span class="chat-json-drop__icon">📂</span>
              点击选择 JSON 文件，或拖拽到此处<br>
              <span style="font-size:11px;opacity:0.7;">支持 SillyTavern / TavernAI 格式</span>
            </div>
            <input type="file" id="nc-json-file" accept=".json" style="display:none;">
          </div>
        </div>
        <div class="chat-modal        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="modal-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="modal-confirm">创建</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    // 实时预览
    const $name    = overlay.querySelector('#nc-name');
    const $avatar  = overlay.querySelector('#nc-avatar');
    const $persona = overlay.querySelector('#nc-persona');

    function updatePreview() {
      overlay.querySelector('#preview-name').textContent = $name.value || '新角色';
      overlay.querySelector('#preview-avatar').textContent = $avatar.value || '👤';
      overlay.querySelector('#preview-desc').textContent = $persona.value || '填写下方信息来创建角色卡';
    }

    $name.addEventListener('input', updatePreview);
    $avatar.addEventListener('input', updatePreview);
    $persona.addEventListener('input', updatePreview);

    // JSON 导入
    const $jsonDrop = overlay.querySelector('#nc-json-drop');
    const $jsonFile = overlay.querySelector('#nc-json-file');

    $jsonDrop.addEventListener('click', () => $jsonFile.click());

    $jsonDrop.addEventListener('dragover', (e) => {
      e.preventDefault();
      $jsonDrop.classList.add('dragover');
    });
    $jsonDrop.addEventListener('dragleave', () => $jsonDrop.classList.remove('dragover'));
    $jsonDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      $jsonDrop.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) parseCardJson(file, overlay);
    });

    $jsonFile.addEventListener('change', () => {
      if ($jsonFile.files[0]) parseCardJson($jsonFile.files[0], overlay);
    });

    // 关闭
    overlay.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#modal-cancel').addEventListener('click', () => closeModal(overlay));

    // 确认创建
    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#nc-name').value.trim();
      if (!name) { MiniApp.showToast('请输入角色名称'); return; }

      const contact = {
        id: genId(),
        name,
        avatar: overlay.querySelector('#nc-avatar').value.trim() || '👤',
        avatarUrl: overlay.querySelector('#nc-avatar-url').value.trim(),
        persona: overlay.querySelector('#nc-persona').value.trim(),
        systemPrompt: overlay.querySelector('#nc-prompt').value.trim(),
        knowledgeBase: [],
        messages: [],
        unread: 0,
        summary: '',
        lastSummaryAt: 0,
      };

      _data.contacts.push(contact);
      saveData();
      closeModal(overlay);
      renderListView($container);
      MiniApp.showToast(`「${name}」已创建 ✨`);
    });
  }
  /* ========== 新建私聊弹窗 结束 ========== */

  /* ========== 编辑私聊弹窗 开始 ========== */
  function openEditChatModal($container, chat) {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">编辑角色卡</span>
          <button class="chat-modal__close" id="modal-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-form-field">
            <label class="chat-form-label">角色名称 *</label>
            <input class="chat-form-input" id="ec-name" value="${escHtml(chat.name)}" maxlength="30">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像 Emoji</label>
            <input class="chat-form-input" id="ec-avatar" value="${escHtml(chat.avatar || '')}" maxlength="4">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像图片 URL</label>
            <input class="chat-form-input" id="ec-avatar-url" value="${escHtml(chat.avatarUrl || '')}" placeholder="https://...">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">简介</label>
            <input class="chat-form-input" id="ec-persona" value="${escHtml(chat.persona || '')}" maxlength="60">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">系统提示词</label>
            <textarea class="chat-form-textarea" id="ec-prompt" rows="5">${escHtml(chat.systemPrompt || '')}</textarea>
          </div>
        </div>
        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="modal-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="modal-confirm">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#modal-cancel').addEventListener('click', () => closeModal(overlay));

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#ec-name').value.trim();
      if (!name) { MiniApp.showToast('请输入角色名称'); return; }

      chat.name      = name;
      chat.avatar    = overlay.querySelector('#ec-avatar').value.trim() || '👤';
      chat.avatarUrl = overlay.querySelector('#ec-avatar-url').value.trim();
      chat.persona   = overlay.querySelector('#ec-persona').value.trim();
      chat.systemPrompt = overlay.querySelector('#ec-prompt').value.trim();

      saveData();
      closeModal(overlay);
      renderChatView($container, chat);
      MiniApp.showToast('角色卡已更新 ✅');
    });
  }
  /* ========== 编辑私聊弹窗 结束 ========== */

  /* ========== 新建群聊弹窗 开始 ========== */
  function openNewGroupModal($container) {
    const overlay = createModalOverlay();
    let members = []; // { id, name, avatar, avatarUrl, persona }

    function renderMembersHtml() {
      if (!members.length) return '<div style="font-size:12px;color:var(--text-tertiary);">还没有成员，点击下方添加</div>';
      return `<div class="chat-member-list">
        ${members.map((m, i) => `
          <div class="chat-member-chip">
            <div class="chat-member-chip__avatar">${escHtml(m.avatar || '👤')}</div>
            <span>${escHtml(m.name)}</span>
            <span class="chat-member-chip__del" data-member-index="${i}" style="cursor:pointer;">✕</span>
          </div>
        `).join('')}
      </div>`;
    }

    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">新建群聊</span>
          <button class="chat-modal__close" id="modal-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-form-field">
            <label class="chat-form-label">群聊名称 *</label>
            <input class="chat-form-input" id="ng-name" placeholder="例：我的小团体" maxlength="30">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">群头像 Emoji</label>
            <input class="chat-form-input" id="ng-avatar" placeholder="👥" maxlength="4">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">群成员</label>
            <div id="ng-members-wrap">${renderMembersHtml()}</div>
            <button class="chat-sidebar__action" id="ng-add-member" style="margin-top:8px;">
              <span>➕</span> 添加成员
            </button>
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">群聊系统提示词（可选）</label>
            <textarea class="chat-form-textarea" id="ng-prompt" placeholder="描述这个群聊的背景和成员互动风格…" rows="3"></textarea>
          </div>
        </div>
        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="modal-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="modal-confirm">创建群聊</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function refreshMembers() {
      overlay.querySelector('#ng-members-wrap').innerHTML = renderMembersHtml();
      overlay.querySelectorAll('.chat-member-chip__del').forEach(btn => {
        btn.addEventListener('click', () => {
          members.splice(parseInt(btn.dataset.memberIndex), 1);
          refreshMembers();
        });
      });
    }

    overlay.querySelector('#ng-add-member').addEventListener('click', () => {
      openAddMemberModal(overlay, (member) => {
        members.push(member);
        refreshMembers();
      });
    });

    overlay.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#modal-cancel').addEventListener('click', () => closeModal(overlay));

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#ng-name').value.trim();
      if (!name) { MiniApp.showToast('请输入群聊名称'); return; }
      if (members.length < 1) { MiniApp.showToast('请至少添加一位成员'); return; }

      const group = {
        id: genId(),
        name,
        avatar: overlay.querySelector('#ng-avatar').value.trim() || '👥',
        isGroup: true,
        members,
        systemPrompt: overlay.querySelector('#ng-prompt').value.trim(),
        knowledgeBase: [],
        messages: [],
        unread: 0,
        summary: '',
        lastSummaryAt: 0,
      };

      _data.groups.push(group);
      saveData();
      closeModal(overlay);
      _currentTab = 'groups';
      renderListView($container);
      MiniApp.showToast(`群聊「${name}」已创建 🎉`);
    });
  }
  /* ========== 新建群聊弹窗 结束 ========== */

  /* ========== 编辑群聊弹窗 开始 ========== */
  function openEditGroupModal($container, chat) {
    const overlay = createModalOverlay();
    let members = JSON.parse(JSON.stringify(chat.members || []));

    function renderMembersHtml() {
      if (!members.length) return '<div style="font-size:12px;color:var(--text-tertiary);">还没有成员</div>';
      return `<div class="chat-member-list">
        ${members.map((m, i) => `
          <div class="chat-member-chip">
            <div class="chat-member-chip__avatar">${escHtml(m.avatar || '👤')}</div>
            <span>${escHtml(m.name)}</span>
            <span class="chat-member-chip__del" data-member-index="${i}" style="cursor:pointer;">✕</span>
          </div>
        `).join('')}
      </div>`;
    }

    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">编辑群聊</span>
          <button class="chat-modal__close" id="modal-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-form-field">
            <label class="chat-form-label">群聊名称 *</label>
            <input class="chat-form-input" id="eg-name" value="${escHtml(chat.name)}" maxlength="30">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">群头像 Emoji</label>
            <input class="chat-form-input" id="eg-avatar" value="${escHtml(chat.avatar || '')}" maxlength="4">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">群成员</label>
            <div id="eg-members-wrap">${renderMembersHtml()}</div>
            <button class="chat-sidebar__action" id="eg-add-member" style="margin-top:8px;">
              <span>➕</span> 添加成员
            </button>
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">系统提示词</label>
            <textarea class="chat-form-textarea" id="eg-prompt" rows="3">${escHtml(chat.systemPrompt || '')}</textarea>
          </div>
        </div>
        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="modal-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="modal-confirm">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function refreshMembers() {
      overlay.querySelector('#eg-members-wrap').innerHTML = renderMembersHtml();
      overlay.querySelectorAll('.chat-member-chip__del').forEach(btn => {
        btn.addEventListener('click', () => {
          members.splice(parseInt(btn.dataset.memberIndex), 1);
          refreshMembers();
        });
      });
    }

    overlay.querySelector('#eg-add-member').addEventListener('click', () => {
      openAddMemberModal(overlay, (member) => {
        members.push(member);
        refreshMembers();
      });
    });

    overlay.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#modal-cancel').addEventListener('click', () => closeModal(overlay));

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#eg-name').value.trim();
      if (!name) { MiniApp.showToast('请输入群聊名称'); return; }

      chat.name = name;
      chat.avatar = overlay.querySelector('#eg-avatar').value.trim() || '👥';
      chat.members = members;
      chat.systemPrompt = overlay.querySelector('#eg-prompt').value.trim();

      saveData();
      closeModal(overlay);
      renderChatView($container, chat);
      MiniApp.showToast('群聊已更新 ✅');
    });
  }
  /* ========== 编辑群聊弹窗 结束 ========== */

  /* ========== 添加群成员弹窗 开始 ========== */
  function openAddMemberModal(parentOverlay, onConfirm) {
    const overlay = createModalOverlay();
    overlay.style.zIndex = '7000';
    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">添加成员</span>
          <button class="chat-modal__close" id="am-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-form-field">
            <label class="chat-form-label">成员名称 *</label>
            <input class="chat-form-input" id="am-name" placeholder="例：小明" maxlength="20">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像 Emoji</label>
            <input class="chat-form-input" id="am-avatar" placeholder="😊" maxlength="4">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">头像图片 URL（可选）</label>
            <input class="chat-form-input" id="am-avatar-url" placeholder="https://...">
          </div>
          <div class="chat-form-field">
            <label class="chat-form-label">角色设定</label>
            <textarea class="chat-form-textarea" id="am-persona" placeholder="描述这个成员的性格和说话风格…" rows="3"></textarea>
          </div>
        </div>
        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="am-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="am-confirm">添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.querySelector('#am-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#am-cancel').addEventListener('click', () => closeModal(overlay));

    overlay.querySelector('#am-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#am-name').value.trim();
      if (!name) { MiniApp.showToast('请输入成员名称'); return; }

      onConfirm({
        id: genId(),
        name,
        avatar: overlay.querySelector('#am-avatar').value.trim() || '👤',
        avatarUrl: overlay.querySelector('#am-avatar-url').value.trim(),
        persona: overlay.querySelector('#am-persona').value.trim(),
      });

      closeModal(overlay);
    });
  }
  /* ========== 添加群成员弹窗 结束 ========== */

  /* ========== 知识书添加弹窗 开始 ========== */
  function openKbAddModal($container, chat) {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-modal__header">
          <span class="chat-modal__title">添加知识条目</span>
          <button class="chat-modal__close" id="kb-close">✕</button>
        </div>
        <div class="chat-modal__body">
          <div class="chat-form-field">
            <label class="chat-form-label">知识内容</label>
            <textarea class="chat-form-textarea" id="kb-content" placeholder="例：用户喜欢喝咖啡，不喜欢甜食…" rows="4"></textarea>
          </div>
          <div style="font-size:12px;color:var(--text-tertiary);line-height:1.6;">
            知识书内容会附加到每次 AI 对话的系统提示词中，帮助 AI 记住重要信息。
          </div>
        </div>
        <div class="chat-modal__footer">
          <button class="chat-modal__btn chat-modal__btn--secondary" id="kb-cancel">取消</button>
          <button class="chat-modal__btn chat-modal__btn--primary" id="kb-confirm">添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.querySelector('#kb-close').addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#kb-cancel').addEventListener('click', () => closeModal(overlay));

    overlay.querySelector('#kb-confirm').addEventListener('click', () => {
      const content = overlay.querySelector('#kb-content').value.trim();
      if (!content) { MiniApp.showToast('请输入知识内容'); return; }

      if (!chat.knowledgeBase) chat.knowledgeBase = [];
      chat.knowledgeBase.push(content);
      saveData();
      closeModal(overlay);

      // 刷新侧边栏知识书列表
      const $kbList = $container.querySelector('#sidebar-kb-list');
      if ($kbList) {
        $kbList.innerHTML = renderKbList(chat);
        bindSidebarEvents($container, chat);
      }

      MiniApp.showToast('知识条目已添加 📖');
    });
  }
  /* ========== 知识书添加弹窗 结束 ========== */

  /* ========== JSON 角色卡解析 开始 ========== */
  function parseCardJson(file, overlay) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);

        // 兼容 SillyTavern / TavernAI / 通用格式
        const data = json.data || json.char_data || json;
        const name        = data.name || data.char_name || '';
        const description = data.description || data.char_persona || data.personality || '';
        const scenario    = data.scenario || '';
        const firstMsg    = data.first_mes || data.first_message || '';
        const avatarUrl   = data.avatar || '';

        // 填充表单
        if (name)     overlay.querySelector('#nc-name').value = name;
        if (avatarUrl) overlay.querySelector('#nc-avatar-url').value = avatarUrl;

        const persona = description.slice(0, 60);
        if (persona) overlay.querySelector('#nc-persona').value = persona;

        let prompt = description;
        if (scenario) prompt += `\n\n场景：${scenario}`;
        if (prompt)   overlay.querySelector('#nc-prompt').value = prompt;

        // 更新预览
        overlay.querySelector('#preview-name').textContent = name || '新角色';
        overlay.querySelector('#preview-desc').textContent = persona || '角色卡已导入';

        // 如果有开场白，标记为首条消息
        if (firstMsg) {
          overlay.querySelector('#nc-prompt').value += `\n\n【开场白】${firstMsg}`;
        }

        MiniApp.showToast('角色卡导入成功 ✅');
      } catch (err) {
        MiniApp.showToast('JSON 解析失败，请检查格式 ❌');
      }
    };
    reader.readAsText(file);
  }
  /* ========== JSON 角色卡解析 结束 ========== */

  /* ========== 弹窗工具函数 开始 ========== */
  function createModalOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'chat-modal-overlay';
    return overlay;
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
  /* ========== 弹窗工具函数 结束 ========== */

  /* ========== 公开 API 开始 ========== */
  return { open };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== Chat App 模块 结束 ========== */

