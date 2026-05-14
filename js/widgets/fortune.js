/* ============================================================
   fortune.js — 今日运势小组件
   尺寸：2×1，每日刷新一次运势
   ============================================================ */

/* [WIDGET-FORTUNE START] 今日运势小组件注册 */
WidgetRegistry.register({
  id:          'fortune',
  name:        '今日运势',
  emoji:       '🔮',
  sizes:       ['2x1', '2x2'],
  defaultSize: '2x1',
  desc:        '每日运势签文',

  mount(container) {
    container.classList.add('widget-fortune');

    /* [FORTUNE-DATA START] 运势数据库 */
    const FORTUNES = [
      { stars: 5, text: '诸事顺遂，贵人相助，把握良机。' },
      { stars: 5, text: '财运亨通，心想事成，大吉大利。' },
      { stars: 4, text: '运势平稳，稳中有升，保持耐心。' },
      { stars: 4, text: '感情顺利，友情加深，好事将近。' },
      { stars: 3, text: '平淡是福，守成为上，勿急勿躁。' },
      { stars: 3, text: '小有波折，处变不惊，终将化解。' },
      { stars: 2, text: '宜静不宜动，低调行事为佳。' },
      { stars: 2, text: '注意细节，谨慎决策，避免冲动。' },
      { stars: 1, text: '今日多加小心，凡事三思而后行。' },
    ];

    function getTodayFortune() {
      const today = new Date();
      const key   = `fortune_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;
      const saved = Storage.lsGet(key);
      if (saved) return saved;
      // 用日期做种子，保证同一天结果一致
      const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const idx   = seed % FORTUNES.length;
      const f     = FORTUNES[idx];
      Storage.lsSet(key, f);
      return f;
    }
    /* [FORTUNE-DATA END] */

    /* [FORTUNE-RENDER START] 渲染 */
    const fortune = getTodayFortune();
    const starsHtml = '★'.repeat(fortune.stars) + '☆'.repeat(5 - fortune.stars);

    container.innerHTML = `
      <div class="widget-inner">
        <div class="widget-label">今日运势</div>
        <div class="fortune-stars">${starsHtml}</div>
        <div class="fortune-text">${fortune.text}</div>
      </div>`;
    /* [FORTUNE-RENDER END] */

    return () => {};
  },
});
/* [WIDGET-FORTUNE END] */

/* ============================================================
   fortune.js END
   ============================================================ */
