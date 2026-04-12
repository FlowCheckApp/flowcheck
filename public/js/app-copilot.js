var FC_COPILOT = {
  CACHE_TTL_MS: 4 * 60 * 60 * 1000,
  CACHE_KEY: 'fc-copilot-cache',
  _loading: false,
  _retryTimer: null,
  _retryCount: 0,
};

function copilotBackendOrigin() {
  try {
    if (typeof FC_PLAID !== 'undefined' && FC_PLAID && FC_PLAID.BACKEND_URL) return FC_PLAID.BACKEND_URL;
  } catch (e) {}
  return 'https://getflowcheck.app';
}

function buildCopilotSnapshot() {
  var snap = {};
  try {
    var fbUser = (typeof getFbUser === 'function') ? getFbUser() : null;
    snap.name = (fbUser && (fbUser.name || fbUser.email)) || 'there';
  } catch (e) {}
  snap.isPremium = !!(typeof isPremium !== 'undefined' && isPremium);

  try {
    if (typeof budgetS !== 'undefined' && Array.isArray(budgetS)) {
      snap.budgets = budgetS.map(function(b) {
        return { cat: b.cat || b.name, limit: b.lim || b.limit || 0, spent: b.spent || 0 };
      });
    }
  } catch (e) {}

  try {
    if (typeof debts !== 'undefined' && Array.isArray(debts)) {
      snap.debts = debts.map(function(d) {
        return { name: d.name, bal: d.bal || 0, apr: d.apr || 0, min: d.min || 0, dueDate: d.dueDate || null };
      });
    }
  } catch (e) {}

  try {
    if (typeof bills !== 'undefined' && Array.isArray(bills)) {
      snap.bills = bills.map(function(b) {
        return { name: b.name, amt: b.amt || 0, dueDay: b.dueDay || null };
      });
    }
  } catch (e) {}

  try {
    if (typeof savGoals !== 'undefined' && Array.isArray(savGoals)) {
      snap.savings = savGoals.map(function(g) {
        return { name: g.name, saved: g.saved || 0, target: g.target || 0 };
      });
    }
  } catch (e) {}

  try {
    if (typeof logList !== 'undefined' && Array.isArray(logList)) {
      snap.transactions = logList.slice(0, 30).map(function(tx) {
        return { amt: tx.amt || 0, cat: tx.cat || 'Other', date: tx.date || '' };
      });
    }
  } catch (e) {}

  try {
    var assets = (typeof nwItems !== 'undefined' && nwItems && Array.isArray(nwItems.a)) ? nwItems.a.reduce(function(s, x){ return s + (x.a || 0); }, 0) : 0;
    var debtTotal = (typeof debts !== 'undefined' && Array.isArray(debts)) ? debts.reduce(function(s, d){ return s + (d.bal || 0); }, 0) : 0;
    snap.netWorth = assets - debtTotal;
  } catch (e) {}

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
  try { localStorage.setItem(FC_COPILOT.CACHE_KEY, JSON.stringify(data)); } catch (e) {}
}

function clearCopilotCache() {
  try { localStorage.removeItem(FC_COPILOT.CACHE_KEY); } catch (e) {}
}

function getCopilotUser() {
  try {
    return (typeof getFbUser === 'function') ? getFbUser() : null;
  } catch (e) {
    return null;
  }
}

function isCopilotLockVisible() {
  try {
    var lock = document.getElementById('fc-lock-screen');
    return !!(lock && lock.style.display !== 'none');
  } catch (e) {
    return false;
  }
}

function hasCopilotAuthSignal(user) {
  user = user || getCopilotUser();
  if (!user || !user.uid) return false;
  if (user.idToken && String(user.idToken).trim()) return true;
  if (user.refreshToken && String(user.refreshToken).trim()) return true;
  return false;
}

function scheduleCopilotRetry(reason) {
  if (!document.getElementById('copilot-feed')) return;
  if (FC_COPILOT._loading) return;
  if (FC_COPILOT._retryTimer) return;
  FC_COPILOT._retryCount = Math.min((FC_COPILOT._retryCount || 0) + 1, 6);
  var delay = Math.min(1200 * FC_COPILOT._retryCount, 6000);
  FC_COPILOT._retryTimer = setTimeout(function() {
    FC_COPILOT._retryTimer = null;
    fetchCopilotCards(false);
  }, delay);
  if (reason && FC_COPILOT._retryCount < 3) {
    try { console.log('[copilot] waiting:', reason); } catch (e) {}
  }
}

function resetCopilotRetryState() {
  FC_COPILOT._retryCount = 0;
  if (FC_COPILOT._retryTimer) {
    clearTimeout(FC_COPILOT._retryTimer);
    FC_COPILOT._retryTimer = null;
  }
}

function escCopilot(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCopilotLoading() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.style.display = 'block';
  feed.innerHTML = '<div style="background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid rgba(var(--acc-rgb,6,182,212),.14);border-radius:18px;padding:14px 15px;box-shadow:0 10px 30px rgba(0,0,0,.16)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
      '<div><div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-.2px">Decision Brief</div><div style="font-size:11.5px;color:rgba(255,255,255,.42);margin-top:3px">Loading your latest signal…</div></div>' +
      '<div style="width:10px;height:10px;border-radius:999px;background:var(--acc);box-shadow:0 0 0 6px rgba(var(--acc-rgb,6,182,212),.12)"></div>' +
    '</div>' +
  '</div>';
}

function renderCopilotError() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.style.display = 'block';
  feed.innerHTML = '<div style="background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px 15px">' +
    '<div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px">Decision Brief unavailable</div>' +
    '<div style="font-size:11.5px;color:rgba(255,255,255,.45);margin-bottom:12px">Check your connection and try again.</div>' +
    '<button onclick="clearCopilotCache();fetchCopilotCards(true)" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 14px;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer">Retry</button>' +
    '</div>';
}

function renderCopilotEmpty() {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.style.display = 'block';
  feed.innerHTML = '<div style="background:linear-gradient(180deg,rgba(255,255,255,.042),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px 15px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
      '<div><div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-.2px">Decision Brief</div><div style="font-size:11.5px;color:rgba(255,255,255,.42);margin-top:3px">No urgent money moves right now.</div></div>' +
      '<div style="font-size:11px;font-weight:800;color:#4ade80;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.18);padding:6px 9px;border-radius:999px">Calm</div>' +
    '</div>' +
  '</div>';
}

function renderCopilotAwaitingAuth(message) {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.style.display = 'block';
  feed.innerHTML = '<div style="background:linear-gradient(180deg,rgba(var(--acc-rgb,6,182,212),.08),rgba(255,255,255,.02));border:1px solid rgba(var(--acc-rgb,6,182,212),.16);border-radius:18px;padding:14px 15px;box-shadow:0 10px 30px rgba(0,0,0,.16)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
      '<div><div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-.2px">Decision Brief</div><div style="font-size:11.5px;color:rgba(255,255,255,.5);margin-top:3px">' + escCopilot(message || 'Secure sign-in finishes your briefing.') + '</div></div>' +
      '<div style="font-size:11px;font-weight:800;color:var(--acc);background:rgba(var(--acc-rgb,6,182,212),.12);border:1px solid rgba(var(--acc-rgb,6,182,212),.18);padding:6px 9px;border-radius:999px">Secure</div>' +
    '</div>' +
  '</div>';
}

var COPILOT_URGENCY = {
  red:   { bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.2)', dot: '#f87171' },
  green: { bg: 'rgba(74,222,128,.07)', border: 'rgba(74,222,128,.18)', dot: '#4ade80' },
  blue:  { bg: 'rgba(96,165,250,.07)', border: 'rgba(96,165,250,.18)', dot: '#60a5fa' },
  amber: { bg: 'rgba(245,166,35,.07)', border: 'rgba(245,166,35,.18)', dot: '#F5A623' },
  gold:  { bg: 'rgba(250,204,21,.07)', border: 'rgba(250,204,21,.18)', dot: '#facc15' }
};

function renderCopilotCard(card) {
  var urg = COPILOT_URGENCY[card.urgency] || COPILOT_URGENCY.blue;
  var action = '';
  if (card.actionType === 'navigate' && card.action && card.actionTarget) {
    action = '<button onclick="go(\'' + escCopilot(card.actionTarget) + '\')" style="margin-top:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 14px;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' + escCopilot(card.action) + '</button>';
  }
  return '<div style="background:' + urg.bg + ';border:1px solid ' + urg.border + ';border-radius:18px;padding:16px;margin-bottom:10px">' +
    '<div style="display:flex;align-items:flex-start;gap:12px">' +
      '<div style="width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0">' + escCopilot(card.icon || '●') + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px"><div style="width:7px;height:7px;border-radius:50%;background:' + urg.dot + ';flex-shrink:0"></div><div style="font-size:14px;font-weight:800;color:#fff;line-height:1.25">' + escCopilot(card.headline) + '</div></div>' +
        '<div style="font-size:12.5px;line-height:1.55;color:rgba(255,255,255,.55)">' + escCopilot(card.body) + '</div>' +
        action +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderCopilotFeed(cards, generatedAt, isPremiumUser) {
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  feed.style.display = 'block';
  var visibleCards = (cards || []).slice(0, 1);
  var mins = generatedAt ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000) : 0;
  var timeAgo = !generatedAt ? '' : (mins < 2 ? 'Just now' : mins < 60 ? (mins + 'm ago') : (Math.round(mins / 60) + 'h ago'));
  var upsell = !isPremiumUser
    ? '<div style="margin-top:12px;padding:14px 16px;background:linear-gradient(135deg,rgba(var(--acc-rgb,6,182,212),.08),rgba(255,255,255,.02));border:1px solid rgba(var(--acc-rgb,6,182,212),.15);border-radius:16px;display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:18px">✨</div>' +
        '<div style="flex:1"><div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:3px">See your full briefing</div><div style="font-size:11.5px;color:rgba(255,255,255,.45)">Unlock more decision cards with FlowCheck Premium.</div></div>' +
        '<button onclick="openPaywall && openPaywall()" style="background:var(--acc);border:none;border-radius:999px;padding:8px 14px;color:#000;font:inherit;font-size:12px;font-weight:800;cursor:pointer">Unlock</button>' +
      '</div>'
    : '';
  feed.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '<div><div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px">Decision Briefing</div>' +
      (timeAgo ? '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:2px">' + timeAgo + '</div>' : '') + '</div>' +
      '<button onclick="clearCopilotCache();fetchCopilotCards(true)" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 13px;color:rgba(255,255,255,.6);font:inherit;font-size:11.5px;font-weight:700;cursor:pointer">↻ Refresh</button>' +
    '</div>' +
    visibleCards.map(renderCopilotCard).join('') +
    (cards.length > visibleCards.length ? '<div style="font-size:11px;color:rgba(255,255,255,.32);margin-top:-2px;margin-bottom:8px">Showing the clearest next move from ' + escCopilot(cards.length) + ' live signals.</div>' : '') +
    upsell;
}

function fetchCopilotCards(force) {
  if (FC_COPILOT._loading) return;
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;
  var fbUser = getCopilotUser();
  if (!fbUser) { feed.innerHTML = ''; resetCopilotRetryState(); return; }
  if (isCopilotLockVisible()) {
    renderCopilotAwaitingAuth('Unlock FlowCheck to load your secure briefing.');
    scheduleCopilotRetry('app is still locked');
    return;
  }
  if (!hasCopilotAuthSignal(fbUser)) {
    renderCopilotAwaitingAuth('Secure sign-in finishes your live briefing.');
    scheduleCopilotRetry('auth token not ready');
    return;
  }

  if (!force) {
    var cached = getCachedCopilot();
    if (cached) {
      resetCopilotRetryState();
      renderCopilotFeed(cached.cards || [], cached.generatedAt, !!cached.isPremium);
      return;
    }
  }

  FC_COPILOT._loading = true;
  resetCopilotRetryState();
  renderCopilotLoading();

  authFetchWithBackendFallback('/api/copilot', {
    method: 'POST',
    body: JSON.stringify(buildCopilotSnapshot())
  }, copilotBackendOrigin())
  .then(function(r) { return r.json(); })
  .then(function(data) {
    FC_COPILOT._loading = false;
    resetCopilotRetryState();
    if (!data || !Array.isArray(data.cards) || !data.cards.length) {
      renderCopilotEmpty();
      return;
    }
    setCopilotCache(data);
    renderCopilotFeed(data.cards, data.generatedAt, !!data.isPremium);
  })
  .catch(function(err) {
    FC_COPILOT._loading = false;
    if (err && err.status === 401) {
      scheduleCopilotRetry('waiting for authorized session');
      var cached = getCachedCopilot();
      if (cached) renderCopilotFeed(cached.cards || [], cached.generatedAt, !!cached.isPremium);
      return;
    }
    console.warn('[copilot] fetch failed:', err && err.message ? err.message : err);
    var cached = getCachedCopilot();
    if (cached) renderCopilotFeed(cached.cards || [], cached.generatedAt, !!cached.isPremium);
    else renderCopilotError();
  });
}

function refreshCopilotFeed(force) {
  fetchCopilotCards(!!force);
}

function initCopilot() {
  if (!document.getElementById('copilot-feed')) return;
  fetchCopilotCards(false);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(initCopilot, 900); });
} else {
  setTimeout(initCopilot, 900);
}
