// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK ACCOUNT DELETION CLEANUP — patch-delete-account.js
//  When a Plaid account is disconnected OR a manual account is
//  deleted, this removes all associated transactions from logList
//  and clears them from Firebase storage too.
// ═══════════════════════════════════════════════════════════════

// ── Core cleanup function ──
function fcDeleteAccountTransactions(accountId, accountName, institutionName) {
  if (!accountId && !accountName) return 0;

  var removed = 0;

  // 1. Clean logList (in-memory transaction array)
  if (typeof logList !== 'undefined' && Array.isArray(logList)) {
    var before = logList.length;
    // Match by accountId, accountName, or institution name
    logList = logList.filter(function(tx) {
      if (!tx) return false;
      // Match Plaid account_id
      if (accountId && tx.account_id && tx.account_id === accountId) return false;
      // Match account name
      if (accountName && tx.accountName && tx.accountName === accountName) return false;
      // Match institution name (catches all accounts from a disconnected bank)
      if (institutionName && tx.institution && tx.institution === institutionName) return false;
      return true;
    });
    removed = before - logList.length;
    window.logList = logList; // ensure global is updated
  }

  // 2. Clean plaidTxns cache if it exists
  if (typeof plaidTxns !== 'undefined' && Array.isArray(plaidTxns)) {
    plaidTxns = plaidTxns.filter(function(tx) {
      if (!tx) return false;
      if (accountId && tx.account_id === accountId) return false;
      if (accountName && tx.accountName === accountName) return false;
      if (institutionName && tx.institution === institutionName) return false;
      return true;
    });
    window.plaidTxns = plaidTxns;
  }

  // 3. Persist the cleaned logList to Firebase/storage
  setTimeout(function() {
    try {
      if (typeof saveLog === 'function') saveLog();
      else if (typeof persistLog === 'function') persistLog();
      else if (typeof persist === 'function') persist();
    } catch (e) {}

    // Also clear copilot cache so it regenerates without old data
    if (typeof clearCopilotCache === 'function') clearCopilotCache();

    // Re-render affected pages
    try {
      if (typeof renderSpending === 'function') renderSpending();
      if (typeof renderBudget === 'function') renderBudget();
      if (typeof renderTransactions === 'function') renderTransactions();
      if (typeof renderDashboardPulse === 'function') renderDashboardPulse();
    } catch (e) {}
  }, 200);

  return removed;
}

// ── Show confirmation before deleting ──
function fcConfirmDeleteAccount(accountId, accountName, institutionName, onConfirm) {
  // Estimate how many transactions will be removed
  var count = 0;
  if (typeof logList !== 'undefined' && Array.isArray(logList)) {
    count = logList.filter(function(tx) {
      if (!tx) return false;
      if (accountId && tx.account_id === accountId) return true;
      if (accountName && tx.accountName === accountName) return true;
      if (institutionName && tx.institution === institutionName) return true;
      return false;
    }).length;
  }

  var sheet = document.createElement('div');
  sheet.id = 'fc-del-confirm-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.7)';
  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:28px 24px 32px">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 22px"></div>' +

      // Warning icon
      '<div style="width:56px;height:56px;border-radius:16px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px">🗑️</div>' +

      '<div style="text-align:center;margin-bottom:20px">' +
        '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:8px">' +
          'Delete ' + (accountName || institutionName || 'Account') + '?' +
        '</div>' +
        '<div style="font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.55">' +
          (count > 0
            ? '<strong style="color:#f87171">' + count + ' transaction' + (count !== 1 ? 's' : '') + '</strong> linked to this account will also be permanently deleted.'
            : 'This account and its data will be permanently deleted.') +
        '</div>' +
        (count > 0 ? '<div style="font-size:12px;color:rgba(255,255,255,.3);margin-top:8px">This cannot be undone.</div>' : '') +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<button onclick="document.getElementById(\'fc-del-confirm-sheet\').remove()" style="' +
          'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);' +
          'border-radius:16px;padding:14px;color:rgba(255,255,255,.7);' +
          'font-family:inherit;font-size:14px;font-weight:700;cursor:pointer' +
        '">Cancel</button>' +
        '<button id="fc-del-confirm-btn" style="' +
          'background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);' +
          'border-radius:16px;padding:14px;color:#f87171;' +
          'font-family:inherit;font-size:14px;font-weight:800;cursor:pointer' +
        '">Delete & Remove</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(sheet);

  // Wire up confirm button
  document.getElementById('fc-del-confirm-btn').onclick = function() {
    sheet.remove();
    var removed = fcDeleteAccountTransactions(accountId, accountName, institutionName);
    if (typeof onConfirm === 'function') onConfirm();
    if (typeof haptic === 'function') haptic('medium');

    // Toast feedback
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);' +
      'background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);' +
      'border-radius:999px;padding:10px 20px;color:#f87171;' +
      'font-size:13px;font-weight:700;z-index:9999;white-space:nowrap';
    toast.textContent = '🗑️ Account deleted' + (removed > 0 ? ' · ' + removed + ' transactions removed' : '');
    document.body.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
  };

  sheet.addEventListener('click', function(e) {
    if (e.target === sheet) sheet.remove();
  });
}

// ── Patch the manual accounts delete function ──
var _origFcAcctDoDelete = window.fcAcctDoDelete;
window.fcAcctDoDelete = function(acctId, btn) {
  var acct = (typeof FC_ACCTS !== 'undefined' && FC_ACCTS.accounts)
    ? FC_ACCTS.accounts.find(function(a) { return a.id === acctId; })
    : null;

  var name = acct ? acct.name : acctId;

  fcConfirmDeleteAccount(acctId, name, null, function() {
    // Run original delete after confirmation
    if (typeof FC_ACCTS !== 'undefined') {
      FC_ACCTS.accounts = FC_ACCTS.accounts.filter(function(a) { return a.id !== acctId; });
      if (typeof fcAcctsSave === 'function') fcAcctsSave();
    }
    var sheet = btn && btn.closest('[style*="position:fixed"]');
    if (sheet) sheet.remove();
    if (typeof renderManualAccounts === 'function') renderManualAccounts();
  });
};

// ── Patch the Plaid disconnect function ──
// Hook into the existing disconnect flow
var _origDisconnectPlaid = window.disconnectPlaidItem || window.fcDisconnectPlaid;

function fcPatchedDisconnectPlaid(itemId, institutionName) {
  fcConfirmDeleteAccount(null, null, institutionName || itemId, function() {
    // Run original disconnect after confirmation + cleanup
    if (typeof _origDisconnectPlaid === 'function') {
      _origDisconnectPlaid(itemId, institutionName);
    } else {
      // Fallback: just clean transactions and re-render
      console.log('[FC Delete] Plaid item disconnected, transactions cleaned');
    }
  });
}

// Override disconnect if it exists
if (window.disconnectPlaidItem) window.disconnectPlaidItem = function(itemId, name) {
  fcPatchedDisconnectPlaid(itemId, name);
};

// ── Also patch the Disconnect button in the UI ──
// Watch for the disconnect button to appear and upgrade it
function patchDisconnectButtons() {
  var disconnectBtns = document.querySelectorAll('[onclick*="disconnect"], [onclick*="Disconnect"]');
  disconnectBtns.forEach(function(btn) {
    if (btn.dataset.fcPatched) return;
    btn.dataset.fcPatched = '1';
    var origOnclick = btn.getAttribute('onclick');
    // Extract institution name from nearest parent text
    var institutionEl = btn.closest('[style*="border-radius"]');
    var institutionName = institutionEl
      ? (institutionEl.querySelector('div')?.textContent || '').trim().substring(0, 30)
      : '';
    btn.setAttribute('onclick',
      'fcConfirmDeleteAccount(null, null, \'' + institutionName.replace(/'/g, '') + '\', function(){' + origOnclick + '})'
    );
  });
}

// Run patch when plaid page loads
setTimeout(patchDisconnectButtons, 1500);
var _fcDelNavOrig = window.fcNav;
window.fcNav = function(page) {
  if (typeof _fcDelNavOrig === 'function') _fcDelNavOrig.apply(this, arguments);
  if (page === 'plaid') setTimeout(patchDisconnectButtons, 400);
};

console.log('[FC Delete] Account deletion cleanup loaded');
