/* ============================================================
   together-music.js — 一起听小组件
   尺寸：4×2，展示当前播放曲目，联动 music App
   ============================================================ */

/* [WIDGET-TOGETHER-MUSIC START] 一起听小组件注册 */
WidgetRegistry.register({
  id:          'together-music',
  name:        '一起听',
  emoji:       '🎵',
  sizes:       ['4x2', '4x1'],
  defaultSize: '4x2',
  desc:        '音乐播放器小组件',

  mount(container) {
    container.classList.add('widget-together-music');

    /* [MUSIC-WIDGET-STATE START] 状态 */
    // 从全局音乐状态读取（music App 写入 Store）
    const DEFAULT_STATE = {
      title:    '未在播放',
      artist:   '点击打开音乐',
      coverUrl: '',
      isPlaying: false,
      progress:  0,
    };
    /* [MUSIC-WIDGET-STATE END] */

    /* [MUSIC-WIDGET-RENDER START] 渲染 */
    function render(state = DEFAULT_STATE) {
      const s = { ...DEFAULT_STATE, ...state };
      container.innerHTML = `
        ${s.coverUrl
          ? `<div class="music-bg" style="background-image:url('${s.coverUrl}')"></div>`
          : `<div class="music-bg" style="background:linear-gradient(135deg,
               rgba(123,140,255,0.3),rgba(180,143,255,0.2))"></div>`}
        <div class="widget-inner">
          <div class="music-cover">
            ${s.coverUrl
              ? `<img src="${s.coverUrl}" alt="封面"
                   onerror="this.parentElement.textContent='🎵'">`
              : '🎵'}
          </div>
          <div class="music-info">
            <div class="widget-label">一起听</div>
            <div class="music-title">${_escHtml(s.title)}</div>
            <div class="music-artist">${_escHtml(s.artist)}</div>
            <div class="music-progress-bar">
              <div class="music-progress-fill"
                style="width:${Math.min(s.progress * 100, 100)}%"></div>
            </div>
            <div class="music-controls">
              <button class="music-btn" id="wg-music-prev"
                aria-label="上一首">⏮</button>
              <button class="music-btn play-btn" id="wg-music-play"
                aria-label="${s.isPlaying ? '暂停' : '播放'}">
                ${s.isPlaying ? '⏸' : '▶️'}
              </button>
              <button class="music-btn" id="wg-music-next"
                aria-label="下一首">⏭</button>
            </div>
          </div>
        </div>`;

      /* [MUSIC-WIDGET-CONTROLS START] 控制按钮事件 */
      container.querySelector('#wg-music-play')?.addEventListener('click', (e) => {
        e.stopPropagation();
        // 触发全局音乐控制事件
        document.dispatchEvent(new CustomEvent('miniphone:music:toggle'));
      });
      container.querySelector('#wg-music-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent('miniphone:music:prev'));
      });
      container.querySelector('#wg-music-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent('miniphone:music:next'));
      });
      /* [MUSIC-WIDGET-CONTROLS END] */
    }
    /* [MUSIC-WIDGET-RENDER END] */

    render();

    /* [MUSIC-WIDGET-SUBSCRIBE START] 订阅音乐状态变化 */
    const unsub = Store.subscribe('musicState', (state) => render(state));
    /* [MUSIC-WIDGET-SUBSCRIBE END] */

    // 点击打开音乐 App
    container.addEventListener('click', (e) => {
      if (Store.get('isEditMode')) return;
      if (e.target.closest('.music-btn')) return;
      Router.open('music');
    });

    return () => unsub();
  },
});
/* [WIDGET-TOGETHER-MUSIC END] */

/* ============================================================
   together-music.js END
   ============================================================ */
