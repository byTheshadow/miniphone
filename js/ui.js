const UI = (() => {
    // Toast
    function toast(message, duration = 2500) {
        const el = document.getElementById('toast');
        el.textContent = message;
        el.classList.remove('hidden');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.add('hidden'), duration);
    }

    // Modal
function showModal(html, titleOrCallback = '') {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    let finalHtml = html;
    let onClose = null;
    
    // 判断第二个参数是字符串（title）还是函数（callback）
    if (typeof titleOrCallback === 'string' && titleOrCallback) {
        finalHtml = `<div style="font-family:var(--font-gothic);font-size:16px;color:var(--text-primary);margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);letter-spacing:1px;">${escapeHtml(titleOrCallback)}</div>` + html;
    } else if (typeof titleOrCallback === 'function') {
        onClose = titleOrCallback;
    }
    
    content.innerHTML = finalHtml;
    overlay.classList.remove('hidden');
    overlay._onClose = onClose;

    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    if (overlay._onClose) overlay._onClose();
}


    // Render avatar (emoji or image URL)
    function renderAvatar(value, size = 40) {
        if (!value) value = '👤';
        const isUrl = value.startsWith('http') || value.startsWith('data:');
        if (isUrl) {
            return `<div class="avatar" style="width:${size}px;height:${size}px"><img src="${escapeHtml(value)}" alt="avatar" onerror="this.parentElement.innerHTML='👤'"></div>`;
        }
        return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size * 0.5}px">${escapeHtml(value)}</div>`;
    }

    // Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Time formatting
    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return 'now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';

        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function formatFullTime(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Generate ID
    function genId(prefix = 'id') {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    }

    return { toast, showModal, closeModal, renderAvatar, escapeHtml, formatTime, formatFullTime, genId };
})();
