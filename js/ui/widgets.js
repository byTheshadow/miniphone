/* ========== MiniPhone Widgets 小组件系统 开始 ========== */

/**
 * MiniPhone Widgets
 * 负责渲染各种主屏幕小组件
 */
const MiniWidgets = (() => {
  'use strict';

  /* ========== 小组件注册表 开始 ========== */
  const registry = {};
  /* ========== 小组件注册表 结束 ========== */

  /* ========== 注册小组件 开始 ========== */
  function register(type, renderer) {
    registry[type] = renderer;
  }
  /* ========== 注册小组件 结束 ========== */

  /* ========== 渲染小组件 开始 ========== */
  function render(type, config = {}) {
    const renderer = registry[type];
    if (!renderer) {
      console.warn(`[Widgets] 未知小组件类型: ${type}`);
      return '';
    }
    return renderer(config);
  }
  /* ========== 渲染小组件 结束 ========== */

  /* ========== 时钟小组件 开始 ========== */
  register('clock', (config) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return `
      <div class="widget widget--medium widget-clock" data-widget="clock">
        <div class="widget-clock__time">${timeStr}</div>
        <div class="widget-clock__date">${dateStr}</div>
      </div>
    `;
  });
  /* ========== 时钟小组件 结束 ========== */

  /* ========== 倒数日小组件 开始 ========== */
  register('countdown', (config) => {
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
      <div class="widget widget--small widget-countdown" data-widget="countdown">
        <div class="widget-countdown__number">${displayNum}</div>
        <div class="widget-countdown__info">
          <div class="widget-countdown__label">${label}</div>
          <div class="widget-countdown__title">${title}</div>
          <div class="widget-countdown__date">${dateDisplay}</div>
        </div>
      </div>
    `;
  });
  /* ========== 倒数日小组件 结束 ========== */

  /* ========== 一起听小组件 开始 ========== */
  register('music', (config) => {
    const title = config.title || '暂无播放';
    const artist = config.artist || '';
    const progress = config.progress || 0;
    const coverUrl = config.coverUrl || '';
    const coverContent = coverUrl
      ? `<img src="${coverUrl}" alt="cover">`
      : '🎵';

    return `
      <div class="widget widget--medium widget-music" data-widget="music">
        <div class="widget-music__cover">${coverContent}</div>
        <div class="widget-music__info">
          <div class="widget-music__tag">♫一起听</div>
          <div class="widget-music__title">${title}</div>
          <div class="widget-music__artist">${artist}</div>
          <div class="widget-music__bar">
            <div class="widget-music__progress" style="width:${progress}%"></div></div>
        </div>
      </div>
    `;
  });
  /* ========== 一起听小组件 结束 ========== */

  /* ========== 个性签名小组件 开始 ========== */
  register('profile', (config) => {
    const name = config.name || '用户';
    const bio = config.bio || '';
    const avatarUrl = config.avatarUrl || '';
    const avatarContent = avatarUrl
      ? `<img src="${avatarUrl}" alt="avatar">`
      : '😊';

    return `
      <div class="widget widget--medium widget-profile" data-widget="profile">
        <div class="widget-profile__avatar">${avatarContent}</div>
        <div class="widget-profile__text">
          <div class="widget-profile__name">${name}</div>
          <div class="widget-profile__bio">${bio}</div>
        </div>
      </div>
    `;
  });
  /* ========== 个性签名小组件 结束 ========== */

  /* ========== 备忘录小组件 开始 ========== */
  register('memo', (config) => {
    const content = (config.content || '').replace(/\n/g, '<br>');
    return `
      <div class="widget widget--medium widget-memo" data-widget="memo">
        <div class="widget-memo__header">
          <span class="widget-memo__icon">📝</span>
          <span class="widget-memo__title">备忘录</span>
        </div>
        <div class="widget-memo__content">${content}</div>
      </div>
    `;
  });
  /* ========== 备忘录小组件 结束 ========== */

  /* ========== 天气小组件 开始 ========== */
  register('weather', (config) => {
    const city = config.city || '未知';
    const temp = config.temp || '--°';
    const desc = config.desc || '';
    const icon = config.icon || '🌤️';

    return `
      <div class="widget widget--small widget-weather" data-widget="weather">
        <div class="widget-weather__left">
          <div class="widget-weather__city">${city}</div>
          <div class="widget-weather__temp">${temp}</div>
          <div class="widget-weather__desc">${desc}</div>
        </div>
        <div class="widget-weather__icon">${icon}</div>
      </div>
    `;
  });
  /* ========== 天气小组件 结束 ========== */

  /* ========== 宠物状态小组件 开始 ========== */
  register('pet', (config) => {
    const name = config.name || '宠物';
    const sprite = config.sprite || '🐣';
    const mood = config.mood || '普通';
    const hp = config.hp ?? 100;
    const hunger = config.hunger ?? 100;
    const happy = config.happy ?? 100;

    return `
      <div class="widget widget--medium widget-pet" data-widget="pet">
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
  /* ========== 宠物状态小组件 结束 ========== */

  /* ========== 更新时钟定时器 开始 ========== */
  function startClockUpdate() {
    setInterval(() => {
      const clockEl = document.querySelector('[data-widget="clock"]');
      if (!clockEl) return;
      const now = new Date();
      const timeEl = clockEl.querySelector('.widget-clock__time');
      const dateEl = clockEl.querySelector('.widget-clock__date');
      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
      }

      // 同步状态栏时间
      const statusTime = document.getElementById('status-time');
      if (statusTime) {
        statusTime.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }, 1000);
  }
  /* ========== 更新时钟定时器 结束 ========== */

  /* ========== 公开 API 开始 ========== */
  return { register, render, startClockUpdate };
  /* ========== 公开 API 结束 ========== */

})();

/* ========== MiniPhone Widgets 小组件系统 结束 ========== */
