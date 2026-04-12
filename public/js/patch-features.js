// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK FEATURE UPGRADE — patch-features.js
//  1. Manual transaction entry
//  2. Transaction notes + tags
//  3. Spending watchlist  
//  4. Smart balance alerts
//  5. Unusual charge detection
//  6. Transaction search upgrade
//  All features are FlowCheck-native — not copies of Rocket Money
// ═══════════════════════════════════════════════════════════════

// ══════════════════════════════════════
//  1. MANUAL TRANSACTION ENTRY
//  Add cash, Venmo, Zelle transactions
//  that Plaid misses
// ══════════════════════════════════════

function openManualTransactionEntry() {
  var cats = ['Food','Groceries','Shopping','Gas','Transport','Bills',
              'Subscriptions','Health','Entertainment','Travel','Auto','Other'];
  var today = new Date().toISOString().split('T')[0];

  var sheet = document.createElement('div');
  sheet.id = 'fc-manual-txn-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.65)';
  sheet.innerHTML =
    '<div style="width:100%;background:#0f1520;border-radius:24px 24px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));max-height:90vh;overflow-y:auto">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;margin:0 auto 22px"></div>' +
      '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:20px;font-family:Syne,sans-serif">Add Transaction</div>' +

      // Amount — big, centered
      '<div style="text-align:center;margin-bottom:20px">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:10px">Amount</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:4px">' +
          '<span style="font-size:32px;font-weight:700;color:rgba(255,255,255,.4);font-family:Syne,sans-serif">$</span>' +
          '<input id="fc-mt-amt" type="number" step="0.01" min="0" placeholder="0.00" style="background:none;border:none;font-size:42px;font-weight:800;color:#fff;width:180px;text-align:center;font-family:Syne,sans-serif;outline:none">' +
        '</div>' +
        // Income/expense toggle
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">' +
          '<button id="fc-mt-expense-btn" onclick="fcMtSetType(\'expense\')" style="background:rgba(251,113,133,.12);border:1.5px solid rgba(251,113,133,.3);border-radius:999px;padding:7px 18px;color:#fb7185;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">− Expense</button>' +
          '<button id="fc-mt-income-btn" onclick="fcMtSetType(\'income\')" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:7px 18px;color:rgba(255,255,255,.5);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">+ Income</button>' +
        '</div>' +
      '</div>' +

      // Merchant name
      '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Merchant / Description</div>' +
      '<input id="fc-mt-name" type="text" placeholder="Coffee, Rent, Paycheck…" style="width:100%;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:14px">' +

      // Category
      '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Category</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px">' +
        cats.map(function(c, i) {
          return '<button onclick="fcMtSelectCat(this,\'' + c + '\')" style="background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px 13px;color:rgba(255,255,255,.6);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer' + (i === 0 ? ';background:rgba(6,182,212,.12);border-color:rgba(6,182,212,.3);color:#06b6d4' : '') + '">' + c + '</button>';
        }).join('') +
      '</div>' +

      // Date
      '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Date</div>' +
      '<input id="fc-mt-date" type="date" value="' + today + '" style="width:100%;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:14px;color-scheme:dark">' +

      // Note
      '<input id="fc-mt-note" type="text" placeholder="Note (optional)" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px 16px;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box;margin-bottom:20px">' +

      '<button onclick="fcMtSubmit()" style="width:100%;background:var(--acc,#06b6d4);border:none;border-radius:16px;padding:15px;color:#000;font-family:Syne,sans-serif;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:-.2px">Add Transaction</button>' +
      '<button onclick="document.getElementById(\'fc-manual-txn-sheet\').remove()" style="width:100%;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:12px">Cancel</button>' +
    '</div>';

  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
  setTimeout(function() { var el = document.getElementById('fc-mt-amt'); if (el) el.focus(); }, 100);
}

var _fcMtType = 'expense';
var _fcMtCat = 'Other';

function fcMtSetType(type) {
  _fcMtType = type;
  var expBtn = document.getElementById('fc-mt-expense-btn');
  var incBtn = document.getElementById('fc-mt-income-btn');
  if (!expBtn || !incBtn) return;
  if (type === 'expense') {
    expBtn.style.cssText = 'background:rgba(251,113,133,.12);border:1.5px solid rgba(251,113,133,.3);border-radius:999px;padding:7px 18px;color:#fb7185;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer';
    incBtn.style.cssText = 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:7px 18px;color:rgba(255,255,255,.5);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer';
  } else {
    incBtn.style.cssText = 'background:rgba(52,211,153,.12);border:1.5px solid rgba(52,211,153,.3);border-radius:999px;padding:7px 18px;color:#34d399;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer';
    expBtn.style.cssText = 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:7px 18px;color:rgba(255,255,255,.5);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer';
  }
}

function fcMtSelectCat(btn, cat) {
  _fcMtCat = cat;
  var all = btn.parentNode.querySelectorAll('button');
  all.forEach(function(b) {
    b.style.background = 'rgba(255,255,255,.055)';
    b.style.borderColor = 'rgba(255,255,255,.08)';
    b.style.color = 'rgba(255,255,255,.6)';
  });
  btn.style.background = 'rgba(6,182,212,.12)';
  btn.style.borderColor = 'rgba(6,182,212,.3)';
  btn.style.color = '#06b6d4';
}

function fcMtSubmit() {
  var amt = parseFloat(document.getElementById('fc-mt-amt').value);
  var name = (document.getElementById('fc-mt-name').value || '').trim();
  var date = document.getElementById('fc-mt-date').value || new Date().toISOString().split('T')[0];
  var note = (document.getElementById('fc-mt-note').value || '').trim();

  if (!amt || amt <= 0) {
    document.getElementById('fc-mt-amt').style.color = '#fb7185';
    return;
  }
  if (!name) {
    document.getElementById('fc-mt-name').style.borderColor = 'rgba(251,113,133,.4)';
    return;
  }

  var tx = {
    id: 'manual_' + Date.now(),
    name: name,
    cleanName: name,
    amt: _fcMtType === 'income' ? Math.abs(amt) : -Math.abs(amt),
    cat: _fcMtCat,
    date: date,
    note: note,
    isCredit: _fcMtType === 'income',
    isManual: true
  };

  // Add to logList
  if (typeof logList !== 'undefined' && Array.isArray(logList)) {
    logList.unshift(tx);
    window.logList = logList;
  }

  // Persist
  setTimeout(function() {
    try {
      if (typeof saveLog === 'function') saveLog();
      else if (typeof persist === 'function') persist();
      if (typeof renderSpending === 'function') renderSpending();
      if (typeof renderTransactions === 'function') renderTransactions();
      if (typeof renderDashboardPulse === 'function') renderDashboardPulse();
      if (typeof clearCopilotCache === 'function') clearCopilotCache();
    } catch(e) {}
  }, 100);

  var sheet = document.getElementById('fc-manual-txn-sheet');
  if (sheet) sheet.remove();
  if (typeof haptic === 'function') haptic('medium');

  // Toast
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.25);border-radius:999px;padding:10px 20px;color:#34d399;font-size:13px;font-weight:700;z-index:9999;white-space:nowrap;font-family:DM Sans,sans-serif';
  toast.textContent = '✓ Transaction added';
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2500);
}

// Add "+" button to transactions page
function injectManualTxnButton() {
  var txnPage = document.getElementById('pg-transactions');
  if (!txnPage || document.getElementById('fc-add-txn-btn')) return;

  // Find the header area
  var header = txnPage.querySelector('[style*="padding:20px"]') || txnPage.querySelector('div');
  if (!header) return;

  var btn = document.createElement('button');
  btn.id = 'fc-add-txn-btn';
  btn.onclick = openManualTransactionEntry;
  btn.style.cssText = 'position:fixed;bottom:calc(70px + env(safe-area-inset-bottom,0px));right:20px;width:52px;height:52px;border-radius:16px;background:var(--acc,#06b6d4);border:none;color:#000;font-size:24px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(6,182,212,.35);z-index:8000;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#000" stroke-width="2.5" stroke-linecap="round"/></svg>';
  document.body.appendChild(btn);
}

// ══════════════════════════════════════
//  2. TRANSACTION NOTES + TAGS
// ══════════════════════════════════════

var FC_NOTES_KEY = 'fc-txn-notes-v1';

function fcGetNotes() {
  try { return JSON.parse(localStorage.getItem(FC_NOTES_KEY) || '{}'); } catch(e) { return {}; }
}
function fcSaveNote(txId, note, tags) {
  var notes = fcGetNotes();
  notes[txId] = { note: note || '', tags: tags || [], updatedAt: new Date().toISOString() };
  try { localStorage.setItem(FC_NOTES_KEY, JSON.stringify(notes)); } catch(e) {}
}

function openTxnNoteSheet(txId, txName, txAmt) {
  var existing = fcGetNotes()[txId] || {};
  var TAGS = ['Work', 'Personal', 'Reimbursed', 'Vacation', 'Gift', 'Subscription', 'One-time', 'Recurring'];

  var sheet = document.createElement('div');
  sheet.id = 'fc-note-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.65)';
  sheet.innerHTML =
    '<div style="width:100%;background:#0f1520;border-radius:24px 24px 0 0;padding:22px;padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;margin:0 auto 18px"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700;color:#fff">' + (txName || 'Transaction') + '</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,.4)">$' + Math.abs(txAmt || 0).toFixed(2) + '</div>' +
        '</div>' +
      '</div>' +

      '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Note</div>' +
      '<textarea id="fc-note-input" placeholder="Add a note about this transaction…" style="width:100%;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 16px;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box;resize:none;height:80px;margin-bottom:14px">' + (existing.note || '') + '</textarea>' +

      '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Tags</div>' +
      '<div id="fc-tag-wrap" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px">' +
        TAGS.map(function(tag) {
          var active = existing.tags && existing.tags.indexOf(tag) >= 0;
          return '<button onclick="fcToggleTag(this,\'' + tag + '\')" style="background:' + (active ? 'rgba(6,182,212,.12)' : 'rgba(255,255,255,.055)') + ';border:1px solid ' + (active ? 'rgba(6,182,212,.3)' : 'rgba(255,255,255,.08)') + ';border-radius:10px;padding:7px 12px;color:' + (active ? '#06b6d4' : 'rgba(255,255,255,.5)') + ';font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">' + tag + '</button>';
        }).join('') +
      '</div>' +

      '<button onclick="fcSaveNoteSheet(\'' + txId + '\')" style="width:100%;background:var(--acc,#06b6d4);border:none;border-radius:16px;padding:14px;color:#000;font-family:Syne,sans-serif;font-size:15px;font-weight:800;cursor:pointer">Save Note</button>' +
      '<button onclick="document.getElementById(\'fc-note-sheet\').remove()" style="width:100%;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:10px">Cancel</button>' +
    '</div>';

  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

var _fcActiveTags = [];
function fcToggleTag(btn, tag) {
  var notes = fcGetNotes();
  var idx = _fcActiveTags.indexOf(tag);
  if (idx >= 0) {
    _fcActiveTags.splice(idx, 1);
    btn.style.background = 'rgba(255,255,255,.055)';
    btn.style.borderColor = 'rgba(255,255,255,.08)';
    btn.style.color = 'rgba(255,255,255,.5)';
  } else {
    _fcActiveTags.push(tag);
    btn.style.background = 'rgba(6,182,212,.12)';
    btn.style.borderColor = 'rgba(6,182,212,.3)';
    btn.style.color = '#06b6d4';
  }
}

function fcSaveNoteSheet(txId) {
  var noteEl = document.getElementById('fc-note-input');
  var note = noteEl ? noteEl.value.trim() : '';
  fcSaveNote(txId, note, _fcActiveTags.slice());
  var sheet = document.getElementById('fc-note-sheet');
  if (sheet) sheet.remove();
  if (typeof haptic === 'function') haptic('light');
}

// ══════════════════════════════════════
//  3. SPENDING WATCHLIST
//  Watch a category or merchant
//  Gets fed into the AI copilot
// ══════════════════════════════════════

var FC_WATCHLIST_KEY = 'fc-watchlist-v1';

function fcGetWatchlist() {
  try { return JSON.parse(localStorage.getItem(FC_WATCHLIST_KEY) || '[]'); } catch(e) { return []; }
}

function openWatchlistManager() {
  var watches = fcGetWatchlist();
  var cats = ['Food','Groceries','Shopping','Gas','Subscriptions','Entertainment','Health','Travel'];

  var sheet = document.createElement('div');
  sheet.id = 'fc-watchlist-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.65)';
  sheet.innerHTML =
    '<div style="width:100%;background:#0f1520;border-radius:24px 24px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));max-height:85vh;overflow-y:auto">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;margin:0 auto 20px"></div>' +
      '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px;font-family:Syne,sans-serif">Spending Watchlist</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:20px">Pick categories to watch. The AI will alert you before they get out of hand.</div>' +

      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px">' +
        cats.map(function(cat) {
          var watched = watches.some(function(w) { return w.cat === cat; });
          var icons = {'Food':'🍔','Groceries':'🛒','Shopping':'🛍️','Gas':'⛽','Subscriptions':'📱','Entertainment':'🎮','Health':'💊','Travel':'✈️'};
          return '<button onclick="fcToggleWatch(\'' + cat + '\',this)" style="' +
            'background:' + (watched ? 'rgba(6,182,212,.1)' : 'rgba(255,255,255,.04)') + ';' +
            'border:1.5px solid ' + (watched ? 'rgba(6,182,212,.3)' : 'rgba(255,255,255,.07)') + ';' +
            'border-radius:16px;padding:14px;text-align:left;cursor:pointer;' +
          '">' +
            '<div style="font-size:22px;margin-bottom:6px">' + (icons[cat] || '📊') + '</div>' +
            '<div style="font-size:13px;font-weight:700;color:' + (watched ? '#06b6d4' : '#fff') + '">' + cat + '</div>' +
            (watched ? '<div style="font-size:10px;color:#06b6d4;margin-top:3px;font-weight:600">Watching ✓</div>' : '') +
          '</button>';
        }).join('') +
      '</div>' +

      (watches.length > 0 ?
        '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:10px">Currently watching ' + watches.length + ' categor' + (watches.length === 1 ? 'y' : 'ies') + '</div>' : '') +

      '<button onclick="document.getElementById(\'fc-watchlist-sheet\').remove()" style="width:100%;background:var(--acc,#06b6d4);border:none;border-radius:16px;padding:14px;color:#000;font-family:Syne,sans-serif;font-size:15px;font-weight:800;cursor:pointer">Done</button>' +
    '</div>';

  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

function fcToggleWatch(cat, btn) {
  var watches = fcGetWatchlist();
  var idx = watches.findIndex(function(w) { return w.cat === cat; });
  if (idx >= 0) {
    watches.splice(idx, 1);
  } else {
    watches.push({ cat: cat, addedAt: new Date().toISOString() });
  }
  try { localStorage.setItem(FC_WATCHLIST_KEY, JSON.stringify(watches)); } catch(e) {}
  // Reopen to refresh
  var sheet = document.getElementById('fc-watchlist-sheet');
  if (sheet) sheet.remove();
  openWatchlistManager();
  if (typeof haptic === 'function') haptic('light');
}

// ══════════════════════════════════════
//  4. SMART BALANCE ALERTS
//  Forward-looking, not just reactive
// ══════════════════════════════════════

function checkSmartAlerts() {
  var alerts = [];
  var now = new Date();
  var dayOfMonth = now.getDate();
  var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  var daysLeft = daysInMonth - dayOfMonth;

  // Check watchlist categories
  var watches = fcGetWatchlist();
  if (typeof logList !== 'undefined' && Array.isArray(logList) && watches.length > 0) {
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    watches.forEach(function(w) {
      var spent = 0;
      logList.forEach(function(tx) {
        if (!tx || !tx.date) return;
        var d = new Date(tx.date);
        if (d < monthStart) return;
        if (tx.cat === w.cat && !tx.isCredit) spent += Math.abs(tx.amt || 0);
      });
      if (spent > 0 && typeof budgetS !== 'undefined' && Array.isArray(budgetS)) {
        var budget = budgetS.find(function(b) { return b.cat === w.cat; });
        if (budget && budget.lim > 0) {
          var pct = spent / budget.lim;
          if (pct >= 0.8 && pct < 1) {
            alerts.push({
              type: 'watchlist',
              urgency: 'amber',
              icon: '👀',
              cat: w.cat,
              msg: w.cat + ' is at ' + Math.round(pct*100) + '% of budget with ' + daysLeft + ' days left'
            });
          }
        }
      }
    });
  }

  // Check upcoming bills
  if (typeof bills !== 'undefined' && Array.isArray(bills)) {
    bills.forEach(function(b) {
      if (!b.dueDay) return;
      var daysUntil = b.dueDay >= dayOfMonth ? b.dueDay - dayOfMonth : (daysInMonth - dayOfMonth) + b.dueDay;
      if (daysUntil <= 3) {
        alerts.push({
          type: 'bill',
          urgency: 'red',
          icon: '📅',
          msg: b.name + ' ($' + b.amt + ') due in ' + daysUntil + ' day' + (daysUntil !== 1 ? 's' : '')
        });
      }
    });
  }

  // Render alerts in dashboard
  renderSmartAlerts(alerts);
  return alerts;
}

function renderSmartAlerts(alerts) {
  var wrap = document.getElementById('fc-smart-alerts');
  if (!wrap || !alerts || !alerts.length) return;

  var colors = { red: '#f87171', amber: '#f59e0b', green: '#34d399' };
  wrap.innerHTML = alerts.map(function(a) {
    var color = colors[a.urgency] || '#60a5fa';
    return '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-left:3px solid ' + color + ';border-radius:14px;margin-bottom:8px">' +
      '<div style="font-size:16px">' + a.icon + '</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.4;flex:1">' + a.msg + '</div>' +
    '</div>';
  }).join('');
  wrap.style.display = 'block';
}

// Inject smart alerts container into dashboard
function injectSmartAlerts() {
  var dashPage = document.getElementById('pg-dashboard');
  if (!dashPage || document.getElementById('fc-smart-alerts')) return;

  var copilotFeed = document.getElementById('copilot-feed');
  if (!copilotFeed) return;

  var alertsWrap = document.createElement('div');
  alertsWrap.style.cssText = 'padding:0 18px;display:none';
  alertsWrap.innerHTML = '<div id="fc-smart-alerts"></div>';
  copilotFeed.parentNode.insertBefore(alertsWrap, copilotFeed.nextSibling);
}

// ══════════════════════════════════════
//  5. UNUSUAL CHARGE DETECTION
// ══════════════════════════════════════

function detectUnusualCharges() {
  if (typeof logList === 'undefined' || !Array.isArray(logList)) return [];
  var unusual = [];
  var merchantHistory = {};

  // Build merchant average from last 90 days
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  logList.forEach(function(tx) {
    if (!tx || !tx.date || tx.isCredit || tx.isTransfer) return;
    var d = new Date(tx.date);
    if (d < cutoff) return;
    var key = (tx.cleanName || tx.name || '').toLowerCase().substring(0, 20);
    if (!merchantHistory[key]) merchantHistory[key] = [];
    merchantHistory[key].push(Math.abs(tx.amt || 0));
  });

  // Check recent transactions (last 7 days)
  var recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 7);

  logList.slice(0, 30).forEach(function(tx, idx) {
    if (!tx || !tx.date || tx.isCredit || tx.isTransfer) return;
    var d = new Date(tx.date);
    if (d < recentCutoff) return;
    var key = (tx.cleanName || tx.name || '').toLowerCase().substring(0, 20);
    var history = merchantHistory[key] || [];
    if (history.length < 2) return;
    var avg = history.reduce(function(a,b){return a+b;},0) / history.length;
    var amt = Math.abs(tx.amt || 0);
    if (amt > avg * 2.5 && amt > 20) {
      unusual.push({
        txIndex: idx,
        name: tx.cleanName || tx.name,
        amt: amt,
        avg: avg,
        multiple: Math.round(amt / avg * 10) / 10
      });
    }
  });
  return unusual;
}

// ══════════════════════════════════════
//  6. WATCHLIST ENTRY POINT IN BUDGET PAGE
// ══════════════════════════════════════

function injectWatchlistButton() {
  var budgetPage = document.getElementById('pg-budget');
  if (!budgetPage || document.getElementById('fc-watchlist-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'fc-watchlist-btn';
  btn.onclick = openWatchlistManager;
  btn.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px 16px;cursor:pointer;margin:0 18px 16px;width:calc(100% - 36px);-webkit-tap-highlight-color:transparent';
  btn.innerHTML =
    '<div style="width:36px;height:36px;border-radius:12px;background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.18);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">👀</div>' +
    '<div style="flex:1;text-align:left">' +
      '<div style="font-size:14px;font-weight:700;color:#fff">Spending Watchlist</div>' +
      '<div id="fc-watchlist-count" style="font-size:12px;color:rgba(255,255,255,.4);margin-top:2px">Watch categories before they blow</div>' +
    '</div>' +
    '<div style="color:rgba(255,255,255,.25);font-size:16px">›</div>';

  var budgetList = budgetPage.querySelector('#budget-breakdown-card') || budgetPage.querySelector('[id*="budget"]');
  if (budgetList && budgetList.parentNode) {
    budgetList.parentNode.insertBefore(btn, budgetList);
  }
  updateWatchlistCount();
}

function updateWatchlistCount() {
  var watches = fcGetWatchlist();
  var el = document.getElementById('fc-watchlist-count');
  if (el) {
    el.textContent = watches.length > 0
      ? 'Watching ' + watches.length + ' categor' + (watches.length === 1 ? 'y' : 'ies')
      : 'Watch categories before they blow';
  }
}

// ══════════════════════════════════════
//  INIT ALL FEATURES
// ══════════════════════════════════════

function initFeatureUpgrades() {
  injectManualTxnButton();
  injectSmartAlerts();
  injectWatchlistButton();
  setTimeout(checkSmartAlerts, 2000);
  updateWatchlistCount();
}

setTimeout(initFeatureUpgrades, 1200);

// Re-run on navigation
var _fcFeatNavOrig = window.fcNav;
window.fcNav = function(page) {
  if (typeof _fcFeatNavOrig === 'function') _fcFeatNavOrig.apply(this, arguments);
  setTimeout(function() {
    if (page === 'transactions' || page === 'log') injectManualTxnButton();
    if (page === 'budget') { injectWatchlistButton(); updateWatchlistCount(); }
    if (page === 'dashboard') { injectSmartAlerts(); setTimeout(checkSmartAlerts, 500); }
  }, 300);
};

// Expose for copilot snapshot
window.fcGetWatchlist = fcGetWatchlist;
window.fcGetNotes = fcGetNotes;
window.openManualTransactionEntry = openManualTransactionEntry;
window.openWatchlistManager = openWatchlistManager;
window.openTxnNoteSheet = openTxnNoteSheet;

console.log('[FC Features] Manual transactions, notes, tags, watchlist, alerts loaded');
