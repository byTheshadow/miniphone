/* ============================================================
   profile-card.js — 头像+个性签名小组件
   尺寸：4×1
   ============================================================ */

/* [WIDGET-PROFILE-CARD START] 头像签名小组件注册 */
WidgetRegistry.register({
  id:          'profile-card',
  name:        '我的名片',
  emoji:       '👤',
  sizes:       ['4x1', '4x2'],
  defaultSize: '4x1',
  desc:        '头像与个性签名展示',

  mount(container) {
    container.classList.add('widget-profile');

    /* [PROFILE-RENDER START] 渲染 */
    function render() {
      const profile = Store.get('userProfile');
      container.innerHTML = `
        <div class="widget-inner">
          <div class="profile-avatar" id="wg-profile-avatar">
            ${profile.avatarUrl
              ? `<img src="${profile.avatarUrl}" alt="头像"
                      onerror="this.parentElement.textContent='${profile.avatarEmoji ?? '🌙'}'">`
              : profile.avatarEmoji ?? '🌙'}
          </div>
          <div class="profile-info">
            <div class="profile-name">${_escHtml(profile.name)}</div>
            <div class="profile-bio">${_escHtml(profile.bio)}</div>
          </div>
        </div>`;
    }
    /* [PROFILE-RENDER END] */

    render();

    // 订阅 userProfile 变化，自动重渲染
    const unsub = Store.subscribe('userProfile', render);

    // 点击编辑
    container.addEventListener('click', () => {
      if (Store.get('isEditMode')) return;
      _showProfileEditor();
    });

    return () => unsub();
  },
});

/* [PROFILE-EDITOR START] 名片编辑弹窗 */
function _showProfileEditor() {
  if (typeof Modal === 'undefined') return;
  const profile = Store.get('userProfile');
  Modal.show({
    title: '编辑名片',
    content: `
      <div class="app-input-group">
        <label class="app-input-label">昵称</label>
        <input class="app-input" id="pf-name" value="${_escHtml(profile.name)}" placeholder="你的名字" />
      </div>
      <div class="app-input-group">
        <label class="app-input-label">个性签名</label>
        <input class="app-input" id="pf-bio"  value="${_escHtml(profile.bio)}"  placeholder="一句话介绍自己" />
      </div>
      <div class="app-input-group">
        <label class="app-input-label">头像图片 URL（留空使用 Emoji）</label>
        <input class="app-input" id="pf-url"  value="${profile.avatarUrl ?? ''}" placeholder="https://..." />
      </div>
      <div class="app-input-group">
        <label class="app-input-label">头像 Emoji（无 URL 时显示）</label>
        <input class="app-input" id="pf-emoji" value="${profile.avatarEmoji ?? '🌙'}" placeholder="🌙" />
      </div>`,
    confirmText: '保存',
    onConfirm: () => {
      const name  = document.getElementById('pf-name')?.value.trim()  || profile.name;
      const bio   = document.getElementById('pf-bio')?.value.trim()   || profile.bio;
      const url   = document.getElementById('pf-url')?.value.trim()   || '';
      const emoji = document.getElementById('pf-emoji')?.value.trim() || '🌙';
      Store.set('userProfile', { name, bio, avatarUrl: url, avatarEmoji: emoji });
      Storage.lsSet('userProfile', { name, bio, avatarUrl: url, avatarEmoji: emoji });
    },
  });
}
/* [PROFILE-EDITOR END] */

/* ============================================================
   profile-card.js END
   ============================================================ */
