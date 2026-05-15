const Receipt = (() => {

    var currentCharId = null;

    function init() {
        // nothing to init on boot
    }

    function render() {
        var container = document.getElementById('receipt-content');
        if (!container) return;

        var chars = Store.getChars().filter(function(c) {
            return c.id !== '__model__';
        });

        if (chars.length === 0) {
            container.innerHTML = '<div class="receipt-empty">'
                + '<div style="font-size:48px;margin-bottom:16px;">\uD83D\uDC8C</div>'
                + '<p style="color:var(--text-muted);font-size:13px;">No characters yet.<br>Start a conversation first.</p>'
                + '</div>';
            return;
        }

        // Default to first char if none selected
        if (!currentCharId || !Store.getChar(currentCharId)) {
            currentCharId = chars[0].id;
        }

        var selectorHtml = '<div class="receipt-char-selector">';
        chars.forEach(function(c) {
            var isActive = c.id === currentCharId;
            selectorHtml += '<button class="receipt-char-btn' + (isActive ? ' active' : '') + '" data-char-id="' + c.id + '">'
                + UI.renderAvatar(c.avatar, 28)
                + '<span>' + UI.escapeHtml(c.name) + '</span>'
                + '</button>';
        });
        selectorHtml += '</div>';

        container.innerHTML = selectorHtml
            + '<div id="receipt-card-wrap">'
            + buildReceiptHtml(currentCharId)
            + '</div>'
            + '<div class="receipt-actions">'
            + '<button class="gothic-btn full-width" id="btn-print-receipt">\uD83D\uDDC8 Save / Print</button>'
            + '</div>';

        // Bind char selector
        container.querySelectorAll('.receipt-char-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                currentCharId = btn.dataset.charId;
                render();
            });
        });

        // Bind print
        document.getElementById('btn-print-receipt').addEventListener('click', function() {
            window.print();
        });
    }

    function buildReceiptHtml(charId) {
        var char = Store.getChar(charId);
        if (!char) return '';

        // Find conversation with this char
        var convos = Store.getConversations();
        var conv = null;
        for (var i = 0; i < convos.length; i++) {
            if (convos[i].charIds
                && convos[i].charIds.length === 1
                && convos[i].charIds[0] === charId) {
                conv = convos[i];
                break;
            }
        }

        var msgs = conv ? Store.getMessages(conv.id) : [];
        var tokens = conv ? Store.getTokenUsage(conv.id) : 0;
        var settings = Store.getSettings();

        // Stats
        var userMsgs = msgs.filter(function(m) { return m.senderId === '__user__'; });
        var charMsgs = msgs.filter(function(m) { return m.senderId !== '__user__' && m.role !== 'system'; });
        var totalRounds = Math.min(userMsgs.length, charMsgs.length);
        var firstMsgTime = msgs.length > 0 ? msgs[0].timestamp : null;
        var lastMsgTime = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : null;

        // Pick a quote from char's last few messages
        var quote = '';
        var quoteMsgs = charMsgs.slice(-20).filter(function(m) {
            return m.content && m.content.length > 10 && m.content.length < 120;
        });
        if (quoteMsgs.length > 0) {
            var picked = quoteMsgs[Math.floor(Math.random() * quoteMsgs.length)];
            quote = picked.content.replace(/\n/g, ' ').trim();
            if (quote.length > 80) quote = quote.slice(0, 78) + '\u2026';
        }

        // Affection level based on rounds
        var affection = 0;
        if (totalRounds >= 200) affection = 100;
        else if (totalRounds >= 100) affection = 85;
        else if (totalRounds >= 50) affection = 70;
        else if (totalRounds >= 20) affection = 50;
        else if (totalRounds >= 10) affection = 35;
        else if (totalRounds >= 5) affection = 20;
        else if (totalRounds >= 1) affection = 10;
        var affectionBar = buildBar(affection);

        // Receipt number: last 6 chars of convId or random
        var receiptNo = conv ? conv.id.slice(-8).toUpperCase() : 'XXXXXXXX';

        // Format dates
        var dateStr = formatReceiptDate(new Date());
        var firstDateStr = firstMsgTime ? formatReceiptDate(new Date(firstMsgTime)) : '--';
        var lastDateStr = lastMsgTime ? formatReceiptDate(new Date(lastMsgTime)) : '--';

        // Username
        var userName = settings.username || 'You';

        var html = '<div class="receipt-card" id="receipt-printable">';

        // Header
        html += '<div class="receipt-header">';
        html += '<div class="receipt-logo">\u2665</div>';
        html += '<div class="receipt-title">LOVE RECEIPT</div>';
        html += '<div class="receipt-subtitle">\u6062\u7231\u5C0F\u7968</div>';
        html += '</div>';

        // Top serration
        html += '<div class="receipt-serration top"></div>';

        // Body
        html += '<div class="receipt-body">';

        // Receipt meta
        html += '<div class="receipt-meta">';
        html += '<span>NO. ' + receiptNo + '</span>';
        html += '<span>' + dateStr + '</span>';
        html += '</div>';

        html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';

        // Char info
        html += '<div class="receipt-row center">';
        html += '<div class="receipt-char-avatar">' + UI.renderAvatar(char.avatar, 48) + '</div>';
        html += '</div>';
        html += '<div class="receipt-row center">';
        html += '<div class="receipt-char-name">' + UI.escapeHtml(char.name) + '</div>';
        html += '</div>';
        html += '<div class="receipt-row center receipt-pair">';
        html += UI.escapeHtml(userName) + ' \u00D7 ' + UI.escapeHtml(char.name);
        html += '</div>';

        html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';

        // Stats table
        html += '<div class="receipt-section-label">INTERACTION LOG</div>';
        html += receiptLine('\u521D\u6B21\u76F8\u9047 FIRST MET', firstDateStr);
        html += receiptLine('\u6700\u8FD1\u8054\u7CFB LAST CHAT', lastDateStr);
        html += receiptLine('\u5BF9\u8BDD\u8F6E\u6570 ROUNDS', totalRounds.toLocaleString());
        html += receiptLine('\u4F60\u8BF4\u7684\u8BDD YOU SAID', userMsgs.length.toLocaleString() + ' msgs');
        html += receiptLine('TA\u8BF4\u7684\u8BDD TA SAID', charMsgs.length.toLocaleString() + ' msgs');

        html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';

        // Token usage
        html += '<div class="receipt-section-label">TOKEN CONSUMPTION</div>';
        html += receiptLine('TOKENS USED', tokens > 0 ? tokens.toLocaleString() : '0');
        html += receiptLine('EST. COST', tokens > 0 ? estimateCost(tokens) : '--');

        html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';

        // Affection
        html += '<div class="receipt-section-label">AFFECTION LEVEL</div>';
        html += '<div class="receipt-affection">';
        html += '<div class="receipt-affection-bar">' + affectionBar + '</div>';
        html += '<div class="receipt-affection-pct">' + affection + '%</div>';
        html += '</div>';

        html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';

        // Quote
        if (quote) {
            html += '<div class="receipt-section-label">TA\u5BF9\u4F60\u8BF4 LAST WORDS</div>';
            html += '<div class="receipt-quote">\u201C' + UI.escapeHtml(quote) + '\u201D</div>';
            html += '<div class="receipt-quote-attr">\u2014 ' + UI.escapeHtml(char.name) + '</div>';
            html += '<div class="receipt-divider">- - - - - - - - - - - - - - - -</div>';
        }

        // Footer
        html += '<div class="receipt-footer">';
        html += '<div>\u2605 MINIPHONE \u2605</div>';
        html += '<div style="margin-top:4px;font-size:9px;opacity:0.5;">Thank you for loving</div>';
        html += '<div class="receipt-barcode">';
        html += '<div class="barcode-lines"></div>';
        html += '<div class="barcode-num">' + receiptNo + '</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>'; // receipt-body

        // Bottom serration
        html += '<div class="receipt-serration bottom"></div>';

        html += '</div>'; // receipt-card

        return html;
    }

    function receiptLine(label, value) {
        return '<div class="receipt-line">'
            + '<span class="receipt-line-label">' + label + '</span>'
            + '<span class="receipt-line-value">' + UI.escapeHtml(String(value)) + '</span>'
            + '</div>';
    }

    function buildBar(pct) {
        var total = 12;
        var filled = Math.round(pct / 100 * total);
        var bar = '';
        for (var i = 0; i < total; i++) {
            bar += i < filled ? '\u2588' : '\u2591';
        }
        return bar;
    }

    function estimateCost(tokens) {
        // Rough estimate: $0.002 per 1K tokens (generic mid-tier model)
        var usd = (tokens / 1000) * 0.002;
        if (usd < 0.01) return '< $0.01';
        return '$' + usd.toFixed(3);
    }

    function formatReceiptDate(d) {
        var y = d.getFullYear();
        var mo = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        var h = String(d.getHours()).padStart(2, '0');
        var min = String(d.getMinutes()).padStart(2, '0');
        return y + '-' + mo + '-' + day + ' ' + h + ':' + min;
    }

    return { init, render };

})();
