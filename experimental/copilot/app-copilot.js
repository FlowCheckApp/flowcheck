// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK AI COPILOT — Client Module
//  Drop in: add <script src="/js/app-copilot.js"></script>
//  Requires: app-auth.js loaded first
//  Renders into: #copilot-feed (add this div to your dashboard page)
// ═══════════════════════════════════════════════════════════════

var FC_COPILOT = {
  CACHE_TTL_MS: 4 * 60 * 60 * 1000, // 4 hours
  CACHE_KEY: 'fc-copilot-cache',
  _loading: false
};

// ── Build snapshot from existing FC state ──
function buildCopilotSnapshot() {
  var snap = {};

  // User info
  try {
    var fbUser = getFbUser ? getFbUser() : null;
    snap.name = (fbUser && (fbUser.name || fbUser.email)) || 'there';
    snap.isPremium = typeof isPremium !== 'undefined' ? isPremium() : false;
  } catch (e) {}

  // Budgets
  try {
    if (typeof budgets !== 'undefined' && Array.isArray(budgets)) {
      snap.budgets = budgets.map(function(b) {
        return { cat: b.cat || b.name, limit: b.lim || b.limit || 0, spent: b.spent || 0 };
      });
    }
  } catch (e) {}

  // Debts
  try {
    if (typeof debts !== 'undefined' && Array.isArray(debts)) {
      snap.debts = debts.map(function(d) {
        return { name: d.name, bal: d.bal || 0, apr: d.apr || 0, min: d.min || 0, dueDate: d.dueDate || null };
      });
    }
  } catch (e) {}

  // Bills
  try {
    if (typeof bills !== 'undefined' && Array.isArray(bills)) {
      snap.bills = bills.map(function(b) {
        return { name: b.name, amt: b.amt || 0, dueDay: b.dueDay || null };
      });
    }
  } catch (e) {}

  // Savings goals
  try {
    if (typeof savings !== 'undefined' && Array.isArray(savings)) {
      snap.savings = savings.map(function(g) {
        return { name: g.name, saved: g.saved || g.current || 0, target: g.goal || g.target || 0 };
      });
    }
  } catch (e) {}

  // Recent transactions (last 30)
  try {
    if (typeof logList !== 'undefined' && Array.isArray(logList)) {
      snap.transactions = logList.slice(0, 30).map(function(tx) {
        return { amt: tx.amt || 0, cat: tx.cat || 'Other', isCredit: !!tx.isCredit, date: tx.date || '' };
      });
    }
  } catch (e) {}

  // Net worth
  try {
    if (typeof calcNetWorth === 'function') snap.netWorth = calcNetWorth();
    else if (typeof netWorth !== 'undefined') snap.netWorth = netWorth;
  } catch (e) {}

  // Plaid accounts with balances
  try {
    if (typeof plaidLinkedAccounts !== 'undefined' && Array.isArray(plaidLinkedAccounts)) {
      var accts = [];
      plaidLinkedAccounts.forEach(function(item) {
        (item.accounts || []).forEach(function(a) {
          accts.push({ name: a.name || 'Account', type: a.type || 'depository', balance: a.balance || 0 });
        });
      });
      snap.accounts = accts;
    }
  } catch (e) {}

  return snap;
}

// ── Check cache ──
function getCachedCopilot() {
  try {
    var cached = JSON.parse(localStorage.getItem(FC_COPILOT.CACHE_KEY) || 'null');
    if (!cached || !cached.generatedAt) return null;
    var age = Date.now() - new Date(cached.generatedAt).getTime();
    if (age > FC_COPILOT.CACHE_TTL_MS) return null;
    return cached;
  } catch (e) {
    return null;
  }
}

function setCopilotCache(data) {
  try {
    localStorage.setItem(FC_COPILOT.CACHE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function clearCopilotCache() {
  try { localStorage.removeItem(FC_COPILOT.CACHE_KEY); } catch (e) {}
}

// ── Fetch from API ──
function fetchCopilotCards(force) {
  if (FC_COPILOT._loading) return;

  // Use cache unless forced
  if (!force) {
    var cached = getCachedCopilot();
    if (cached) {
      renderCopilotFeed(cached.cards, cached.generatedAt, false, cached.isPremium);
      return;
    }
  }

  FC_COPILOT._loading = true;
  renderCopilotLoading();

  var snapshot = buildCopilotSnapshot();

  authFetchWithBackendFallback('/api/copilot', {
    method: 'POST',
    body: JSON.stringify(snapshot)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    FC_COPILOT._loading = false;
    if (!data.cards || !data.cards.length) {
      renderCopilotEmpty();
      return;
    }
    setCopilotCache(data);
    renderCopilotFeed(data.cards, data.generatedAt, true, data.isPremium);
  })
  .catch(function(err) {
    FC_COPILOT._loading = false;
    console.warn('[Copilot] Fetch error:', err && err.message ? err.message : err);
    // Try cache as fallback
    var stale = getCachedCopilot();
    if (stale) {
      renderCopilotFeed(stale.cards, stale.generatedAt, false, stale.isPremium);
    } else {
      renderCopilotError();
    }
  });
}

// ── Dismiss a card ──
function dismissCopilotCard(cardId) {
  try {
    var cached = getCachedCopilot();
    if (cached && cached.cards) {
      cached.cards = cached.cards.filter(function(c) { return c.id !== cardId; });
      setCopilotCache(cached);
    }
  } catch (e) {}
  var el = document.getElementById('copilot-card-' + cardId);
  if (el) {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(18px)';
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
      checkCopilotEmpty();
    }, 260);
  }
  if (typeof haptic === 'function') haptic('light');
}

function checkCopilotEmpty() {
  var feed = document.getElementById('copilot-feed-inner');
  if (feed && !feed.querySelector('.copilot-card')) {
    renderCopilotEmpty();
  }
}

// ── Card color config ──
var COPILOT_URGENCY = {
  red:   { bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.2)',  dot: '#f87171', icon: 'rgba(248,113,113,.15)' },
  green: { bg: 'rgba(74,222,128,.07)',  border: 'rgba(74,222,128,.18)', dot: '#4ade80', icon: 'rgba(74,222,128,.12)' },
  blue:  { bg: 'rgba(96,165,250,.07)',  border: 'rgba(96,165,250,.18)', dot: '#60a5fa', icon: 'rgba(96,165,250,.12)' },
  amber: { bg: 'rgba(245,166,35,.07)',  border: 'rgba(245,166,35,.18)', dot: '#F5A623', icon: 'rgba(245,166,35,.12)' },
  gold:  { bg: 'rgba(250,204,21,.07)',  border: 'rgba(250,204,21,.18)', dot: '#facc15', icon: 'rgba(250,204,21,.12)' }
};

// ── Render a single card ──
function renderCopilotCard(card) {
  var urg = COPILOT_URGENCY[card.urgency] || COPILOT_URGENCY.blue;
  var actionBtn = '';
  if (card.actionType !== 'none' && card.action) {
    var actionJs = card.actionType === 'navigate' && card.actionTarget
      ? "go('" + card.actionTarget + "');dismissCopilotCard('" + card.id + "')"
      : "dismissCopilotCard('" + card.id + "')";
    actionBtn = '<button onclick="' + actionJs + '" style="' +
      'margin-top:11px;background:' + urg.border + ';border:none;border-radius:999px;' +
      'padding:7px 14px;font-family:inherit;font-size:12px;font-weight:700;' +
      'color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent' +
      '">' + escCopilot(card.action) + '</button>';
  }

  return '<div id="copilot-card-' + card.id + '" class="copilot-card" style="' +
    'background:' + urg.bg + ';' +
    'border:1px solid ' + urg.border + ';' +
    'border-radius:18px;padding:16px;margin-bottom:10px;' +
    'animation:cpIn .3s ease forwards' +
  '">' +
    '<div style="display:flex;align-items:flex-start;gap:12px">' +
      '<div style="width:38px;height:38px;border-radius:12px;background:' + urg.icon + ';' +
        'display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:17px">' +
        (card.icon || '💡') +
      '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">' +
          '<div style="width:7px;height:7px;border-radius:50%;background:' + urg.dot + ';flex-shrink:0"></div>' +
          '<div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:-.2px;line-height:1.25">' +
            escCopilot(card.headline) +
          '</div>' +
        '</div>' +
        '<div style="font-size:12.5px;line-height:1.55;color:rgba(255,255,255,.55)">' +
          escCopilot(card.body) +
        '</div>' +
        actionBtn +
      '</div>' +
      '<button onclick="dismissCopilotCard(\'' + card.id + '\')" style="' +
        'background:none;border:none;color:rgba(255,255,255,.25);font-size:16px;cursor:pointer;' +
        'padding:0;line-height:1;flex-shrink:0;margin-left:4px;-webkit-tap-highlight-color:transparent' +
      '">×</button>' +
    '</div>' +
  '</div>';
}

function escCopilot(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Render states ──
function renderCopilotLoading() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.innerHTML =
    '<div id="copilot-feed-inner">' +
      [1,2,3].map(function() {
        return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);' +
          'border-radius:18px;padding:16px;margin-bottom:10px;animation:cpShimmer 1.4s ease infinite">' +
          '<div style="display:flex;gap:12px;align-items:center">' +
            '<div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.06)"></div>' +
            '<div style="flex:1">' +
              '<div style="height:13px;background:rgba(255,255,255,.06);border-radius:6px;margin-bottom:8px;width:60%"></div>' +
              '<div style="height:11px;background:rgba(255,255,255,.04);border-radius:5px;width:85%"></div>' +
            '</div>' +
          '</div>' +
          '</div>';
      }).join('') +
    '</div>';
}

function renderCopilotError() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.innerHTML =
    '<div id="copilot-feed-inner">' +
      '<div style="padding:24px 16px;text-align:center;border:1px solid rgba(255,255,255,.06);border-radius:18px">' +
        '<div style="font-size:24px;margin-bottom:10px">⚡</div>' +
        '<div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:6px">Couldn\'t load your briefing</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.3);margin-bottom:14px">Check your connection and try again</div>' +
        '<button onclick="clearCopilotCache();fetchCopilotCards(true)" style="' +
          'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:999px;' +
          'padding:8px 18px;font-family:inherit;font-size:12.5px;font-weight:700;color:rgba(255,255,255,.7);cursor:pointer' +
        '">Retry</button>' +
      '</div>' +
    '</div>';
}

function renderCopilotEmpty() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.innerHTML =
    '<div id="copilot-feed-inner">' +
      '<div style="padding:28px 16px;text-align:center;border:1px solid rgba(74,222,128,.12);' +
        'background:rgba(74,222,128,.04);border-radius:18px">' +
        '<div style="font-size:28px;margin-bottom:10px">✅</div>' +
        '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:5px">You\'re all caught up</div>' +
        '<div style="font-size:12.5px;color:rgba(255,255,255,.4)">No urgent actions right now. Check back tomorrow.</div>' +
      '</div>' +
    '</div>';
}

function renderCopilotFeed(cards, generatedAt, fresh, isPremiumUser) {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;

  var timeAgo = '';
  if (generatedAt) {
    var mins = Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000);
    timeAgo = mins < 2 ? 'Just now' : mins < 60 ? mins + 'm ago' : Math.round(mins / 60) + 'h ago';
  }

  var upsell = !isPremiumUser
    ? '<div style="margin-top:12px;padding:14px 16px;' +
        'background:linear-gradient(135deg,rgba(var(--acc-rgb,6,182,212),.08),rgba(255,255,255,.02));' +
        'border:1px solid rgba(var(--acc-rgb,6,182,212),.15);border-radius:16px;' +
        'display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:20px">✨</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:3px">See your full briefing</div>' +
          '<div style="font-size:11.5px;color:rgba(255,255,255,.45)">' + (cards.length > 0 ? (cards.length + 1) : 'More') + ' more insights with FlowCheck Premium</div>' +
        '</div>' +
        '<button onclick="openPaywall && openPaywall()" style="' +
          'background:var(--acc,#06b6d4);border:none;border-radius:999px;' +
          'padding:8px 16px;font-family:inherit;font-size:12px;font-weight:800;color:#000;cursor:pointer' +
        '">Unlock</button>' +
      '</div>'
    : '';

  feed.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<div>' +
        '<div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px">Your Daily Briefing</div>' +
        (timeAgo ? '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:2px">' + timeAgo + '</div>' : '') +
      '</div>' +
      '<button onclick="clearCopilotCache();fetchCopilotCards(true)" style="' +
        'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;' +
        'padding:6px 13px;font-family:inherit;font-size:11.5px;font-weight:700;color:rgba(255,255,255,.5);' +
        'cursor:pointer;-webkit-tap-highlight-color:transparent' +
      '">↻ Refresh</button>' +
    '</div>' +
    '<div id="copilot-feed-inner">' +
      cards.map(renderCopilotCard).join('') +
      upsell +
    '</div>';
}

// ── Inject CSS animations ──
(function injectCopilotStyles() {
  if (document.getElementById('copilot-styles')) return;
  var s = document.createElement('style');
  s.id = 'copilot-styles';
  s.textContent =
    '@keyframes cpIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}' +
    '@keyframes cpShimmer{0%,100%{opacity:.6}50%{opacity:1}}';
  document.head.appendChild(s);
})();

// ── Auto-init when DOM ready ──
function initCopilot() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  // Only load if user is signed in
  var fbUser = typeof getFbUser === 'function' ? getFbUser() : null;
  if (!fbUser) return;
  fetchCopilotCards(false);
}

// Init on DOMContentLoaded or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initCopilot, 800); // slight delay so FC state is ready
  });
} else {
  setTimeout(initCopilot, 800);
}

console.log('FlowCheck AI Copilot ready');
