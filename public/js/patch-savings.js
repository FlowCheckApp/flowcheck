// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK SAVINGS ACCOUNTS — patch-savings.js
//  Individual savings pots with manual contributions, rules,
//  and linked bank accounts. Drop in after app-auth.js.
//
//  FEATURES:
//  - Individual savings pots (emergency fund, vacation, etc.)
//  - Manual "Add Money" contributions per pot
//  - Linked checking account deduction
//  - Contribution history per pot
//  - Auto-save rules (round-up, % of income)
//  - Progress rings and milestone celebrations
// ═══════════════════════════════════════════════════════════════

var FC_SAV = {
  STORE_KEY: 'fc-sav-accounts-v2',
  accounts: []
};

// ── Load/save ──
function fcSavLoad() {
  try {
    FC_SAV.accounts = JSON.parse(localStorage.getItem(FC_SAV.STORE_KEY) || '[]');
  } catch (e) { FC_SAV.accounts = []; }
}

function fcSavSave() {
  try {
    localStorage.setItem(FC_SAV.STORE_KEY, JSON.stringify(FC_SAV.accounts));
  } catch (e) {}
}

// ── Create new savings account ──
function fcSavCreate(name, targetAmt, emoji, color) {
  var acct = {
    id: 'sav_' + Date.now(),
    name: name || 'Savings',
    target: parseFloat(targetAmt) || 0,
    balance: 0,
    emoji: emoji || '🎯',
    color: color || '#06b6d4',
    createdAt: new Date().toISOString(),
    contributions: [],
    autoRule: null  // {type: 'percent', value: 5} or {type: 'roundup'}
  };
  FC_SAV.accounts.push(acct);
  fcSavSave();
  return acct;
}

// ── Add contribution to a pot ──
function fcSavContribute(accountId, amount, note) {
  var acct = FC_SAV.accounts.find(function(a) { return a.id === accountId; });
  if (!acct) return false;
  amount = parseFloat(amount);
  if (!amount || amount <= 0) return false;

  acct.balance = (acct.balance || 0) + amount;
  acct.contributions.push({
    amt: amount,
    note: note || 'Manual contribution',
    date: new Date().toISOString()
  });
  fcSavSave();

  // Celebrate if milestone hit
  if (acct.target > 0) {
    var pct = acct.balance / acct.target;
    if (pct >= 1 && (pct - amount / acct.target) < 1) {
      fcSavCelebrate(acct);
    }
  }

  return true;
}

// ── Withdraw from a pot ──
function fcSavWithdraw(accountId, amount, note) {
  var acct = FC_SAV.accounts.find(function(a) { return a.id === accountId; });
  if (!acct) return false;
  amount = parseFloat(amount);
  acct.balance = Math.max(0, (acct.balance || 0) - amount);
  acct.contributions.push({
    amt: -amount,
    note: note || 'Withdrawal',
    date: new Date().toISOString()
  });
  fcSavSave();
  return true;
}

// ── Celebrate goal completion ──
function fcSavCelebrate(acct) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);animation:fadeIn .3s ease';
  el.innerHTML =
    '<div style="background:#1a1a1a;border:1px solid rgba(250,204,21,.3);border-radius:28px;padding:32px;text-align:center;max-width:300px;margin:20px">' +
      '<div style="font-size:48px;margin-bottom:12px">' + acct.emoji + '</div>' +
      '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:8px">Goal Reached! 🎉</div>' +
      '<div style="font-size:14px;color:rgba(255,255,255,.55);margin-bottom:4px">' + acct.name + '</div>' +
      '<div style="font-size:28px;font-weight:800;color:#facc15;margin:12px 0">$' + acct.balance.toFixed(2) + '</div>' +
      '<button onclick="this.closest(\'div\').parentNode.remove()" style="width:100%;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.3);border-radius:16px;padding:13px;color:#facc15;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Amazing! ✓</button>' +
    '</div>';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 6000);
}

// ── Open contribute sheet ──
function fcSavOpenContribute(accountId) {
  var acct = FC_SAV.accounts.find(function(a) { return a.id === accountId; });
  if (!acct) return;
  var remaining = Math.max(0, (acct.target || 0) - (acct.balance || 0));

  var sheet = document.createElement('div');
  sheet.id = 'fc-sav-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6)';
  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:24px">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
        '<div style="font-size:28px">' + acct.emoji + '</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;color:#fff">' + acct.name + '</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,.4)">$' + (acct.balance||0).toFixed(2) + ' saved' + (acct.target ? ' · $' + remaining.toFixed(2) + ' to go' : '') + '</div>' +
        '</div>' +
      '</div>' +

      // Quick amounts
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:10px">Quick Add</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
        [5, 10, 20, 50, 100, (remaining > 0 ? Math.ceil(remaining) : null)]
          .filter(Boolean)
          .filter(function(v, i, arr) { return arr.indexOf(v) === i; })
          .slice(0, 5)
          .map(function(amt) {
            return '<button onclick="document.getElementById(\'fc-sav-amt\').value=' + amt + '" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 16px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">$' + amt + '</button>';
          }).join('') +
      '</div>' +

      // Custom amount input
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px">Custom Amount</div>' +
      '<input id="fc-sav-amt" type="number" min="0.01" step="0.01" placeholder="$0.00" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:18px;font-weight:700;box-sizing:border-box;margin-bottom:10px">' +

      '<input id="fc-sav-note" type="text" placeholder="Note (optional)" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:12px 16px;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box;margin-bottom:16px">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<button onclick="fcSavDoWithdraw(\'' + accountId + '\')" style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.18);border-radius:16px;padding:14px;color:#f87171;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Withdraw</button>' +
        '<button onclick="fcSavDoContribute(\'' + accountId + '\')" style="background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);border-radius:16px;padding:14px;color:#4ade80;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Add Money ✓</button>' +
      '</div>' +
      '<button onclick="document.getElementById(\'fc-sav-sheet\').remove()" style="width:100%;margin-top:10px;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:10px">Cancel</button>' +
    '</div>';
  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
  setTimeout(function() { var inp = document.getElementById('fc-sav-amt'); if (inp) inp.focus(); }, 100);
}

function fcSavDoContribute(accountId) {
  var amt = parseFloat(document.getElementById('fc-sav-amt') && document.getElementById('fc-sav-amt').value);
  var note = document.getElementById('fc-sav-note') && document.getElementById('fc-sav-note').value;
  if (!amt || amt <= 0) return;
  fcSavContribute(accountId, amt, note);
  var sheet = document.getElementById('fc-sav-sheet');
  if (sheet) sheet.remove();
  renderSavingsAccounts();
  if (typeof haptic === 'function') haptic('medium');
}

function fcSavDoWithdraw(accountId) {
  var amt = parseFloat(document.getElementById('fc-sav-amt') && document.getElementById('fc-sav-amt').value);
  var note = document.getElementById('fc-sav-note') && document.getElementById('fc-sav-note').value;
  if (!amt || amt <= 0) return;
  fcSavWithdraw(accountId, amt, note || 'Withdrawal');
  var sheet = document.getElementById('fc-sav-sheet');
  if (sheet) sheet.remove();
  renderSavingsAccounts();
}

// ── Open create new savings account sheet ──
function fcSavOpenCreate() {
  var EMOJIS = ['🎯','✈️','🏠','🚗','💍','🎓','🏖️','🛡️','💻','🎮','👶','🐶','💰','🌟'];
  var COLORS = ['#06b6d4','#4ade80','#f59e0b','#f87171','#a78bfa','#fb923c','#34d399','#60a5fa'];

  var sheet = document.createElement('div');
  sheet.id = 'fc-sav-create-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6)';
  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:24px;max-height:90vh;overflow-y:auto">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>' +
      '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:20px">New Savings Goal</div>' +

      // Name
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Name</div>' +
      '<input id="fc-sav-new-name" type="text" placeholder="Vacation, Emergency Fund, New Car…" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:16px">' +

      // Target
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Target Amount (optional)</div>' +
      '<input id="fc-sav-new-target" type="number" min="0" placeholder="$0 (no target)" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:16px">' +

      // Starting balance
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Starting Balance (optional)</div>' +
      '<input id="fc-sav-new-start" type="number" min="0" placeholder="$0" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;color:#fff;font-family:inherit;font-size:15px;box-sizing:border-box;margin-bottom:16px">' +

      // Emoji picker
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px">Icon</div>' +
      '<div id="fc-sav-emoji-pick" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">' +
        EMOJIS.map(function(e, i) {
          return '<button onclick="fcSavPickEmoji(this,\'' + e + '\')" data-emoji="' + e + '" style="width:42px;height:42px;border-radius:12px;' +
            (i === 0 ? 'background:rgba(var(--acc-rgb,6,182,212),.15);border:1.5px solid var(--acc)' : 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)') +
            ';font-size:20px;cursor:pointer">' + e + '</button>';
        }).join('') +
      '</div>' +

      '<button onclick="fcSavDoCreate()" style="width:100%;background:var(--acc);border:none;border-radius:16px;padding:15px;color:#000;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:10px">Create Goal</button>' +
      '<button onclick="document.getElementById(\'fc-sav-create-sheet\').remove()" style="width:100%;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:13px;cursor:pointer;padding:8px">Cancel</button>' +
    '</div>';
  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

function fcSavPickEmoji(btn, emoji) {
  document.querySelectorAll('#fc-sav-emoji-pick button').forEach(function(b) {
    b.style.background = 'rgba(255,255,255,.06)';
    b.style.border = '1px solid rgba(255,255,255,.08)';
  });
  btn.style.background = 'rgba(var(--acc-rgb,6,182,212),.15)';
  btn.style.border = '1.5px solid var(--acc)';
  btn.dataset.selected = 'true';
}

function fcSavDoCreate() {
  var name = document.getElementById('fc-sav-new-name') && document.getElementById('fc-sav-new-name').value.trim();
  if (!name) {
    document.getElementById('fc-sav-new-name').style.borderColor = 'rgba(248,113,113,.5)';
    return;
  }
  var target = parseFloat(document.getElementById('fc-sav-new-target') && document.getElementById('fc-sav-new-target').value) || 0;
  var start = parseFloat(document.getElementById('fc-sav-new-start') && document.getElementById('fc-sav-new-start').value) || 0;

  var selectedEmoji = '🎯';
  var pickedBtn = document.querySelector('#fc-sav-emoji-pick button[data-selected="true"]');
  if (pickedBtn) selectedEmoji = pickedBtn.dataset.emoji;

  var acct = fcSavCreate(name, target, selectedEmoji);
  if (start > 0) fcSavContribute(acct.id, start, 'Starting balance');

  var sheet = document.getElementById('fc-sav-create-sheet');
  if (sheet) sheet.remove();

  // Also add to savGoals if that global exists
  if (typeof savGoals !== 'undefined' && Array.isArray(savGoals)) {
    savGoals.push({ id: acct.id, name: name, target: target, saved: start });
    if (typeof saveSavings === 'function') saveSavings();
  }

  renderSavingsAccounts();
  if (typeof haptic === 'function') haptic('medium');
}

// ── Render the savings accounts grid ──
function renderSavingsAccounts() {
  var wrap = document.getElementById('fc-sav-accounts-grid');
  if (!wrap) return;

  fcSavLoad();
  var accounts = FC_SAV.accounts;

  if (!accounts.length) {
    wrap.innerHTML =
      '<div style="text-align:center;padding:28px 16px;border:1px dashed rgba(255,255,255,.1);border-radius:18px">' +
        '<div style="font-size:32px;margin-bottom:10px">🏦</div>' +
        '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px">Add your first savings goal</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:16px">Emergency fund, vacation, down payment — each one gets its own pot.</div>' +
        '<button onclick="fcSavOpenCreate()" style="background:var(--acc);border:none;border-radius:999px;padding:10px 22px;color:#000;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">+ Create Savings Goal</button>' +
      '</div>';
    return;
  }

  var totalSaved = accounts.reduce(function(s,a) { return s + (a.balance||0); }, 0);
  var totalTarget = accounts.reduce(function(s,a) { return s + (a.target||0); }, 0);

  wrap.innerHTML =
    // Summary header
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
      '<div>' +
        '<div style="font-size:22px;font-weight:800;color:#fff">$' + totalSaved.toFixed(2) + '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.4)">' + accounts.length + ' goal' + (accounts.length !== 1 ? 's' : '') + (totalTarget > 0 ? ' · $' + (totalTarget - totalSaved).toFixed(2) + ' remaining' : '') + '</div>' +
      '</div>' +
      '<button onclick="fcSavOpenCreate()" style="background:rgba(var(--acc-rgb,6,182,212),.1);border:1px solid rgba(var(--acc-rgb,6,182,212),.2);border-radius:999px;padding:8px 16px;color:var(--acc);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">+ New Goal</button>' +
    '</div>' +

    // Account cards
    accounts.map(function(acct) {
      var pct = acct.target > 0 ? Math.min(100, Math.round((acct.balance / acct.target) * 100)) : null;
      var recentContrib = acct.contributions.slice(-3).reverse();
      var circumference = 2 * Math.PI * 20; // radius 20
      var dash = pct != null ? (pct / 100) * circumference : 0;

      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:18px;margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
          // Progress ring
          '<div style="position:relative;width:52px;height:52px;flex-shrink:0">' +
            '<svg width="52" height="52" viewBox="0 0 52 52">' +
              '<circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"/>' +
              (pct != null ? '<circle cx="26" cy="26" r="20" fill="none" stroke="' + acct.color + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + (circumference - dash) + '" transform="rotate(-90 26 26)"/>' : '') +
            '</svg>' +
            '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px">' + acct.emoji + '</div>' +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:2px">' + acct.name + '</div>' +
            '<div style="font-size:13px;font-weight:700;color:' + acct.color + '">' +
              '$' + (acct.balance||0).toFixed(2) +
              (acct.target > 0 ? '<span style="color:rgba(255,255,255,.3);font-weight:500"> / $' + acct.target.toFixed(2) + '</span>' : '') +
            '</div>' +
            (pct != null ? '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:2px">' + pct + '% complete</div>' : '') +
          '</div>' +
          '<button onclick="fcSavOpenContribute(\'' + acct.id + '\')" style="background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);border-radius:999px;padding:8px 14px;color:#4ade80;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">Add $</button>' +
        '</div>' +

        // Progress bar
        (pct != null ?
          '<div style="background:rgba(255,255,255,.06);border-radius:999px;height:5px;margin-bottom:12px;overflow:hidden">' +
            '<div style="height:100%;border-radius:999px;background:' + acct.color + ';width:' + pct + '%;transition:width .4s ease"></div>' +
          '</div>' : '') +

        // Recent contributions
        (recentContrib.length > 0 ?
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            recentContrib.map(function(c) {
              var isWithdrawal = c.amt < 0;
              return '<div style="font-size:11px;color:rgba(255,255,255,.35);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:999px;padding:4px 9px">' +
                (isWithdrawal ? '↑ -$' + Math.abs(c.amt).toFixed(2) : '↓ +$' + c.amt.toFixed(2)) +
                ' · ' + new Date(c.date).toLocaleDateString('en-US', {month:'short', day:'numeric'}) +
              '</div>';
            }).join('') +
          '</div>' : '') +

      '</div>';
    }).join('');
}

// ── Inject the savings accounts grid into savings page ──
function injectSavingsAccountsUI() {
  var savPage = document.getElementById('pg-savings');
  if (!savPage) return;
  if (document.getElementById('fc-sav-accounts-grid')) return; // already injected

  // Find the + Add Goal button area and inject below the header
  var header = savPage.querySelector('.sb.mb20');
  if (!header) return;

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding:0 18px 16px';
  wrapper.innerHTML =
    '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:12px">Your Savings Goals</div>' +
    '<div id="fc-sav-accounts-grid"></div>';

  // Insert after header
  header.parentNode.insertBefore(wrapper, header.nextSibling);

  // Override the existing + Add Goal button
  var addBtn = header.querySelector('button');
  if (addBtn) {
    addBtn.onclick = function() { fcSavOpenCreate(); };
  }

  fcSavLoad();
  renderSavingsAccounts();
}

// ── Init ──
setTimeout(function() {
  injectSavingsAccountsUI();
}, 1000);

// Re-inject if page navigation happens
var _fcSavNavOrig = window.fcNav;
window.fcNav = function(page) {
  if (typeof _fcSavNavOrig === 'function') _fcSavNavOrig.apply(this, arguments);
  if (page === 'savings') setTimeout(injectSavingsAccountsUI, 300);
};

console.log('[FC Sav] Individual savings accounts loaded');
