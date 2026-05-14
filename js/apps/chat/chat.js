/* ========== ChatApp 聊天应用 开始 ========== */

const ChatApp = (() => {
  'use strict';

  /* ========== 常量 开始 ========== */
  const STORE_KEY = 'chat_data';
  const AUTO_SUMMARY_EVERY = 30; // 每30条消息自动总结
  /* ========== 常量 结束 ========== */

  /* ========== 默认数据 开始 ========== */
  const DEFAULT_DATA = {
    myProfile: {
      name: '我',
      avatarUrl: '',
      bio: '',
    },
    characters: [],
    groups: [],
    conversations: {},
    stickers: [],
    summaryPrompt: `请将以下对话内容总结为简洁的摘要（200字以内），保留关键情节、人物关系变化和重要信息，以便后续对话参考。`,
    backgrounds: {},
  };
  /* ========== 默认数据 结束 ========== */

  /* ========== 状态 开始 ========== */
  let _data = null;
  let _currentConvId = null; // 当前打开的会话ID
  let _streamController = null; // AbortController for streaming
  let _availableModels = []; // 从API获取的模型列表
  /* ========== 状态 结束 ========== */

  /* ========== 数据持久化 开始 ========== */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        _data = Object.assign({}, DEFAULT_DATA, saved);
        // 确保子对象存在
        _data.myProfile = Object.assign({}, DEFAULT_DATA.myProfile, saved.myProfile || {});
        _data.characters = saved.characters || [];
        _data.groups = saved.groups || [];
        _data.conversations = saved.conversations || {};
        _data.stickers = saved.stickers || [];
        _data.summaryPrompt = saved.summaryPrompt || DEFAULT_DATA.summaryPrompt;
        _data.backgrounds = saved.backgrounds || {};
      } else {
        _data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    } catch (e) {
      console.warn('[ChatApp] 加载数据失败', e);
      _data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(_data));
    } catch (e) {
      console.warn('[ChatApp] 保存数据失败', e);
    }
  }
  /* ========== 数据持久化 结束 ========== */

  /* ========== ID生成 开始 ========== */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  /* ========== ID生成 结束 ========== */

  /* ========== 工具函数 开始 ========== */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function getConv(convId) {
    if (!_data.conversations[convId]) {
      _data.conversations[convId] = { messages: [], summaries: [] };
    }
    return _data.conversations[convId];
  }

  function getCharById(id) {
    return _data.characters.find(c => c.id === id);
  }

  function getGroupById(id) {
    return _data.groups.find(g => g.id === id);
  }

  // 获取会话对应的角色或群组信息
  function getConvInfo(convId) {
    if (convId.startsWith('char_')) {
      const char = getCharById(convId.replace('char_', ''));
      if (char) return { type: 'char', data: char, name: char.name, avatarUrl: char.avatarUrl };
    } else if (convId.startsWith('group_')) {
      const group = getGroupById(convId.replace('group_', ''));
      if (group) return { type: 'group', data: group, name: group.name, avatarUrl: group.avatarUrl };
    }
    return null;
  }
  /* ========== 工具函数 结束 ========== */

  /* ========== AI API 开始 ========== */
  async function fetchModels() {
    const ai = MiniStore.get('ai');
    if (!ai || !ai.baseUrl || !ai.apiKey) return [];
    try {
      const base = ai.baseUrl.replace(/\/$/, '');
      const resp = await fetch(`${base}/models`, {
        headers: { 'Authorization': `Bearer ${ai.apiKey}` }
      });
      if (!resp.ok) return [];
      const json = await resp.json();
      const models = (json.data || []).map(m => m.id).filter(Boolean);
      _availableModels = models;
      return models;
    } catch (e) {
      console.warn('[ChatApp] 获取模型列表失败', e);
      return [];
    }
  }

  async function callAI(messages, onChunk, signal) {
    const ai = MiniStore.get('ai');
    if (!ai || !ai.baseUrl || !ai.apiKey) {
      throw new Error('请先在设置中配置 AI API');
    }
    const model = ai.model || (_availableModels[0] || 'gpt-4o');
    const base = ai.baseUrl.replace(/\/$/, '');

    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API 错误 ${resp.status}: ${errText}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta, fullText);
          }
        } catch (_) {}
      }
    }
    return fullText;
  }
  /* ========== AI API 结束 ========== */

  /* ========== 构建 AI 消息上下文 开始 ========== */
  function buildMessages(convId, userText) {
    const info = getConvInfo(convId);
    if (!info) return [];

    const conv = getConv(convId);
    const myProfile = _data.myProfile;

    // 获取当前会话对应的用户身份
    let userIdentity = myProfile;
    if (info.type === 'char' && info.data.userIdentity) {
      userIdentity = Object.assign({}, myProfile, info.data.userIdentity);
    }

    // 构建系统提示
    let systemParts = [];

    if (info.type === 'char') {
      const char = info.data;
      systemParts.push(`你正在扮演角色：${char.name}`);
      if (char.bio) systemParts.push(`角色设定：${char.bio}`);
      if (char.systemPrompt) systemParts.push(`额外指令：${char.systemPrompt}`);
      if (char.knowledgeBase) systemParts.push(`背景知识：\n${char.knowledgeBase}`);
      systemParts.push(`\n对话对象（用户）：${userIdentity.name}`);
      if (userIdentity.bio) systemParts.push(`用户设定：${userIdentity.bio}`);
    } else if (info.type === 'group') {
      const group = info.data;
      const memberNames = (group.members || [])
        .map(id => getCharById(id)?.name)
        .filter(Boolean)
        .join('、');
      systemParts.push(`这是一个群聊，群名：${group.name}`);
      systemParts.push(`群成员：${memberNames}`);
      if (group.systemPrompt) systemParts.push(`群聊设定：${group.systemPrompt}`);
      systemParts.push(`\n用户：${userIdentity.name}`);
      if (userIdentity.bio) systemParts.push(`用户设定：${userIdentity.bio}`);
      systemParts.push(`请根据群成员各自的性格轮流回复，格式：【角色名】：内容`);
    }

    // 加入历史总结
    if (conv.summaries && conv.summaries.length > 0) {
      const lastSummary = conv.summaries[conv.summaries.length - 1];
      systemParts.push(`\n【之前对话摘要】\n${lastSummary.content}`);
    }

    const systemPrompt = systemParts.join('\n');

    // 构建消息历史（取最近50条，避免token过多）
    const recentMessages = conv.messages.slice(-50);
    const historyMessages = recentMessages
      .filter(m => m.role !== 'system' && m.type === 'text')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    // 特殊消息类型的文字描述
    let finalUserContent = userText;

    return [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: finalUserContent },
    ];
  }
  /* ========== 构建 AI 消息上下文 结束 ========== */

  /* ========== 自动总结 开始 ========== */
  async function checkAndSummarize(convId) {
    const conv = getConv(convId);
    const textMessages = conv.messages.filter(m => m.type === 'text');

    // 计算自上次总结后的消息数
    const lastSummaryMsgCount = conv.lastSummaryAt || 0;
    const newMsgCount = textMessages.length - lastSummaryMsgCount;

    if (newMsgCount < AUTO_SUMMARY_EVERY) return;

    // 取需要总结的消息
    const toSummarize = textMessages.slice(lastSummaryMsgCount, lastSummaryMsgCount + AUTO_SUMMARY_EVERY);
    const dialogText = toSummarize.map(m => {
      const prefix = m.role === 'user' ? (_data.myProfile.name || '我') : (getConvInfo(convId)?.name || 'AI');
      return `${prefix}：${m.content}`;
    }).join('\n');

    try {
      const summaryMessages = [
        { role: 'system', content: _data.summaryPrompt },
        { role: 'user', content: dialogText },
      ];

      MiniApp.showToast('正在自动总结对话... 📝');

      let summaryText = '';
      await callAI(summaryMessages, (delta, full) => { summaryText = full; }, null);

      conv.summaries = conv.summaries || [];
      conv.summaries.push({
        id: genId(),
        content: summaryText,
        createdAt: Date.now(),
        msgRange: [lastSummaryMsgCount, lastSummaryMsgCount + AUTO_SUMMARY_EVERY],
      });
      conv.lastSummaryAt = lastSummaryMsgCount + AUTO_SUMMARY_EVERY;
      saveData();
      MiniApp.showToast('对话已自动总结 ✅');
    } catch (e) {
      console.warn('[ChatApp] 自动总结失败', e);
    }
  }
  /* ========== 自动总结 结束 ========== */

  /* ========== 渲染主界面 开始 ========== */
  function open() {
    loadData();
    const $appContent = document.getElementById('app-content');
    $appContent.innerHTML = renderMainLayout();
    bindMainEvents();
    renderConvList();
    // 异步拉取模型列表
    fetchModels();
  }

  function renderMainLayout() {
    return `
      <div class="chat-app" id="chat-app">
        <!-- 会话列表视图 -->
        <div class="chat-list-view" id="chat-list-view">
          <div class="chat-nav">
            <button class="chat-nav__back" id="chat-back-btn">
              <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                <path d="M9 1L1 9L9 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <h1 class="chat-nav__title">聊天</h1>
            <div class="chat-nav__actions">
              <button class="chat-nav__btn" id="chat-new-btn" title="新建">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="chat-nav__btn" id="chat-settings-btn" title="聊天设置">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="chat-list" id="chat-list">
            <!-- 动态生成 -->
          </div>
        </div>

        <!-- 聊天窗口视图 -->
        <div class="chat-window-view" id="chat-window-view">
          <!-- 动态生成 -->
        </div>

        <!-- 角色管理视图 -->
        <div class="chat-chars-view" id="chat-chars-view">
          <!-- 动态生成 -->
        </div>

        <!-- 聊天设置视图 -->
        <div class="chat-settings-view" id="chat-settings-view">
          <!-- 动态生成 -->
        </div>
      </div>
    `;
  }
  /* ========== 渲染主界面 结束 ========== */

  /* ========== 渲染会话列表 开始 ========== */
  function renderConvList() {
    const $list = document.getElementById('chat-list');
    if (!$list) return;

    // 合并单聊和群聊
    const items = [];

    _data.characters.forEach(char => {
      const convId = `char_${char.id}`;
      const conv = _data.conversations[convId];
      const lastMsg = conv?.messages?.[conv.messages.length - 1];
      items.push({
        convId,
        name: char.name,
        avatarUrl: char.avatarUrl,
        lastMsg: lastMsg ? getLastMsgPreview(lastMsg) : '开始聊天吧',
        lastTime: lastMsg?.timestamp || 0,
        type: 'char',
      });
    });

    _data.groups.forEach(group => {
      const convId = `group_${group.id}`;
      const conv = _data.conversations[convId];
      const lastMsg = conv?.messages?.[conv.messages.length - 1];
      items.push({
        convId,
        name: group.name,
        avatarUrl: group.avatarUrl,
        lastMsg: lastMsg ? getLastMsgPreview(lastMsg) : '开始聊天吧',
        lastTime: lastMsg?.timestamp || 0,
        type: 'group',
        memberCount: group.members?.length || 0,
      });
    });

    // 按最后消息时间排序
    items.sort((a, b) => b.lastTime - a.lastTime);

    if (items.length === 0) {
      $list.innerHTML = `
        <div class="chat-list__empty">
          <div class="chat-list__empty-icon">💬</div>
          <p>还没有聊天</p>
          <p class="chat-list__empty-sub">点击右上角 ＋ 创建角色</p>
        </div>
      `;
      return;
    }

    $list.innerHTML = items.map(item => `
      <div class="chat-list-item" data-conv="${item.convId}">
        <div class="chat-list-item__avatar">
          ${item.avatarUrl
            ? `<img src="${escapeHtml(item.avatarUrl)}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="chat-list-item__avatar-fallback" style="${item.avatarUrl ? 'display:none' : ''}">
            ${item.type === 'group' ? '👥' : item.name.charAt(0)}
          </div>
        </div>
        <div class="chat-list-item__info">
          <div class="chat-list-item__top">
            <span class="chat-list-item__name">${escapeHtml(item.name)}</span>
            ${item.lastTime ? `<span class="chat-list-item__time">${formatTime(item.lastTime)}</span>` : ''}
          </div>
          <div class="chat-list-item__preview">${escapeHtml(item.lastMsg)}</div>
        </div>
      </div>
    `).join('');

    $list.querySelectorAll('.chat-list-item').forEach(el => {
      el.addEventListener('click', () => openConversation(el.dataset.conv));
    });
  }

  function getLastMsgPreview(msg) {
    if (!msg) return '';
    switch (msg.type) {
      case 'text': return msg.content?.slice(0, 40) || '';
      case 'image': return '[图片]';
      case 'voice': return '[语音]';
      case 'sticker': return '[表情包]';
      case 'transfer': return '[转账]';
      case 'gift': return '[礼物]';
      case 'location': return '[位置]';
      default: return msg.content?.slice(0, 40) || '';
    }
  }
  /* ========== 渲染会话列表 结束 ========== */

  /* ========== 打开会话 开始 ========== */
  function openConversation(convId) {
    _currentConvId = convId;
    const info = getConvInfo(convId);
    if (!info) return;

    const $window = document.getElementById('chat-window-view');
    const conv = getConv(convId);
    const bg = _data.backgrounds[convId] || '';

    $window.innerHTML = renderChatWindow(info, conv, bg);
    $window.classList.add('open');

    bindChatWindowEvents(convId);
    scrollToBottom();
  }

  function renderChatWindow(info, conv, bg) {
    const bgStyle = bg ? `style="background-image:url('${escapeHtml(bg)}')"` : '';
    return `
      <div class="chat-window" id="chat-window">
        <!-- 顶部导航 -->
        <div class="chat-window__nav">
          <button class="chat-window__back" id="cw-back">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="chat-window__title-area">
            <div class="chat-window__avatar">
              ${info.avatarUrl
                ? `<img src="${escapeHtml(info.avatarUrl)}" alt="${escapeHtml(info.name)}">`
                : `<div class="chat-window__avatar-fallback">${info.type === 'group' ? '👥' : info.name.charAt(0)}</div>`}
            </div>
            <div>
              <div class="chat-window__name">${escapeHtml(info.name)}</div>
              ${info.type === 'group' ? `<div class="chat-window__sub">${info.data.members?.length || 0} 人</div>` : ''}
            </div>
          </div>
          <div class="chat-window__nav-actions">
            <button class="chat-nav__btn" id="cw-info-btn" title="详情">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 消息区域 -->
        <div class="chat-messages" id="chat-messages" ${bgStyle}>
          ${renderMessages(conv.messages, info)}
        </div>

        <!-- 输入区域 -->
        <div class="chat-input-area" id="chat-input-area">
          <!-- 特殊功能按钮行 -->
          <div class="chat-input-extras" id="chat-input-extras">
            <button class="chat-extra-btn" data-action="image" title="图片">🖼️</button>
            <button class="chat-extra-btn" data-action="voice" title="语音">🎤</button>
            <button class="chat-extra-btn" data-action="sticker" title="表情包">😄</button>
            <button class="chat-extra-btn" data-action="transfer" title="转账">💸</button>
            <button class="chat-extra-btn" data-action="gift" title="礼物">🎁</button>
            <button class="chat-extra-btn" data-action="location" title="位置">📍</button>
          </div>
          <!-- 输入行 -->
          <div class="chat-input-row">
            <button class="chat-input-more" id="chat-input-more-btn">＋</button>
            <textarea
              class="chat-input-box"
              id="chat-input-box"
              placeholder="发消息..."
              rows="1"
              maxlength="2000"
            ></textarea>
            <button class="chat-send-btn" id="chat-send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 表情包面板 -->
        <div class="chat-sticker-panel" id="chat-sticker-panel">
          ${renderStickerPanel()}
        </div>

        <!-- 会话详情面板 -->
        <div class="chat-info-panel" id="chat-info-panel">
          ${renderInfoPanel(info)}
        </div>
      </div>
    `;
  }
  /* ========== 打开会话 结束 ========== */

  /* ========== 渲染消息 开始 ========== */
  function renderMessages(messages, info) {
    if (!messages || messages.length === 0) {
      return `<div class="chat-messages__empty">开始你们的对话吧 ✨</div>`;
    }

    return messages.map((msg, idx) => renderMessage(msg, info, idx)).join('');
  }

  function renderMessage(msg, info, idx) {
    const isUser = msg.role === 'user';
    const myProfile = _data.myProfile;

    // 发送者信息
    let senderName, senderAvatar;
    if (isUser) {
      // 用户身份：优先用当前会话的userIdentity
      const convInfo = getConvInfo(_currentConvId);
      const userIdentity = (convInfo?.type === 'char' && convInfo.data.userIdentity)
        ? Object.assign({}, myProfile, convInfo.data.userIdentity)
        : myProfile;
      senderName = userIdentity.name || '我';
      senderAvatar = userIdentity.avatarUrl || myProfile.avatarUrl || '';
    } else {
      // 群聊时解析角色名
      if (info.type === 'group' && msg.senderName) {
        senderName = msg.senderName;
        const char = _data.characters.find(c => c.name === msg.senderName);
        senderAvatar = char?.avatarUrl || '';
      } else {
        senderName = info.name;
        senderAvatar = info.avatarUrl || '';
      }
    }

    const avatarHtml = senderAvatar
      ? `<img src="${escapeHtml(senderAvatar)}" alt="${escapeHtml(senderName)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const fallbackHtml = `<div class="msg-avatar__fallback" style="${senderAvatar ? 'display:none' : ''}">${senderName.charAt(0)}</div>`;

    const bubbleContent = renderBubbleContent(msg);

    return `
      <div class="msg-row ${isUser ? 'msg-row--user' : 'msg-row--other'}" data-msg-idx="${idx}">
        ${!isUser ? `
          <div class="msg-avatar">
            ${avatarHtml}${fallbackHtml}
          </div>
        ` : ''}
        <div class="msg-body">
          ${!isUser && info.type === 'group' ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
          <div class="msg-bubble msg-bubble--${msg.type || 'text'}">
            ${bubbleContent}
          </div>
          <div class="msg-time">${formatTime(msg.timestamp)}</div>
        </div>
        ${isUser ? `
          <div class="msg-avatar">
            ${avatarHtml}${fallbackHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderBubbleContent(msg) {
    switch (msg.type) {
      case 'text':
                return `<p class="msg-text">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</p>`;

      case 'image':
        return `
          <div class="msg-image-card">
            <div class="msg-image-card__icon">🖼️</div>
            <div class="msg-image-card__info">
              <div class="msg-image-card__title">图片</div>
              <div class="msg-image-card__desc">${escapeHtml(msg.content || '')}</div>
            </div>
          </div>`;

      case 'voice':
        return `
          <div class="msg-voice-card">
            <div class="msg-voice-card__icon">🎤</div>
            <div class="msg-voice-card__wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="msg-voice-card__duration">${msg.duration || '0'}"</div>
          </div>`;

      case 'sticker':
        return `
          <div class="msg-sticker">
            <img src="${escapeHtml(msg.content)}" alt="表情包" onerror="this.parentElement.innerHTML='😄'">
          </div>`;

      case 'transfer':
        return `
          <div class="msg-transfer-card">
            <div class="msg-transfer-card__header">
              <span class="msg-transfer-card__icon">💸</span>
              <span class="msg-transfer-card__label">转账</span>
            </div>
            <div class="msg-transfer-card__amount">¥${escapeHtml(String(msg.amount || '0'))}</div>
            ${msg.note ? `<div class="msg-transfer-card__note">${escapeHtml(msg.note)}</div>` : ''}
            <div class="msg-transfer-card__footer">微信转账</div>
          </div>`;

      case 'gift':
        return `
          <div class="msg-gift-card">
            <div class="msg-gift-card__emoji">${escapeHtml(msg.giftEmoji || '🎁')}</div>
            <div class="msg-gift-card__info">
              <div class="msg-gift-card__name">${escapeHtml(msg.giftName || '礼物')}</div>
              ${msg.note ? `<div class="msg-gift-card__note">${escapeHtml(msg.note)}</div>` : ''}
            </div>
          </div>`;

      case 'location':
        return `
          <div class="msg-location-card">
            <div class="msg-location-card__map">
              <div class="msg-location-card__pin">📍</div>
            </div>
            <div class="msg-location-card__info">
              <div class="msg-location-card__name">${escapeHtml(msg.locationName || '位置')}</div>
              <div class="msg-location-card__addr">${escapeHtml(msg.address || '')}</div>
            </div>
          </div>`;

      default:
        return `<p class="msg-text">${escapeHtml(msg.content || '')}</p>`;
    }
  }
  /* ========== 渲染消息 结束 ========== */

  /* ========== 渲染表情包面板 开始 ========== */
  function renderStickerPanel() {
    if (_data.stickers.length === 0) {
      return `
        <div class="sticker-panel__empty">
          <p>还没有表情包</p>
          <button class="sticker-panel__add-btn" id="sticker-add-btn">＋ 添加表情包</button>
        </div>`;
    }
    return `
      <div class="sticker-panel__grid">
        ${_data.stickers.map(s => `
          <div class="sticker-item" data-url="${escapeHtml(s.url)}" title="${escapeHtml(s.name || '')}">
            <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.name || '')}" onerror="this.parentElement.style.display='none'">
          </div>
        `).join('')}
      </div>
      <div class="sticker-panel__footer">
        <button class="sticker-panel__add-btn" id="sticker-add-btn">＋ 添加表情包</button>
      </div>`;
  }
  /* ========== 渲染表情包面板 结束 ========== */

  /* ========== 渲染会话详情面板 开始 ========== */
  function renderInfoPanel(info) {
    if (info.type === 'char') {
      const char = info.data;
      const userIdentity = char.userIdentity || {};
      return `
        <div class="info-panel">
          <div class="info-panel__header">
            <button class="info-panel__close" id="info-panel-close">✕</button>
            <h3>会话详情</h3>
          </div>
          <div class="info-panel__body">
            <!-- 角色信息 -->
            <div class="info-section">
              <div class="info-section__title">角色</div>
              <div class="info-avatar-row">
                <div class="info-avatar">
                  ${char.avatarUrl ? `<img src="${escapeHtml(char.avatarUrl)}" alt="">` : `<div class="info-avatar__fallback">${char.name.charAt(0)}</div>`}
                </div>
                <div class="info-avatar-name">${escapeHtml(char.name)}</div>
              </div>
            </div>

            <!-- 我的身份 -->
            <div class="info-section">
              <div class="info-section__title">我的身份（此角色专属）</div>
              <div class="info-field">
                <label>昵称</label>
                <input type="text" class="info-input" id="ui-name" value="${escapeHtml(userIdentity.name || '')}" placeholder="留空则使用全局昵称">
              </div>
              <div class="info-field">
                <label>头像 URL</label>
                <input type="text" class="info-input" id="ui-avatar" value="${escapeHtml(userIdentity.avatarUrl || '')}" placeholder="留空则使用全局头像">
              </div>
              <div class="info-field">
                <label>人设</label>
                <textarea class="info-input info-textarea" id="ui-bio" placeholder="描述你在这段关系中的身份...">${escapeHtml(userIdentity.bio || '')}</textarea>
              </div>
            </div>

            <!-- 聊天背景 -->
            <div class="info-section">
              <div class="info-section__title">聊天背景</div>
              <div class="info-field">
                <label>背景图 URL</label>
                <input type="text" class="info-input" id="chat-bg-url" value="${escapeHtml(_data.backgrounds[_currentConvId] || '')}" placeholder="输入图片 URL...">
              </div>
            </div>

            <!-- 对话总结 -->
            <div class="info-section">
              <div class="info-section__title">对话总结</div>
              <button class="info-btn" id="view-summaries-btn">查看历史总结</button>
              <button class="info-btn" id="edit-summary-prompt-btn">编辑总结 Prompt</button>
              <button class="info-btn info-btn--danger" id="manual-summary-btn">立即总结</button>
            </div>

            <!-- 知识库 -->
            <div class="info-section">
              <div class="info-section__title">知识库</div>
              <textarea class="info-input info-textarea" id="char-knowledge" rows="5" placeholder="输入角色的背景知识、世界观设定...">${escapeHtml(char.knowledgeBase || '')}</textarea>
            </div>

            <!-- 系统提示词 -->
            <div class="info-section">
              <div class="info-section__title">系统提示词</div>
              <textarea class="info-input info-textarea" id="char-system-prompt" rows="4" placeholder="额外的角色扮演指令...">${escapeHtml(char.systemPrompt || '')}</textarea>
            </div>

            <button class="info-btn info-btn--primary" id="info-save-btn">保存设置</button>
            <button class="info-btn info-btn--danger" id="delete-char-btn">删除角色</button>
          </div>
        </div>`;
    } else {
      // 群聊详情
      const group = info.data;
      const userIdentity = group.userIdentity || {};
      return `
        <div class="info-panel">
          <div class="info-panel__header">
            <button class="info-panel__close" id="info-panel-close">✕</button>
            <h3>群聊详情</h3>
          </div>
          <div class="info-panel__body">
            <div class="info-section">
              <div class="info-section__title">群成员</div>
              <div class="info-members">
                ${(group.members || []).map(id => {
                  const char = getCharById(id);
                  if (!char) return '';
                  return `<div class="info-member">
                    ${char.avatarUrl ? `<img src="${escapeHtml(char.avatarUrl)}" alt="">` : `<div class="info-member__fallback">${char.name.charAt(0)}</div>`}
                    <span>${escapeHtml(char.name)}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>

            <!-- 我的身份 -->
            <div class="info-section">
              <div class="info-section__title">我的身份（此群专属）</div>
              <div class="info-field">
                <label>昵称</label>
                <input type="text" class="info-input" id="ui-name" value="${escapeHtml(userIdentity.name || '')}" placeholder="留空则使用全局昵称">
              </div>
              <div class="info-field">
                <label>头像 URL</label>
                <input type="text" class="info-input" id="ui-avatar" value="${escapeHtml(userIdentity.avatarUrl || '')}" placeholder="留空则使用全局头像">
              </div>
              <div class="info-field">
                <label>人设</label>
                <textarea class="info-input info-textarea" id="ui-bio" placeholder="描述你在群里的身份...">${escapeHtml(userIdentity.bio || '')}</textarea>
              </div>
            </div>

            <!-- 聊天背景 -->
            <div class="info-section">
              <div class="info-section__title">聊天背景</div>
              <div class="info-field">
                <label>背景图 URL</label>
                <input type="text" class="info-input" id="chat-bg-url" value="${escapeHtml(_data.backgrounds[_currentConvId] || '')}" placeholder="输入图片 URL...">
              </div>
            </div>

            <!-- 对话总结 -->
            <div class="info-section">
              <div class="info-section__title">对话总结</div>
              <button class="info-btn" id="view-summaries-btn">查看历史总结</button>
              <button class="info-btn" id="edit-summary-prompt-btn">编辑总结 Prompt</button>
              <button class="info-btn info-btn--danger" id="manual-summary-btn">立即总结</button>
            </div>

            <!-- 群聊设定 -->
            <div class="info-section">
              <div class="info-section__title">群聊设定</div>
              <textarea class="info-input info-textarea" id="char-system-prompt" rows="4" placeholder="群聊的背景设定...">${escapeHtml(group.systemPrompt || '')}</textarea>
            </div>

            <button class="info-btn info-btn--primary" id="info-save-btn">保存设置</button>
            <button class="info-btn info-btn--danger" id="delete-char-btn">删除群聊</button>
          </div>
        </div>`;
    }
  }
  /* ========== 渲染会话详情面板 结束 ========== */

  /* ========== 绑定主界面事件 开始 ========== */
  function bindMainEvents() {
    document.getElementById('chat-back-btn')?.addEventListener('click', () => {
      MiniApp.closeApp();
    });

    document.getElementById('chat-new-btn')?.addEventListener('click', () => {
      openCharsView();
    });

    document.getElementById('chat-settings-btn')?.addEventListener('click', () => {
      openChatSettingsView();
    });
  }
  /* ========== 绑定主界面事件 结束 ========== */

  /* ========== 绑定聊天窗口事件 开始 ========== */
  function bindChatWindowEvents(convId) {
    const $window = document.getElementById('chat-window-view');

    // 返回按钮
    document.getElementById('cw-back')?.addEventListener('click', () => {
      if (_streamController) { _streamController.abort(); _streamController = null; }
      $window.classList.remove('open');
      _currentConvId = null;
      renderConvList();
    });

    // 详情按钮
    document.getElementById('cw-info-btn')?.addEventListener('click', () => {
      const $panel = document.getElementById('chat-info-panel');
      $panel.classList.toggle('open');
    });

    // 关闭详情面板
    document.getElementById('info-panel-close')?.addEventListener('click', () => {
      document.getElementById('chat-info-panel')?.classList.remove('open');
    });

    // 发送按钮
    document.getElementById('chat-send-btn')?.addEventListener('click', () => sendTextMessage(convId));

    // 输入框回车发送（Shift+Enter换行）
    const $input = document.getElementById('chat-input-box');
    $input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendTextMessage(convId);
      }
    });

    // 输入框自动高度
    $input?.addEventListener('input', () => {
      $input.style.height = 'auto';
      $input.style.height = Math.min($input.scrollHeight, 120) + 'px';
    });

    // 更多按钮（展开/收起特殊功能）
    document.getElementById('chat-input-more-btn')?.addEventListener('click', () => {
      const $extras = document.getElementById('chat-input-extras');
      $extras.classList.toggle('open');
      document.getElementById('chat-sticker-panel')?.classList.remove('open');
    });

    // 特殊功能按钮
    document.getElementById('chat-input-extras')?.querySelectorAll('.chat-extra-btn').forEach(btn => {
      btn.addEventListener('click', () => handleExtraAction(btn.dataset.action, convId));
    });

    // 表情包面板
    bindStickerPanelEvents(convId);

    // 详情面板保存
    bindInfoPanelEvents(convId);
  }
  /* ========== 绑定聊天窗口事件 结束 ========== */

  /* ========== 发送文字消息 开始 ========== */
  async function sendTextMessage(convId) {
    const $input = document.getElementById('chat-input-box');
    const text = $input?.value.trim();
    if (!text) return;

    $input.value = '';
    $input.style.height = 'auto';

    // 添加用户消息
    addMessage(convId, { role: 'user', type: 'text', content: text, timestamp: Date.now() });
    renderMessagesInWindow(convId);
    scrollToBottom();

    // 禁用发送按钮
    const $sendBtn = document.getElementById('chat-send-btn');
    if ($sendBtn) $sendBtn.disabled = true;

    // 添加 AI 正在输入占位
    const thinkingId = 'thinking_' + Date.now();
    appendThinkingBubble(thinkingId);

    try {
      const messages = buildMessages(convId, text);
      _streamController = new AbortController();

      let aiText = '';
      const info = getConvInfo(convId);

      await callAI(messages, (delta, full) => {
        aiText = full;
        updateThinkingBubble(thinkingId, full, info);
      }, _streamController.signal);

      // 移除占位，添加正式消息
      removeThinkingBubble(thinkingId);

      // 群聊解析多角色
      if (info.type === 'group') {
        parseGroupReply(convId, aiText, info);
      } else {
        addMessage(convId, { role: 'assistant', type: 'text', content: aiText, timestamp: Date.now() });
      }

      renderMessagesInWindow(convId);
      scrollToBottom();
      saveData();

      // 检查是否需要自动总结
      checkAndSummarize(convId);

    } catch (e) {
      removeThinkingBubble(thinkingId);
      if (e.name !== 'AbortError') {
        MiniApp.showToast('发送失败：' + e.message);
        console.error('[ChatApp] AI 调用失败', e);
      }
    } finally {
      _streamController = null;
      if ($sendBtn) $sendBtn.disabled = false;
    }
  }
  /* ========== 发送文字消息 结束 ========== */

  /* ========== 群聊多角色解析 开始 ========== */
  function parseGroupReply(convId, text, info) {
    // 格式：【角色名】：内容
    const lines = text.split('\n');
    let currentSender = null;
    let currentLines = [];

    const flush = () => {
      if (currentSender && currentLines.length > 0) {
        addMessage(convId, {
          role: 'assistant',
          type: 'text',
          content: currentLines.join('\n').trim(),
          senderName: currentSender,
          timestamp: Date.now(),
        });
      }
      currentLines = [];
    };

    for (const line of lines) {
      const match = line.match(/^【(.+?)】[：:]\s*(.*)/);
      if (match) {
        flush();
        currentSender = match[1];
        if (match[2]) currentLines.push(match[2]);
      } else if (currentSender) {
        currentLines.push(line);
      }
    }
    flush();

    // 如果没有解析到格式，作为整体消息
    if (_data.conversations[convId]?.messages.slice(-1)[0]?.role !== 'assistant') {
      addMessage(convId, { role: 'assistant', type: 'text', content: text, timestamp: Date.now() });
    }
  }
  /* ========== 群聊多角色解析 结束 ========== */

  /* ========== 流式输出气泡 开始 ========== */
  function appendThinkingBubble(id) {
    const $msgs = document.getElementById('chat-messages');
    if (!$msgs) return;
    const info = getConvInfo(_currentConvId);
    if (!info) return;

    const avatarHtml = info.avatarUrl
      ? `<img src="${escapeHtml(info.avatarUrl)}" alt="">`
      : `<div class="msg-avatar__fallback">${info.name.charAt(0)}</div>`;

    const div = document.createElement('div');
    div.className = 'msg-row msg-row--other msg-row--thinking';
    div.id = id;
    div.innerHTML = `
      <div class="msg-avatar">${avatarHtml}</div>
      <div class="msg-body">
        <div class="msg-bubble msg-bubble--text msg-bubble--streaming">
          <p class="msg-text"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>`;
    $msgs.appendChild(div);
    scrollToBottom();
  }

  function updateThinkingBubble(id, text, info) {
    const el = document.getElementById(id);
    if (!el) return;
    const bubble = el.querySelector('.msg-bubble');
    if (bubble) {
      bubble.innerHTML = `<p class="msg-text">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    }
    scrollToBottom();
  }

  function removeThinkingBubble(id) {
    document.getElementById(id)?.remove();
  }
  /* ========== 流式输出气泡 结束 ========== */

  /* ========== 特殊消息处理 开始 ========== */
  function handleExtraAction(action, convId) {
    const info = getConvInfo(convId);
    document.getElementById('chat-input-extras')?.classList.remove('open');

    switch (action) {
      case 'image':
        showModal('发送图片', `
          <div class="modal-field">
            <label>图片描述</label>
            <input type="text" id="modal-image-desc" class="modal-input" placeholder="描述图片内容...">
          </div>
        `, () => {
          const desc = document.getElementById('modal-image-desc')?.value.trim();
          if (!desc) return;
          sendSpecialMessage(convId, {
            role: 'user', type: 'image',
            content: desc,
            aiContent: `[用户发送了一张图片：${desc}]`,
            timestamp: Date.now(),
          });
        });
        break;

      case 'voice':
        showModal('发送语音', `
          <div class="modal-field">
            <label>语音内容描述</label>
            <input type="text" id="modal-voice-desc" class="modal-input" placeholder="说了什么...">
          </div>
          <div class="modal-field">
            <label>时长（秒）</label>
            <input type="number" id="modal-voice-dur" class="modal-input" value="5" min="1" max="60">
          </div>
        `, () => {
          const desc = document.getElementById('modal-voice-desc')?.value.trim();
          const dur = document.getElementById('modal-voice-dur')?.value || '5';
          if (!desc) return;
          sendSpecialMessage(convId, {
            role: 'user', type: 'voice',
            content: desc,
            duration: dur,
            aiContent: `[用户发送了一条${dur}秒的语音：${desc}]`,
            timestamp: Date.now(),
          });
        });
        break;

      case 'sticker':
        document.getElementById('chat-sticker-panel')?.classList.toggle('open');
        break;

      case 'transfer':
        showModal('转账', `
          <div class="modal-field">
            <label>金额（元）</label>
            <input type="number" id="modal-transfer-amount" class="modal-input" placeholder="0.00" min="0.01" step="0.01">
          </div>
          <div class="modal-field">
            <label>备注（可选）</label>
            <input type="text" id="modal-transfer-note" class="modal-input" placeholder="转账备注...">
          </div>
        `, () => {
          const amount = document.getElementById('modal-transfer-amount')?.value;
          const note = document.getElementById('modal-transfer-note')?.value.trim();
          if (!amount) return;
          sendSpecialMessage(convId, {
            role: 'user', type: 'transfer',
            amount,
            note,
            aiContent: `[用户向你转账了 ¥${amount}${note ? `，备注：${note}` : ''}]`,
            timestamp: Date.now(),
          });
        });
        break;

      case 'gift':
        showModal('送礼物', `
          <div class="modal-field">
            <label>礼物名称</label>
            <input type="text" id="modal-gift-name" class="modal-input" placeholder="玫瑰花、蛋糕...">
          </div>
          <div class="modal-field">
            <label>礼物 Emoji</label>
            <input type="text" id="modal-gift-emoji" class="modal-input" value="🎁" placeholder="🎁">
          </div>
          <div class="modal-field">
            <label>留言（可选）</label>
            <input type="text" id="modal-gift-note" class="modal-input" placeholder="送你的...">
          </div>
        `, () => {
          const name = document.getElementById('modal-gift-name')?.value.trim();
          const emoji = document.getElementById('modal-gift-emoji')?.value.trim() || '🎁';
          const note = document.getElementById('modal-gift-note')?.value.trim();
          if (!name) return;
          sendSpecialMessage(convId, {
            role: 'user', type: 'gift',
            giftName: name,
            giftEmoji: emoji,
            note,
            aiContent: `[用户送给你一份礼物：${emoji} ${name}${note ? `，留言：${note}` : ''}]`,
            timestamp: Date.now(),
          });
        });
        break;

      case 'location':
        showModal('发送位置', `
          <div class="modal-field">
            <label>位置名称</label>
            <input type="text" id="modal-loc-name" class="modal-input" placeholder="咖啡厅、家...">
          </div>
          <div class="modal-field">
            <label>详细地址（可选）</label>
            <input type="text" id="modal-loc-addr" class="modal-input" placeholder="具体地址...">
          </div>
        `, () => {
          const name = document.getElementById('modal-loc-name')?.value.trim();
          const addr = document.getElementById('modal-loc-addr')?.value.trim();
          if (!name) return;
          sendSpecialMessage(convId, {
            role: 'user', type: 'location',
            locationName: name,
            address: addr,
            aiContent: `[用户分享了位置：${name}${addr ? `（${addr}）` : ''}]`,
            timestamp: Date.now(),
          });
        });
        break;
    }
  }

  async function sendSpecialMessage(convId, msgData) {
    addMessage(convId, msgData);
    renderMessagesInWindow(convId);
    scrollToBottom();

    // 构建AI上下文，用aiContent让AI理解
    const aiMessages = buildMessages(convId, msgData.aiContent || msgData.content || '');
    const $sendBtn = document.getElementById('chat-send-btn');
    if ($sendBtn) $sendBtn.disabled = true;

    const thinkingId = 'thinking_' + Date.now();
    appendThinkingBubble(thinkingId);

    try {
      _streamController = new AbortController();
      const info = getConvInfo(convId);
      let aiText = '';

      await callAI(aiMessages, (delta, full) => {
        aiText = full;
        updateThinkingBubble(thinkingId, full, info);
      }, _streamController.signal);

      removeThinkingBubble(thinkingId);

      if (info.type === 'group') {
        parseGroupReply(convId, aiText, info);
      } else {
        addMessage(convId, { role: 'assistant', type: 'text', content: aiText, timestamp: Date.now() });
      }

      renderMessagesInWindow(convId);
      scrollToBottom();
      saveData();
      checkAndSummarize(convId);
    } catch (e) {
      removeThinkingBubble(thinkingId);
      if (e.name !== 'AbortError') {
        MiniApp.showToast('发送失败：' + e.message);
      }
    } finally {
      _streamController = null;
      if ($sendBtn) $sendBtn.disabled = false;
    }
  }
  /* ========== 特殊消息处理 结束 ========== */

  /* ========== 消息管理 开始 ========== */
  function addMessage(convId, msg) {
    const conv = getConv(convId);
    conv.messages.push(msg);
    saveData();
  }

  function renderMessagesInWindow(convId) {
    const $msgs = document.getElementById('chat-messages');
    if (!$msgs) return;
    const conv = getConv(convId);
    const info = getConvInfo(convId);
    if (!info) return;
    $msgs.innerHTML = renderMessages(conv.messages, info);
  }

  function scrollToBottom() {
    const $msgs = document.getElementById('chat-messages');
    if ($msgs) $msgs.scrollTop = $msgs.scrollHeight;
  }
  /* ========== 消息管理 结束 ========== */

  /* ========== 表情包面板事件 开始 ========== */
  function bindStickerPanelEvents(convId) {
    const $panel = document.getElementById('chat-sticker-panel');
    if (!$panel) return;

    $panel.addEventListener('click', (e) => {
      const item = e.target.closest('.sticker-item');
      if (item) {
        const url = item.dataset.url;
        $panel.classList.remove('open');
        sendSpecialMessage(convId, {
          role: 'user', type: 'sticker',
          content: url,
          aiContent: '[用户发送了一个表情包]',
          timestamp: Date.now(),
        });
      }

      if (e.target.id === 'sticker-add-btn') {
        showModal('添加表情包', `
          <div class="modal-field">
            <label>图片 URL</label>
            <input type="text" id="modal-sticker-url" class="modal-input" placeholder="https://...">
          </div>
          <div class="modal-field">
            <label>名称（可选）</label>
                        <input type="text" id="modal-sticker-name" class="modal-input" placeholder="表情包名称...">
          </div>
        `, () => {
          const url = document.getElementById('modal-sticker-url')?.value.trim();
          const name = document.getElementById('modal-sticker-name')?.value.trim();
          if (!url) return;
          _data.stickers.push({ id: genId(), url, name: name || '' });
          saveData();
          // 刷新表情包面板
          if ($panel) $panel.innerHTML = renderStickerPanel();
          bindStickerPanelEvents(convId);
          MiniApp.showToast('表情包已添加 😄');
        });
      }
    });
  }
  /* ========== 表情包面板事件 结束 ========== */

  /* ========== 详情面板事件 开始 ========== */
  function bindInfoPanelEvents(convId) {
    const info = getConvInfo(convId);
    if (!info) return;

    // 保存按钮
    document.getElementById('info-save-btn')?.addEventListener('click', () => {
      const name = document.getElementById('ui-name')?.value.trim();
      const avatarUrl = document.getElementById('ui-avatar')?.value.trim();
      const bio = document.getElementById('ui-bio')?.value.trim();
      const bgUrl = document.getElementById('chat-bg-url')?.value.trim();
      const systemPrompt = document.getElementById('char-system-prompt')?.value.trim();
      const knowledge = document.getElementById('char-knowledge')?.value.trim();

      // 保存用户身份
      const userIdentity = { name, avatarUrl, bio };

      if (info.type === 'char') {
        const char = getCharById(info.data.id);
        if (char) {
          char.userIdentity = userIdentity;
          char.systemPrompt = systemPrompt || '';
          char.knowledgeBase = knowledge || '';
        }
      } else {
        const group = getGroupById(info.data.id);
        if (group) {
          group.userIdentity = userIdentity;
          group.systemPrompt = systemPrompt || '';
        }
      }

      // 保存聊天背景
      if (bgUrl) {
        _data.backgrounds[convId] = bgUrl;
      } else {
        delete _data.backgrounds[convId];
      }

      saveData();

      // 刷新聊天背景
      const $msgs = document.getElementById('chat-messages');
      if ($msgs) {
        $msgs.style.backgroundImage = bgUrl ? `url('${bgUrl}')` : '';
      }

      document.getElementById('chat-info-panel')?.classList.remove('open');
      MiniApp.showToast('设置已保存 ✅');
    });

    // 查看历史总结
    document.getElementById('view-summaries-btn')?.addEventListener('click', () => {
      showSummariesModal(convId);
    });

    // 编辑总结 Prompt
    document.getElementById('edit-summary-prompt-btn')?.addEventListener('click', () => {
      showModal('编辑总结 Prompt', `
        <div class="modal-field">
          <label>总结提示词</label>
          <textarea id="modal-summary-prompt" class="modal-input modal-textarea" rows="6">${escapeHtml(_data.summaryPrompt)}</textarea>
        </div>
      `, () => {
        const prompt = document.getElementById('modal-summary-prompt')?.value.trim();
        if (prompt) {
          _data.summaryPrompt = prompt;
          saveData();
          MiniApp.showToast('总结 Prompt 已更新 ✅');
        }
      });
    });

    // 立即总结
    document.getElementById('manual-summary-btn')?.addEventListener('click', async () => {
      document.getElementById('chat-info-panel')?.classList.remove('open');
      await forceSummarize(convId);
    });

    // 删除角色/群聊
    document.getElementById('delete-char-btn')?.addEventListener('click', () => {
      const typeName = info.type === 'char' ? '角色' : '群聊';
      showModal(`删除${typeName}`, `
        <p style="color:var(--text-secondary);text-align:center;padding:8px 0;">
          确定要删除「${escapeHtml(info.name)}」吗？<br>
          <span style="color:#ff3b30;font-size:13px;">此操作不可撤销，聊天记录将一并删除。</span>
        </p>
      `, () => {
        if (info.type === 'char') {
          _data.characters = _data.characters.filter(c => c.id !== info.data.id);
        } else {
          _data.groups = _data.groups.filter(g => g.id !== info.data.id);
        }
        delete _data.conversations[convId];
        delete _data.backgrounds[convId];
        saveData();

        document.getElementById('chat-window-view')?.classList.remove('open');
        _currentConvId = null;
        renderConvList();
        MiniApp.showToast(`${typeName}已删除`);
      }, { confirmText: '删除', confirmDanger: true });
    });
  }
  /* ========== 详情面板事件 结束 ========== */

  /* ========== 总结相关 开始 ========== */
  async function forceSummarize(convId) {
    const conv = getConv(convId);
    const textMessages = conv.messages.filter(m => m.type === 'text');
    if (textMessages.length === 0) {
      MiniApp.showToast('没有可总结的消息');
      return;
    }

    const dialogText = textMessages.map(m => {
      const prefix = m.role === 'user' ? (_data.myProfile.name || '我') : (getConvInfo(convId)?.name || 'AI');
      return `${prefix}：${m.content}`;
    }).join('\n');

    try {
      MiniApp.showToast('正在总结... 📝');
      const summaryMessages = [
        { role: 'system', content: _data.summaryPrompt },
        { role: 'user', content: dialogText },
      ];
      let summaryText = '';
      await callAI(summaryMessages, (delta, full) => { summaryText = full; }, null);

      conv.summaries = conv.summaries || [];
      conv.summaries.push({
        id: genId(),
        content: summaryText,
        createdAt: Date.now(),
        msgRange: [0, textMessages.length],
      });
      conv.lastSummaryAt = textMessages.length;
      saveData();
      MiniApp.showToast('总结完成 ✅');
    } catch (e) {
      MiniApp.showToast('总结失败：' + e.message);
    }
  }

  function showSummariesModal(convId) {
    const conv = getConv(convId);
    const summaries = conv.summaries || [];

    if (summaries.length === 0) {
      MiniApp.showToast('还没有总结记录');
      return;
    }

    const content = summaries.map((s, i) => `
      <div class="summary-item">
        <div class="summary-item__header">
          <span class="summary-item__num">第 ${i + 1} 次总结</span>
          <span class="summary-item__time">${formatTime(s.createdAt)}</span>
        </div>
        <div class="summary-item__content" id="summary-content-${i}">${escapeHtml(s.content)}</div>
        <button class="summary-item__edit-btn" data-idx="${i}">✏️ 编辑</button>
      </div>
    `).join('');

    showModal('历史总结', `<div class="summaries-list">${content}</div>`, null, {
      confirmText: '关闭',
      noCancel: true,
      onAfterRender: () => {
        document.querySelectorAll('.summary-item__edit-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            const s = summaries[idx];
            showModal('编辑总结', `
              <div class="modal-field">
                <textarea id="modal-edit-summary" class="modal-input modal-textarea" rows="8">${escapeHtml(s.content)}</textarea>
              </div>
            `, () => {
              const newContent = document.getElementById('modal-edit-summary')?.value.trim();
              if (newContent) {
                conv.summaries[idx].content = newContent;
                saveData();
                MiniApp.showToast('总结已更新 ✅');
              }
            });
          });
        });
      }
    });
  }
  /* ========== 总结相关 结束 ========== */

  /* ========== 角色管理视图 开始 ========== */
  function openCharsView() {
    const $view = document.getElementById('chat-chars-view');
    $view.innerHTML = renderCharsView();
    $view.classList.add('open');
    bindCharsViewEvents();
  }

  function renderCharsView() {
    return `
      <div class="chars-view">
        <div class="chat-nav">
          <button class="chat-nav__back" id="chars-back-btn">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <h1 class="chat-nav__title">角色 & 群聊</h1>
          <div class="chat-nav__actions">
            <button class="chat-nav__btn" id="chars-add-char-btn" title="新建角色">👤＋</button>
            <button class="chat-nav__btn" id="chars-add-group-btn" title="新建群聊">👥＋</button>
          </div>
        </div>

        <div class="chars-list" id="chars-list">
          ${renderCharsList()}
        </div>
      </div>
    `;
  }

  function renderCharsList() {
    let html = '';

    if (_data.characters.length > 0) {
      html += `<div class="chars-section-title">单聊角色</div>`;
      html += _data.characters.map(char => `
        <div class="char-card" data-char-id="${char.id}">
          <div class="char-card__avatar">
            ${char.avatarUrl
              ? `<img src="${escapeHtml(char.avatarUrl)}" alt="${escapeHtml(char.name)}">`
              : `<div class="char-card__avatar-fallback">${char.name.charAt(0)}</div>`}
          </div>
          <div class="char-card__info">
            <div class="char-card__name">${escapeHtml(char.name)}</div>
            <div class="char-card__bio">${escapeHtml(char.bio?.slice(0, 40) || '暂无设定')}</div>
          </div>
          <div class="char-card__actions">
            <button class="char-card__btn char-card__btn--edit" data-char-id="${char.id}" title="编辑">✏️</button>
            <button class="char-card__btn char-card__btn--chat" data-char-id="${char.id}" title="聊天">💬</button>
          </div>
        </div>
      `).join('');
    }

    if (_data.groups.length > 0) {
      html += `<div class="chars-section-title">群聊</div>`;
      html += _data.groups.map(group => `
        <div class="char-card" data-group-id="${group.id}">
          <div class="char-card__avatar">
            ${group.avatarUrl
              ? `<img src="${escapeHtml(group.avatarUrl)}" alt="${escapeHtml(group.name)}">`
              : `<div class="char-card__avatar-fallback">👥</div>`}
          </div>
          <div class="char-card__info">
            <div class="char-card__name">${escapeHtml(group.name)}</div>
            <div class="char-card__bio">${group.members?.length || 0} 位成员</div>
          </div>
          <div class="char-card__actions">
            <button class="char-card__btn char-card__btn--edit" data-group-id="${group.id}" title="编辑">✏️</button>
            <button class="char-card__btn char-card__btn--chat" data-group-id="${group.id}" title="聊天">💬</button>
          </div>
        </div>
      `).join('');
    }

    if (!html) {
      html = `
        <div class="chat-list__empty">
          <div class="chat-list__empty-icon">👤</div>
          <p>还没有角色</p>
          <p class="chat-list__empty-sub">点击右上角创建角色或群聊</p>
        </div>`;
    }

    return html;
  }

  function bindCharsViewEvents() {
    document.getElementById('chars-back-btn')?.addEventListener('click', () => {
      document.getElementById('chat-chars-view')?.classList.remove('open');
    });

    document.getElementById('chars-add-char-btn')?.addEventListener('click', () => {
      showCharEditor(null);
    });

    document.getElementById('chars-add-group-btn')?.addEventListener('click', () => {
      showGroupEditor(null);
    });

    document.getElementById('chars-list')?.querySelectorAll('.char-card__btn--edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.charId) showCharEditor(btn.dataset.charId);
        else if (btn.dataset.groupId) showGroupEditor(btn.dataset.groupId);
      });
    });

    document.getElementById('chars-list')?.querySelectorAll('.char-card__btn--chat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('chat-chars-view')?.classList.remove('open');
        if (btn.dataset.charId) openConversation(`char_${btn.dataset.charId}`);
        else if (btn.dataset.groupId) openConversation(`group_${btn.dataset.groupId}`);
      });
    });
  }
  /* ========== 角色管理视图 结束 ========== */

  /* ========== 角色编辑器 开始 ========== */
  function showCharEditor(charId) {
    const char = charId ? getCharById(charId) : null;
    showModal(char ? '编辑角色' : '新建角色', `
      <div class="modal-field">
        <label>角色名称 *</label>
        <input type="text" id="ce-name" class="modal-input" value="${escapeHtml(char?.name || '')}" placeholder="角色名...">
      </div>
      <div class="modal-field">
        <label>头像 URL</label>
        <input type="text" id="ce-avatar" class="modal-input" value="${escapeHtml(char?.avatarUrl || '')}" placeholder="https://...">
      </div>
      <div class="modal-field">
        <label>角色设定 / 性格</label>
        <textarea id="ce-bio" class="modal-input modal-textarea" rows="4" placeholder="描述角色的性格、背景...">${escapeHtml(char?.bio || '')}</textarea>
      </div>
      <div class="modal-field">
        <label>系统提示词（可选）</label>
        <textarea id="ce-system" class="modal-input modal-textarea" rows="3" placeholder="额外的角色扮演指令...">${escapeHtml(char?.systemPrompt || '')}</textarea>
      </div>
      <div class="modal-field">
        <label>知识库（可选）</label>
        <textarea id="ce-knowledge" class="modal-input modal-textarea" rows="3" placeholder="角色的背景知识、世界观...">${escapeHtml(char?.knowledgeBase || '')}</textarea>
      </div>
    `, () => {
      const name = document.getElementById('ce-name')?.value.trim();
      if (!name) { MiniApp.showToast('请输入角色名称'); return false; }

      const data = {
        name,
        avatarUrl: document.getElementById('ce-avatar')?.value.trim() || '',
        bio: document.getElementById('ce-bio')?.value.trim() || '',
        systemPrompt: document.getElementById('ce-system')?.value.trim() || '',
        knowledgeBase: document.getElementById('ce-knowledge')?.value.trim() || '',
      };

      if (char) {
        Object.assign(char, data);
      } else {
        _data.characters.push({ id: genId(), ...data });
      }
      saveData();

      // 刷新角色列表
      const $list = document.getElementById('chars-list');
      if ($list) $list.innerHTML = renderCharsList();
      bindCharsViewEvents();
      renderConvList();
      MiniApp.showToast(char ? '角色已更新 ✅' : '角色已创建 🎉');
    });
  }
  /* ========== 角色编辑器 结束 ========== */

  /* ========== 群聊编辑器 开始 ========== */
  function showGroupEditor(groupId) {
    const group = groupId ? getGroupById(groupId) : null;
    const charOptions = _data.characters.map(c => `
      <label class="modal-checkbox">
        <input type="checkbox" value="${c.id}" ${group?.members?.includes(c.id) ? 'checked' : ''}>
        ${escapeHtml(c.name)}
      </label>
    `).join('');

    showModal(group ? '编辑群聊' : '新建群聊', `
      <div class="modal-field">
        <label>群名称 *</label>
        <input type="text" id="ge-name" class="modal-input" value="${escapeHtml(group?.name || '')}" placeholder="群名...">
      </div>
      <div class="modal-field">
        <label>群头像 URL</label>
        <input type="text" id="ge-avatar" class="modal-input" value="${escapeHtml(group?.avatarUrl || '')}" placeholder="https://...">
      </div>
      <div class="modal-field">
        <label>选择成员</label>
        <div class="modal-checkboxes" id="ge-members">
          ${charOptions || '<p style="color:var(--text-secondary);font-size:13px;">请先创建角色</p>'}
        </div>
      </div>
      <div class="modal-field">
        <label>群聊设定（可选）</label>
        <textarea id="ge-system" class="modal-input modal-textarea" rows="3" placeholder="群聊的背景设定...">${escapeHtml(group?.systemPrompt || '')}</textarea>
      </div>
    `, () => {
      const name = document.getElementById('ge-name')?.value.trim();
      if (!name) { MiniApp.showToast('请输入群名称'); return false; }

      const members = [...document.querySelectorAll('#ge-members input:checked')].map(el => el.value);

      const data = {
        name,
        avatarUrl: document.getElementById('ge-avatar')?.value.trim() || '',
        members,
        systemPrompt: document.getElementById('ge-system')?.value.trim() || '',
      };

      if (group) {
        Object.assign(group, data);
      } else {
        _data.groups.push({ id: genId(), ...data });
      }
      saveData();

      const $list = document.getElementById('chars-list');
      if ($list) $list.innerHTML = renderCharsList();
      bindCharsViewEvents();
      renderConvList();
      MiniApp.showToast(group ? '群聊已更新 ✅' : '群聊已创建 🎉');
    });
  }
  /* ========== 群聊编辑器 结束 ========== */

  /* ========== 聊天全局设置视图 开始 ========== */
  function openChatSettingsView() {
    const $view = document.getElementById('chat-settings-view');
    $view.innerHTML = renderChatSettingsView();
    $view.classList.add('open');
    bindChatSettingsEvents();
  }

  function renderChatSettingsView() {
    const myProfile = _data.myProfile;
    return `
      <div class="chat-settings">
        <div class="chat-nav">
          <button class="chat-nav__back" id="cs-back-btn">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <h1 class="chat-nav__title">聊天设置</h1>
          <div style="width:44px"></div>
        </div>
        <div class="chat-settings__body">

          <!-- 我的全局资料 -->
          <div class="info-section">
            <div class="info-section__title">我的全局资料</div>
            <div class="info-field">
              <label>昵称</label>
              <input type="text" id="cs-my-name" class="info-input" value="${escapeHtml(myProfile.name || '')}" placeholder="我的昵称...">
            </div>
            <div class="info-field">
              <label>头像 URL</label>
              <input type="text" id="cs-my-avatar" class="info-input" value="${escapeHtml(myProfile.avatarUrl || '')}" placeholder="https://...">
            </div>
            <div class="info-field">
              <label>全局人设</label>
              <textarea id="cs-my-bio" class="info-input info-textarea" rows="3" placeholder="描述你自己...">${escapeHtml(myProfile.bio || '')}</textarea>
            </div>
          </div>

          <!-- AI 模型选择 -->
          <div class="info-section">
            <div class="info-section__title">AI 模型</div>
            <div class="info-field">
              <label>当前模型</label>
              <div class="model-select-row">
                <select id="cs-model-select" class="info-input info-select">
                  <option value="">-- 点击刷新获取模型 --</option>
                  ${_availableModels.map(m => `
                    <option value="${escapeHtml(m)}" ${MiniStore.get('ai.model') === m ? 'selected' : ''}>${escapeHtml(m)}</option>
                  `).join('')}
                </select>
                <button class="info-btn" id="cs-refresh-models-btn" style="margin-top:8px;">🔄 刷新模型列表</button>
              </div>
            </div>
          </div>

          <!-- 表情包管理 -->
          <div class="info-section">
            <div class="info-section__title">表情包管理</div>
            <div class="sticker-manage-grid" id="sticker-manage-grid">
              ${_data.stickers.length === 0
                ? '<p style="color:var(--text-secondary);font-size:13px;">还没有表情包</p>'
                : _data.stickers.map(s => `
                  <div class="sticker-manage-item">
                    <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.name || '')}" onerror="this.parentElement.style.display='none'">
                    <button class="sticker-manage-del" data-sticker-id="${s.id}">✕</button>
                  </div>
                `).join('')}
            </div>
            <button class="info-btn" id="cs-add-sticker-btn">＋ 添加表情包</button>
          </div>

          <!-- 总结 Prompt -->
          <div class="info-section">
            <div class="info-section__title">全局总结 Prompt</div>
            <textarea id="cs-summary-prompt" class="info-input info-textarea" rows="5">${escapeHtml(_data.summaryPrompt)}</textarea>
          </div>

          <button class="info-btn info-btn--primary" id="cs-save-btn">保存设置</button>
        </div>
      </div>
    `;
  }

  function bindChatSettingsEvents() {
    document.getElementById('cs-back-btn')?.addEventListener('click', () => {
      document.getElementById('chat-settings-view')?.classList.remove('open');
    });

    // 刷新模型列表
    document.getElementById('cs-refresh-models-btn')?.addEventListener('click', async () => {
      MiniApp.showToast('正在获取模型列表...');
      const models = await fetchModels();
      if (models.length === 0) {
        MiniApp.showToast('获取失败，请检查 API 配置');
        return;
      }
      const $select = document.getElementById('cs-model-select');
      if ($select) {
        const currentModel = MiniStore.get('ai.model') || '';
        $select.innerHTML = models.map(m => `
          <option value="${escapeHtml(m)}" ${currentModel === m ? 'selected' : ''}>${escapeHtml(m)}</option>
        `).join('');
      }
      MiniApp.showToast(`获取到 ${models.length} 个模型 ✅`);
    });

    // 删除表情包
    document.getElementById('sticker-manage-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.sticker-manage-del');
      if (btn) {
        _data.stickers = _data.stickers.filter(s => s.id !== btn.dataset.stickerId);
        saveData();
        const grid = document.getElementById('sticker-manage-grid');
        if (grid) {
          grid.innerHTML = _data.stickers.length === 0
            ? '<p style="color:var(--text-secondary);font-size:13px;">还没有表情包</p>'
            : _data.stickers.map(s => `
              <div class="sticker-manage-item">
                <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.name || '')}" onerror="this.parentElement.style.display='none'">
                <button class="sticker-manage-del" data-sticker-id="${s.id}">✕</button>
              </div>
            `).join('');
        }
        MiniApp.showToast('已删除');
      }
    });

    // 添加表情包
    document.getElementById('cs-add-sticker-btn')?.addEventListener('click', () => {
      showModal('添加表情包', `
        <div class="modal-field">
          <label>图片 URL</label>
          <input type="text" id="modal-sticker-url" class="modal-input" placeholder="https://...">
        </div>
        <div class="modal-field">
          <label>名称（可选）</label>
          <input type="text" id="modal-sticker-name" class="modal-input" placeholder="表情包名称...">
        </div>
      `, () => {
        const url = document.getElementById('modal-sticker-url')?.value.trim();
        const name = document.getElementById('modal-sticker-name')?.value.trim();
        if (!url) return;
        _data.stickers.push({ id: genId(), url, name: name || '' });
        saveData();
        // 刷新管理界面
        openChatSettingsView();
        MiniApp.showToast('表情包已添加 😄');
      });
    });

    // 保存
    document.getElementById('cs-save-btn')?.addEventListener('click', () => {
      _data.myProfile.name = document.getElementById('cs-my-name')?.value.trim() || '我';
      _data.myProfile.avatarUrl = document.getElementById('cs-my-avatar')?.value.trim() || '';
      _data.myProfile.bio = document.getElementById('cs-my-bio')?.value.trim() || '';
      _data.summaryPrompt = document.getElementById('cs-summary-prompt')?.value.trim() || DEFAULT_DATA.summaryPrompt;

      const selectedModel = document.getElementById('cs-model-select')?.value;
      if (selectedModel) MiniStore.set('ai.model', selectedModel);

      saveData();
      MiniApp.showToast('设置已保存 ✅');
    });
  }
  /* ========== 聊天全局设置视图 结束 ========== */

  /* ========== 通用 Modal 开始 ========== */
  function showModal(title, bodyHtml, onConfirm, options = {}) {
    // 移除已有 modal
    document.getElementById('chat-modal')?.remove();

    const {
      confirmText = '确定',
      cancelText = '取消',
      noCancel = false,
      confirmDanger = false,
      onAfterRender = null,
    } = options;

    const modal = document.createElement('div');
    modal.id = 'chat-modal';
    modal.className = 'chat-modal';
    modal.innerHTML = `
      <div class="chat-modal__overlay"></div>
      <div class="chat-modal__box">
        <div class="chat-modal__header">
          <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="chat-modal__body">${bodyHtml}</div>
        <div class="chat-modal__footer">
          ${!noCancel ? `<button class="chat-modal__btn chat-modal__btn--cancel" id="modal-cancel-btn">${escapeHtml(cancelText)}</button>` : ''}
          ${onConfirm ? `<button class="chat-modal__btn ${confirmDanger ? 'chat-modal__btn--danger' : 'chat-modal__btn--confirm'}" id="modal-confirm-btn">${escapeHtml(confirmText)}
                    </button>` : `<button class="chat-modal__btn chat-modal__btn--confirm" id="modal-confirm-btn">${escapeHtml(confirmText)}</button>`}
        </div>
      </div>
    `;

    document.getElementById('app-content').appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    };

    document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
    document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
      if (onConfirm) {
        const result = onConfirm();
        if (result === false) return; // 返回false阻止关闭
      }
      close();
    });
    modal.querySelector('.chat-modal__overlay')?.addEventListener('click', close);

    if (onAfterRender) setTimeout(onAfterRender, 50);
  }
  /* ========== 通用 Modal 结束 ========== */

  /* ========== 公开 API 开始 ========== */
  return { open };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== ChatApp 聊天应用 结束 ========== */


