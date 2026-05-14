/* ============================================================
   mood.js — 心情打卡小组件
   尺寸：2×1，每日打卡记录心情
   ============================================================ */

/* [WIDGET-MOOD START] 心情打卡小组件注册 */
WidgetRegistry.register({
  id:          'mood',
  name:        '心情打卡',
  emoji:       '😊',
  sizes:       ['2x1', '2x2'],
  defaultSize: '2x1',
  desc:        '每日心情记录',

  mount(container) {
    container.classList.add('widget-mood');

    /* [MOOD-DATA START] 心情数据 */
    const MOODS = [
      { emoji: '😄', label: '开心' },
      { emoji: '😊', label: '还好' },
      { emoji: '😐', label: '一般' },
      { emoji: '😔', label: '难过' },
      { emoji: '😤', label: '烦躁' },
    ];

    function getTodayKey() {
      const d = new Date();
      return `mood_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
    }

    function getStreak() {
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `mood_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
        if (Storage.lsGet(key)) streak++;
        else break;
      }
      return streak;
    }
    /* [MOOD-DATA END] */

    /* [MOOD-RENDER START] 渲染 */
    function render() {
      const todayMood = Storage.lsGet(getTodayKey());
      const streak    = getStreak();
      container.innerHTML = `
        <div class="widget-inner">
          <div class="widget-label">今日心情</div>
          <div class="mood-emoji">${todayMood?.emoji ?? '🫧'}</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;">
            <div class="mood-text">${todayMood?.label ?? '点击打卡'}</div>
            ${streak > 1
              ? `<div class="mood-streak">🔥 ${streak}天</div>`
              : ''}
          </div>
        </div>`;
    }
    /* [MOOD-RENDER END] */

    render();

    /* [MOOD-CLICK START] 点击打卡 */
    container.addEventListener('click', () => {
      if (Store.get('isEditMode')) return;
      if (typeof Modal === 'undefined') return;

      Modal.show({
        title: '今天心情如何？',
        content: `
          <div style="display:flex;justify-content:space-around;padding:8px 0 16px;">
            ${MOODS.map(m => `
              <button class="mood-pick-btn" data-emoji="${m.emoji}" data-label="${m.label}"
                style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;
                       align-items:center;gap:4px;padding:8px;border-radius:12px;
                       transition:background 0.15s;"
                onmouseover="this.style.background='var(--glass-dark-bg)'"
                onmouseout="this.style.background='none'">
                <span style="font-size:32px">${m.emoji}</span>
                <span style="font-size:11px;color:var(--text-secondary)">${m.label}</span>
              </button>`).join('')}
          </div>`,
        showConfirm: false,
        onMount: (modalEl) => {
          modalEl.querySelectorAll('.mood-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              Storage.lsSet(getTodayKey(), {
                emoji: btn.dataset.emoji,
                label: btn.dataset.label,
              });
              render();
              Modal.close();
            });
          });
        },
      });
    });
    /* [MOOD-CLICK END] */

    return () => {};
  },
});
/* [WIDGET-MOOD END] */

/* ============================================================
   mood.js END
   ============================================================ */
