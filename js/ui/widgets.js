/* ========== MiniPhone Widgets 小组件系统 开始 ========== */

/**
 * MiniPhone Widgets
 * 负责渲染各种主屏幕小组件 + 小组件管理（新增/编辑/删除）
 */
const MiniWidgets = (() => {
  'use strict';

  /* ========== 小组件类型定义 开始 ========== */
  const WIDGET_TYPES = {
    clock: {
      name: '时钟',
      icon: '🕐',
      desc: '显示当前时间和日期',
      size: 'medium',
      fields: [],},
    countdown: {
      name: '倒数日',
      icon: '⏳',
      desc: '倒计时到指定日期',
      size: 'small',
      fields: [
        { key: 'title', label: '事件名称', type: 'text', placeholder: '例：新年快乐' },
        { key: 'targetDate', label: '目标日期', type: 'date', placeholder: '' },
      ],
    },
    music: {
      name: '一起听',
      icon: '🎵',
      desc: '展示当前播放的音乐',
      size: 'medium',
      fields: [
        { key: 'title', label: '歌曲名', type: 'text', placeholder: '歌曲名称' },
        { key: 'artist', label: '歌手', type: 'text', placeholder: '歌手名称' },
        { key: 'coverUrl', label: '封面图片URL', type: 'text', placeholder: 'https://...' },
        { key: 'progress', label: '播放进度(0-100)', type: 'number', placeholder: '35' },
      ],
    },
    profile: {
      name: '个性签名',
      icon: '👤',
      desc: '头像 + 一句话签名',
      size: 'medium',
      fields: [
        { key: 'name', label: '昵称', type: 'text', placeholder: '你的名字' },
        { key: 'bio', label: '签名', type: 'text', placeholder: '这个人很懒...' },
        { key: 'avatarUrl', label: '头像 URL', type: 'text', placeholder: 'https://...' },
      ],
    },
    memo: {
      name: '备忘录',
      icon: '📝',
      desc: '快速记录文字备忘',
      size: 'medium',
      fields: [
        { key: 'content', label: '内容', type: 'textarea', placeholder: '写点什么...' },
      ],
    },
    weather: {
      name: '天气',
      icon: '🌤️',
      desc: '显示天气信息',
      size: 'small',
      fields: [
        { key: 'city', label: '城市', type: 'text', placeholder: '东京' },
        { key: 'temp', label: '温度', type: 'text', placeholder: '22°' },
        { key: 'desc', label: '天气描述', type: 'text', placeholder: '晴' },
        { key: 'icon', label: '天气图标', type: 'emoji', options: ['☀️', '⛅', '☁️', '🌧️', '⛈️', '🌨️', '🌪️', '🌫️'] },
      ],
    },
    pet: {
      name: '宠物状态',
      icon: '🐾',
      desc: '拓麻歌子风格宠物',
      size: 'medium',
      fields: [
        { key: 'name', label: '宠物名', type: 'text', placeholder: '小可爱' },
        { key: 'sprite', label: '宠物形象', type: 'emoji', options: ['🥚', '🐣', '🐥', '🐱', '🐶', '🐰', '🐹', '🐸', '🦊', '🐼', '🐨', '🦄'] },
        { key: 'mood', label: '心情', type: 'text', placeholder: '开心' },
        { key: 'hp', label: '生命值 (0-100)', type: 'number', placeholder: '100' },
        { key: 'hunger', label: '饱食度 (0-100)', type: 'number', placeholder: '80' },
        { key: 'happy', label: '快乐值 (0-100)', type: 'number', placeholder: '90' },
      ],
    },
  };
  /* ========== 小组件类型定义 结束 ========== */

  /* ========== 小组件渲染器注册表 开始 ========== */
  const renderers = {};
  /* ========== 小组件渲染器注册表 结束 ========== */

  /* ========== 注册渲染器 开始 ========== */
  function register(type, renderer) {
    renderers[type] = renderer;
  }
  /* ========== 注册渲染器 结束 ========== */

  /* ========== 渲染小组件 开始 ========== */
  function render(type, config = {}, widgetId = '') {
    const renderer = renderers[type];
    if (!renderer) {
      console.warn(`[Widgets] 未知小组件类型: ${type}`);
      return '';
    }
    return renderer(config, widgetId);
  }
  /* ========== 渲染小组件 结束 ========== */

  /* ========== 获取类型定义 开始 ========== */
  function getTypeDef(type) {
    return WIDGET_TYPES[type] || null;
  }

  function getAllTypes() {
    return WIDGET_TYPES;
  }
  /* ========== 获取类型定义 结束 ========== */

  /* ========== 生成唯一 ID 开始 ========== */
  function generateId() {
    return 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }
  /* ========== 生成唯一 ID 结束 ========== */

  /* ========== 时钟渲染器 开始 ========== */
  register('clock', (config, widgetId) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return `
      <div class="widget widget--medium widget-clock" data-widget-type="clock" data-widget-id="${widgetId}">
        <div class="widget-clock__time">${timeStr}</div>
        <div class="widget-clock__date">${dateStr}</div>
      </div>
    `;
  });
  /* ========== 时钟渲染器 结束 ========== */

  /* ========== 倒数日渲染器 开始 ========== */
  register('countdown', (config, widgetId) => {
    const title = config.title || '倒数日';
    const targetDate = config.targetDate || '';
    let daysLeft = '--';
    let dateDisplay = '未设置日期';

    if (targetDate) {
      const target = new Date(targetDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      daysLeft = diff;
      dateDisplay = target.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const label = typeof daysLeft === 'number' && daysLeft < 0 ? '已过去' : '剩余天数';
    const displayNum = typeof daysLeft === 'number' ? Math.abs(daysLeft) : daysLeft;

    return `
      <div class="widget widget--small widget-countdown" data-widget-type="countdown" data-widget-id="${widgetId}">
        <div class="widget-countdown__number">${displayNum}</div>
        <div class="widget-countdown__info">
          <div class="widget-countdown__label">${label}</div>
          <div class="widget-countdown__title">${title}</div>
          <div class="widget-countdown__date">${dateDisplay}</div>
        </div>
      </div>
    `;
  });
  /* ========== 倒数日渲染器 结束 ========== */

  /* ========== 一起听渲染器 开始 ========== */
  register('music', (config, widgetId) => {
    const title = config.title || '暂无播放';
    const artist = config.artist || '';
    const progress = config.progress || 0;
    const coverUrl = config.coverUrl || '';
    const coverContent = coverUrl ? `<img src="${coverUrl}" alt="cover">` : '🎵';

    return `
      <div class="widget widget--medium widget-music" data-widget-type="music" data-widget-id="${widgetId}">
        <div class="widget-music__cover">${coverContent}</div>
        <div class="widget-music__info">
          <div class="widget-music__tag">♫ 一起听</div>
          <div class="widget-music__title">${title}</div>
          <div class="widget-music__artist">${artist}</div>
          <div class="widget-music__bar">
            <div class="widget-music__progress" style="width:${progress}%"></div>
          </div>
        </div>
      </div>
    `;
  });
  /* ========== 一起听渲染器 结束 ========== */

  /* ========== 个性签名渲染器 开始 ========== */
  register('profile', (config, widgetId) => {
    const name = config.name || '用户';
    const bio = config.bio || '';
    const avatarUrl = config.avatarUrl || '';
    const avatarContent = avatarUrl ? `<img src="${avatarUrl}" alt="avatar">` : '😊';

    return `
      <div class="widget widget--medium widget-profile" data-widget-type="profile" data-widget-id="${widgetId}">
        <div class="widget-profile__avatar">${avatarContent}</div>
        <div class="widget-profile__text">
          <div class="widget-profile__name">${name}</div>
          <div class="widget-profile__bio">${bio}</div>
        </div>
      </div>
    `;
  });
  /* ========== 个性签名渲染器 结束 ========== */

  /* ========== 备忘录渲染器 开始 ========== */
  register('memo', (config, widgetId) => {
    const content = (config.content || '').replace(/\n/g, '<br>');
    return `
      <div class="widget widget--medium widget-memo" data-widget-type="memo" data-widget-id="${widgetId}">
        <div class="widget-memo__header">
          <span class="widget-memo__icon">📝</span>
          <span class="widget-memo__title">备忘录</span>
        </div>
        <div class="widget-memo__content">${content}</div>
      </div>
    `;
  });
  /* ========== 备忘录渲染器 结束 ========== */

  /* ========== 天气渲染器 开始 ========== */
  register('weather', (config, widgetId) => {
    const city = config.city || '未知';
    const temp = config.temp || '--°';
    const desc = config.desc || '';
    const icon = config.icon || '🌤️';

    return `
      <div class="widget widget--small widget-weather" data-widget-type="weather" data-widget-id="${widgetId}">
        <div class="widget-weather__left">
          <div class="widget-weather__city">${city}</div>
          <div class="widget-weather__temp">${temp}</div><div class="widget-weather__desc">${desc}</div>
        </div>
        <div class="widget-weather__icon">${icon}</div>
      </div>
    `;
  });
  /* ========== 天气渲染器 结束 ========== */

  /* ========== 宠物状态渲染器 开始 ========== */
  register('pet', (config, widgetId) => {
    const name = config.name || '宠物';
    const sprite = config.sprite || '🐣';
    const mood = config.mood || '普通';
    const hp = config.hp ?? 100;
    const hunger = config.hunger ?? 100;
    const happy = config.happy ?? 100;

    return `
      <div class="widget widget--medium widget-pet" data-widget-type="pet" data-widget-id="${widgetId}">
        <div class="widget-pet__sprite">${sprite}</div>
        <div class="widget-pet__info">
          <div class="widget-pet__name">${name}</div>
          <div class="widget-pet__mood">心情：${mood}</div>
          <div class="widget-pet__bars">
            <div class="widget-pet__bar">
              <span>❤️</span>
              <div class="widget-pet__bar-track">
                <div class="widget-pet__bar-fill widget-pet__bar-fill--hp" style="width:${hp}%"></div>
              </div>
            </div>
            <div class="widget-pet__bar">
              <span>🍖</span>
              <div class="widget-pet__bar-track">
                <div class="widget-pet__bar-fill widget-pet__bar-fill--hunger" style="width:${hunger}%"></div>
              </div>
            </div>
            <div class="widget-pet__bar">
              <span>😄</span>
              <div class="widget-pet__bar-track">
                <div class="widget-pet__bar-fill widget-pet__bar-fill--happy" style="width:${happy}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  /* ========== 宠物状态渲染器 结束 ========== */

  /* ========== 时钟自动更新 开始 ========== */
  function startClockUpdate() {
    setInterval(() => {
      const clockEl = document.querySelector('[data-widget-type="clock"]');
      if (clockEl) {
        const now = new Date();
        const timeEl = clockEl.querySelector('.widget-clock__time');
        const dateEl = clockEl.querySelector('.widget-clock__date');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
      }
      const statusTime = document.getElementById('status-time');
      if (statusTime) {
        statusTime.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }, 1000);
  }
  /* ========== 时钟自动更新 结束 ========== */

  /* ========== 公开API 开始 ========== */
  return {
    register,
    render,
    getTypeDef,
    getAllTypes,
    generateId,
    startClockUpdate,
    WIDGET_TYPES,
  };/* ========== 公开 API 结束 ========== */

})();

/* ========== MiniPhone Widgets 小组件系统 结束 ========== */


