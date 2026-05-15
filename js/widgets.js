const Widgets = (() => {

    var clockTimer = null;

    // ── Oracle answers pool ──────────────────────────────────────
    var ORACLE_ANSWERS = [
        '\u5c31\u662f\u73b0\u5728', '\u4e0d\u8981\u62b1\u671f\u671b', '\u65f6\u673a\u672a\u5230',
        '\u5168\u529b\u4ee5\u8d74', '\u987a\u5176\u81ea\u7136', '\u4e0d\u8981\u5f3a\u6c42',
        '\u7b54\u6848\u5c31\u5728\u4f60\u5185\u5fc3', '\u518d\u7b49\u7b49', '\u6ca1\u6709\u7b54\u6848',
        '\u76f8\u4fe1\u76f4\u89c9', '\u653e\u624b\u53bb\u5427', '\u5c31\u662f\u4f60\u4e86',
        '\u4e0d\u8981\u60f3\u592a\u591a', '\u547d\u4e2d\u6ce8\u5b9a', '\u518d\u8003\u8651\u4e00\u4e0b',
        '\u6709\u4e9b\u4e8b\u60c5\u65e0\u6cd5\u5f3a\u6c42', '\u52c7\u6562\u4e00\u70b9',
        '\u4e0d\u5fc5\u6267\u7740', '\u8fd9\u4e0d\u662f\u597d\u65f6\u673a', '\u5fc3\u8bda\u5219\u7075'
    ];

    var oracleFlipped = false;
    var oracleCurrent = '';

    function init() {
        startClock();
    }

    function startClock() {
        if (clockTimer) clearInterval(clockTimer);
        clockTimer = setInterval(updateWidgetClock, 1000);
        updateWidgetClock();
    }

    function updateWidgetClock() {
        var el = document.getElementById('widget-clock-time');
        var del = document.getElementById('widget-clock-date');
        if (!el) return;
        var now = new Date();
        var h = String(now.getHours()).padStart(2, '0');
        var m = String(now.getMinutes()).padStart(2, '0');
        var s = String(now.getSeconds()).padStart(2, '0');
        el.textContent = h + ':' + m + ':' + s;
        if (del) {
            var days = ['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'];
            del.textContent = now.getFullYear() + '.' +
                String(now.getMonth() + 1).padStart(2, '0') + '.' +
                String(now.getDate()).padStart(2, '0') +
                '  \u5468' + days[now.getDay()];
        }
    }

    function calcDays(dateStr) {
        if (!dateStr) return 0;
        var start = new Date(dateStr);
        if (isNaN(start.getTime())) return 0;
        var diff = Date.now() - start.getTime();
        return Math.max(0, Math.floor(diff / 86400000));
    }

    function renderAvatar(val, size) {
        size = size || 48;
        if (!val) return '<span style="font-size:' + (size * 0.7) + 'px">\uD83D\uDC64</span>';
        var isUrl = val.startsWith('http') || val.startsWith('data:');
        if (isUrl) {
            return '<img src="' + val + '" style="width:' + size + 'px;height:' + size + 'px;'
                + 'border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\'">';
        }
        return '<span style="font-size:' + (size * 0.7) + 'px">' + val + '</span>';
    }

    // ── Render all widgets ───────────────────────────────────────

    function render() {
        var container = document.getElementById('widget-screen');
        if (!container) return;
        var cfg = Store.getWidgets();
        var html = '';

        // Clock widget
        if (cfg.clock && cfg.clock.enabled) {
            html += '<div class="widget widget-clock" id="widget-clock">'
                + '<div class="widget-clock-time" id="widget-clock-time">--:--:--</div>'
                + '<div class="widget-clock-date" id="widget-clock-date"></div>'
                + '</div>';
        }

        // Together widget
        if (cfg.together && cfg.together.enabled) {
            var t = cfg.together;
            var days = calcDays(t.startDate);
            html += '<div class="widget widget-together" id="widget-together">'
                + '<div class="widget-together-avatars">'
                + '<div class="widget-avatar-wrap">' + renderAvatar(t.avatar1, 52) + '</div>'
                + '<div class="widget-together-heart">\u2665</div>'
                + '<div class="widget-avatar-wrap">' + renderAvatar(t.avatar2, 52) + '</div>'
                + '</div>'
                + '<div class="widget-together-song">' + UI.escapeHtml(t.song || '') + '</div>'
                + '<div class="widget-together-days">'
                + '<span class="widget-days-num">' + days + '</span>'
                + '<span class="widget-days-label"> days together</span>'
                + '</div>'
                + '</div>';
        }

        // Profile widget
        if (cfg.profile && cfg.profile.enabled) {
            var p = cfg.profile;
            html += '<div class="widget widget-profile" id="widget-profile">'
                + '<div class="widget-profile-avatar">' + renderAvatar(p.avatar, 64) + '</div>'
                + '<div class="widget-profile-bio">' + UI.escapeHtml(p.bio || '') + '</div>'
                + '</div>';
        }

        // Oracle widget
        if (cfg.oracle && cfg.oracle.enabled) {
            html += '<div class="widget widget-oracle" id="widget-oracle">'
                + '<div class="widget-oracle-inner" id="oracle-inner">'
                + '<div class="oracle-front">'
                + '<div class="oracle-icon">\uD83D\uDD2E</div>'
                + '<div class="oracle-hint">tap for answer</div>'
                + '</div>'
                + '<div class="oracle-back" id="oracle-back"></div>'
                + '</div>'
                + '</div>';
        }

        // Edit button
        html += '<button class="widget-edit-btn" id="btn-edit-widgets">\u270E \u7f16\u8f91\u5c0f\u7ec4\u4ef6</button>';

        container.innerHTML = html;

        // Bind oracle
        var oracleEl = document.getElementById('widget-oracle');
        if (oracleEl) {
            oracleEl.addEventListener('click', function() {
                var inner = document.getElementById('oracle-inner');
                var back = document.getElementById('oracle-back');
                if (!inner || !back) return;
                if (!oracleFlipped) {
                    oracleCurrent = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
                    back.textContent = oracleCurrent;
                    inner.classList.add('flipped');
                    oracleFlipped = true;
                } else {
                    inner.classList.remove('flipped');
                    oracleFlipped = false;
                }
            });
        }

        // Bind edit button
        var editBtn = document.getElementById('btn-edit-widgets');
        if (editBtn) {
            editBtn.addEventListener('click', showEditModal);
        }

        // Restart clock
        startClock();
    }

    // ── Edit Modal ───────────────────────────────────────────────

    function showEditModal() {
        var cfg = Store.getWidgets();
        var t = cfg.together || {};
        var p = cfg.profile || {};

        var html = '<h3>\u270E \u5c0f\u7ec4\u4ef6\u8bbe\u7f6e</h3>'

            // Clock toggle
            + '<div class="setting-item">'
            + '<label>\uD83D\uDD52 \u65f6\u949f</label>'
            + '<label class="toggle-wrap">'
            + '<input type="checkbox" id="wg-clock-on"' + (cfg.clock && cfg.clock.enabled ? ' checked' : '') + '>'
            + '<span class="toggle-label">enabled</span></label>'
            + '</div>'

            // Together toggles + fields
            + '<div class="setting-item">'
            + '<label>\uD83C\uDFB5 \u4e00\u8d77\u542c\u6b4c</label>'
            + '<label class="toggle-wrap">'
            + '<input type="checkbox" id="wg-together-on"' + (t.enabled ? ' checked' : '') + '>'
            + '<span class="toggle-label">enabled</span></label>'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>Avatar 1 (emoji or URL)</label>'
            + '<input type="text" id="wg-av1" value="' + UI.escapeHtml(t.avatar1 || '') + '">'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>Avatar 2 (emoji or URL)</label>'
            + '<input type="text" id="wg-av2" value="' + UI.escapeHtml(t.avatar2 || '') + '">'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>\u6b4c\u540d / \u6807\u9898</label>'
            + '<input type="text" id="wg-song" value="' + UI.escapeHtml(t.song || '') + '" placeholder="\u2665 Our Song">'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>\u5728\u4e00\u8d77\u7684\u65e5\u671f</label>'
            + '<input type="date" id="wg-date" value="' + UI.escapeHtml(t.startDate || '') + '">'
            + '</div>'

            // Profile toggles + fields
            + '<div class="setting-item">'
            + '<label>\uD83D\uDC64 \u4e2a\u4eba\u5361\u7247</label>'
            + '<label class="toggle-wrap">'
            + '<input type="checkbox" id="wg-profile-on"' + (p.enabled ? ' checked' : '') + '>'
            + '<span class="toggle-label">enabled</span></label>'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>Avatar (emoji or URL)</label>'
            + '<input type="text" id="wg-pavatar" value="' + UI.escapeHtml(p.avatar || '') + '">'
            + '</div>'
            + '<div class="setting-item">'
            + '<label>\u4e2a\u6027\u7b7e\u540d</label>'
            + '<input type="text" id="wg-bio" value="' + UI.escapeHtml(p.bio || '') + '" placeholder="Whispers in the dark...">'
            + '</div>'

            // Oracle toggle
            + '<div class="setting-item">'
            + '<label>\uD83D\uDD2E \u7b54\u6848\u4e4b\u4e66</label>'
            + '<label class="toggle-wrap">'
            + '<input type="checkbox" id="wg-oracle-on"' + (cfg.oracle && cfg.oracle.enabled ? ' checked' : '') + '>'
            + '<span class="toggle-label">enabled</span></label>'
            + '</div>'

            + '<div class="modal-btns">'
            + '<button class="gothic-btn" onclick="UI.closeModal()">Cancel</button>'
            + '<button class="gothic-btn primary" id="btn-save-widgets">Save</button>'
            + '</div>';

        UI.showModal(html);

        setTimeout(function() {
            var saveBtn = document.getElementById('btn-save-widgets');
            if (!saveBtn) return;
            saveBtn.addEventListener('click', function() {
                var newCfg = {
                    clock: {
                        enabled: document.getElementById('wg-clock-on').checked
                    },
                    together: {
                        enabled: document.getElementById('wg-together-on').checked,
                        avatar1:   document.getElementById('wg-av1').value.trim() || '\uD83D\uDE08',
                        avatar2:   document.getElementById('wg-av2').value.trim() || '\uD83E\uDD16',
                        song:      document.getElementById('wg-song').value.trim(),
                        startDate: document.getElementById('wg-date').value
                    },
                    profile: {
                        enabled: document.getElementById('wg-profile-on').checked,
                        avatar:  document.getElementById('wg-pavatar').value.trim() || '\uD83D\uDE08',
                        bio:     document.getElementById('wg-bio').value.trim()
                    },
                    oracle: {
                        enabled: document.getElementById('wg-oracle-on').checked
                    }
                };
                Store.saveWidgets(newCfg);
                UI.closeModal();
                UI.toast('\u5c0f\u7ec4\u4ef6\u5df2\u4fdd\u5b58 \u2726');
                render();
            });
        }, 50);
    }

    return { init, render };

})();
