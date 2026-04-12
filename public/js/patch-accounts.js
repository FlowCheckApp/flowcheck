// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK MANUAL ACCOUNTS — patch-accounts.js
//  Add checking, savings, investment, and loan accounts manually
//  without Plaid. Each account has a role, balance, and history.
//  These merge with Plaid accounts in net worth calculations.
// ═══════════════════════════════════════════════════════════════

var FC_ACCTS = {
  STORE_KEY: 'fc-manual-accounts-v1',
  accounts: [],
  TYPES: [
    { id: 'checking',    label: 'Checking',    icon: '💳', color: '#06b6d4', role: 'Daily cash flow' },
    { id: 'savings',     label: 'Savings',     icon: '🛡️', color: '#4ade80', role: 'Protected buffer' },
    { id: 'investment',  label: 'Investment',  icon: '📈', color: '#a78bfa', role: 'Long-term growth' },
    { id: 'credit',      label: 'Credit Card', icon: '⚡', color: '#f59e0b', role: 'Upcoming obligation' },
    { id: 'loan',        label: 'Loan',        icon: '📉', color: '#f87171', role: 'Pay down over time' },
    { id: 'retirement',  label: '401k / IRA',  icon: '🏦', color: '#34d399', role: 'Retirement fund' },
    { id: 'cash',        label: 'Cash',        icon: '💵', color: '#fbbf24', role: 'On-hand cash' },
    { id: 'other',       label: 'Other Asset', icon: '🏠', color: '#60a5fa', role: 'Other asset' }
  ]
};

function fcAcctsLoad() {
  try { FC_ACCTS.accounts = JSON.parse(localStorage.getItem(FC_ACCTS.STORE_KEY) || '[]'); }
  catch (e) { FC_ACCTS.accounts = []; }
}

function fcAcctsSave() {
  try { localStorage.setItem(FC_ACCTS.STORE_KEY, JSON.stringify(FC_ACCTS.accounts)); }
  catch (e) {}
}

function fcAcctCreate(name, type, balance) {
  var typeInfo = FC_ACCTS.TYPES.find(function(t) { return t.id === type; }) || FC_ACCTS.TYPES[0];
  var acct = {
    id: 'acct_' + Date.now(),
    name: name,
    type: type,
    balance: parseFloat(balance) || 0,
    icon: typeInfo.icon,
    color: typeInfo.color,
    createdAt: new Date().toISOString(),
    history: [{ balance: parseFloat(balance)||0, date: new Date().toISOString() }],
    isManual: true
  };
  FC_ACCTS.accounts.push(acct);
  fcAcctsSave();
  return acct;
}

function fcAcctUpdateBalance(acctId, newBalance) {
  var acct = FC_ACCTS.accounts.find(function(a) { return a.id === acctId; });
  if (!acct) return;
  acct.balance = parseFloat(newBalance) || 0;
  acct.history.push({ balance: acct.balance, date: new Date().toISOString() });
  if (acct.history.length > 30) acct.history = acct.history.slice(-30);
  fcAcctsSave();
}

// ── Open add account sheet ──
function fcAcctOpenAdd() {
  var sheet = document.createElement('div');
  sheet.id = 'fc-acct-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6)';

  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:24px;max-height:90vh;overflow-y:auto">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>' +
      '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:20px">Add Account</div>' +

      // Account type grid
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px">Account Type</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:18px">' +
        FC_ACCTS.TYPES.map(function(t, i) {
          return '<button onclick="fcAcctSelectType(\'' + t.id + '\')" id="fc-acct-type-' + t.id + '" data-type="' + t.id + '" style="' +
            'background:' + (i === 0 ? 'rgba(6,182,212,.12)' : 'rgba(255,255,255,.05)') + ';' +
            'border:1.5px solid ' + (i === 0 ? 'rgba(6,182,212,.4)' : 'rgba(255,255,255,.08)') + ';' +
            'border-radius:14px;padding:12px;text-align:left;cursor:pointer;' +
            (i === 0 ? 'outline:none' : '') +
          '">' +
            '<div style="font-size:18px;margin-bottom:4px">' + t.icon + '</div>' +
            '<div style="font-size:13px;font-weight:800;color:#fff">' + t.label + '</div>' +
            '<div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:2px">' + t.role + '</div>' +
          '</button>';
        }).join('') +
      '</div>' +

      // Name
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Account Name</div>' +
      '<input id="fc-acct-name" type="text" placeholder="e.g. Chase Checking, Emergency Fund…" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:16px">' +

      // Balance
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Current Balance</div>' +
      '<input id="fc-acct-balance" type="number" step="0.01" placeholder="$0.00" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:20px">' +

      '<button onclick="fcAcctDoAdd()" style="width:100%;background:var(--acc);border:none;border-radius:16px;padding:15px;color:#000;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:10px">Add Account</button>' +
      '<button onclick="document.getElementById(\'fc-acct-sheet\').remove()" style="width:100%;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:8px">Cancel</button>' +
    '</div>';

  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

var _fcAcctSelectedType = 'checking';
function fcAcctSelectType(typeId) {
  _fcAcctSelectedType = typeId;
  FC_ACCTS.TYPES.forEach(function(t) {
    var btn = document.getElementById('fc-acct-type-' + t.id);
    if (!btn) return;
    if (t.id === typeId) {
      btn.style.background = 'rgba(6,182,212,.12)';
      btn.style.border = '1.5px solid rgba(6,182,212,.4)';
    } else {
      btn.style.background = 'rgba(255,255,255,.05)';
      btn.style.border = '1.5px solid rgba(255,255,255,.08)';
    }
  });
}

function fcAcctDoAdd() {
  var name = document.getElementById('fc-acct-name') && document.getElementById('fc-acct-name').value.trim();
  var balance = document.getElementById('fc-acct-balance') && document.getElementById('fc-acct-balance').value;
  if (!name) {
    document.getElementById('fc-acct-name').style.borderColor = 'rgba(248,113,113,.5)';
    return;
  }
  fcAcctCreate(name, _fcAcctSelectedType, balance);
  var sheet = document.getElementById('fc-acct-sheet');
  if (sheet) sheet.remove();
  renderManualAccounts();
  if (typeof haptic === 'function') haptic('medium');
}

// ── Open update balance sheet ──
function fcAcctOpenUpdate(acctId) {
  var acct = FC_ACCTS.accounts.find(function(a) { return a.id === acctId; });
  if (!acct) return;

  var sheet = document.createElement('div');
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6)';
  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:24px">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
        '<div style="font-size:26px">' + acct.icon + '</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;color:#fff">' + acct.name + '</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,.4)">Current: $' + (acct.balance||0).toFixed(2) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">New Balance</div>' +
      '<input id="fc-acct-upd-bal" type="number" step="0.01" value="' + (acct.balance||0).toFixed(2) + '" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:18px;font-weight:700;box-sizing:border-box;margin-bottom:16px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<button onclick="fcAcctDoDelete(\'' + acctId + '\',this)" style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.18);border-radius:16px;padding:13px;color:#f87171;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Delete</button>' +
        '<button onclick="var v=document.getElementById(\'fc-acct-upd-bal\').value;fcAcctUpdateBalance(\'' + acctId + '\',v);this.closest(\'div\').parentNode.parentNode.remove();renderManualAccounts()" style="background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);border-radius:16px;padding:13px;color:#4ade80;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Update ✓</button>' +
      '</div>' +
      '<button onclick="this.closest(\'div\').parentNode.remove()" style="width:100%;margin-top:10px;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:10px">Cancel</button>' +
    '</div>';
  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

function fcAcctDoDelete(acctId, btn) {
  FC_ACCTS.accounts = FC_ACCTS.accounts.filter(function(a) { return a.id !== acctId; });
  fcAcctsSave();
  var sheet = btn.closest('[style*="position:fixed"]');
  if (sheet) sheet.remove();
  renderManualAccounts();
}

// ── Render manual accounts into the plaid/accounts page ──
function renderManualAccounts() {
  var wrap = document.getElementById('fc-manual-accts-wrap');
  if (!wrap) return;

  fcAcctsLoad();
  var accounts = FC_ACCTS.accounts;

  var totalAssets = accounts.filter(function(a) { return a.type !== 'credit' && a.type !== 'loan'; })
    .reduce(function(s,a) { return s + (a.balance||0); }, 0);
  var totalDebt = accounts.filter(function(a) { return a.type === 'credit' || a.type === 'loan'; })
    .reduce(function(s,a) { return s + (a.balance||0); }, 0);

  if (!accounts.length) {
    wrap.innerHTML =
      '<div style="padding:16px;border:1px dashed rgba(255,255,255,.1);border-radius:16px;text-align:center">' +
        '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:12px">Add accounts manually to track net worth without Plaid</div>' +
        '<button onclick="fcAcctOpenAdd()" style="background:rgba(var(--acc-rgb,6,182,212),.1);border:1px solid rgba(var(--acc-rgb,6,182,212),.2);border-radius:999px;padding:9px 18px;color:var(--acc);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">+ Add Account Manually</button>' +
      '</div>';
    return;
  }

  wrap.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.4)">' +
        accounts.length + ' manual account' + (accounts.length !== 1 ? 's' : '') +
        ' · Net $' + (totalAssets - totalDebt).toFixed(2) +
      '</div>' +
      '<button onclick="fcAcctOpenAdd()" style="background:rgba(var(--acc-rgb,6,182,212),.08);border:1px solid rgba(var(--acc-rgb,6,182,212),.15);border-radius:999px;padding:6px 12px;color:var(--acc);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">+ Add</button>' +
    '</div>' +
    accounts.map(function(acct) {
      var typeInfo = FC_ACCTS.TYPES.find(function(t) { return t.id === acct.type; }) || FC_ACCTS.TYPES[0];
      var isDebt = acct.type === 'credit' || acct.type === 'loan';
      return '<div onclick="fcAcctOpenUpdate(\'' + acct.id + '\')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:16px;margin-bottom:8px;cursor:pointer">' +
        '<div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + acct.icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:700;color:#fff">' + acct.name + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">' + typeInfo.role + ' · Tap to update</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:15px;font-weight:800;color:' + (isDebt ? '#f87171' : '#4ade80') + '">' +
            (isDebt ? '-' : '') + '$' + (acct.balance||0).toFixed(2) +
          '</div>' +
          '<div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:2px">Manual</div>' +
        '</div>' +
      '</div>';
    }).join('');
}

// ── Inject manual accounts section into plaid page ──
function injectManualAccountsUI() {
  var plaidPage = document.getElementById('pg-plaid');
  if (!plaidPage) return;
  if (document.getElementById('fc-manual-accts-wrap')) return;

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding:0 16px 20px';
  wrapper.innerHTML =
    '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:12px;margin-top:8px">MANUAL ACCOUNTS</div>' +
    '<div id="fc-manual-accts-wrap"></div>';

  // Append to end of plaid page
  var pageContent = plaidPage.querySelector('div[style*="padding"]') || plaidPage;
  pageContent.appendChild(wrapper);

  fcAcctsLoad();
  renderManualAccounts();
}

// ── Init ──
setTimeout(injectManualAccountsUI, 1000);

var _fcAcctNavOrig = window.fcNav;
window.fcNav = function(page) {
  if (typeof _fcAcctNavOrig === 'function') _fcAcctNavOrig.apply(this, arguments);
  if (page === 'plaid') setTimeout(injectManualAccountsUI, 300);
};

// Expose total for net worth calculations
window.fcManualAccountsTotal = function() {
  fcAcctsLoad();
  return FC_ACCTS.accounts.reduce(function(s, a) {
    var isDebt = a.type === 'credit' || a.type === 'loan';
    return s + (isDebt ? -(a.balance||0) : (a.balance||0));
  }, 0);
};

console.log('[FC Accts] Manual accounts loaded');
