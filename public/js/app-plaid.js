// ══════════════════════════════════════════════════════════════════
//  FLOWCHECK PLAID INTEGRATION — Production Ready
//  Client ID:  69c9f0f36a5815000d286279
//  Env:        Production (Limited) + Sandbox fallback
// ══════════════════════════════════════════════════════════════════

var FC_PLAID = {
  CLIENT_ID:  '69c9f0f36a5815000d286279',
  // Production secret lives on YOUR SERVER — never hardcode in client JS
  // Sandbox for testing (safe to have in client for sandbox only)
  // SANDBOX_SECRET removed — never expose secrets in client code
  ENV: 'production',  // 'sandbox' for testing
  BACKEND_URL: 'https://getflowcheck.app', // Always hardcoded — never overridden from storage
};

// ── Plaid state ──
var plaidLinkedAccounts = [];
var plaidHandler = null;

function sanitizePlaidAccount(acct) {
  if (!acct) return acct;
  var clean = Object.assign({}, acct);
  delete clean.accessToken;
  delete clean.publicToken;
  return clean;
}

function hasLinkedPlaidItem() {
  return Array.isArray(plaidLinkedAccounts) && plaidLinkedAccounts.some(function(acct) {
    return !!(acct && (acct.itemId || acct.accessToken) && !acct.needsRelink);
  });
}

function getPrimaryPlaidItemId() {
  if (!Array.isArray(plaidLinkedAccounts)) return null;
  for (var i = plaidLinkedAccounts.length - 1; i >= 0; i--) {
    if (plaidLinkedAccounts[i] && plaidLinkedAccounts[i].itemId && !plaidLinkedAccounts[i].needsRelink) {
      return plaidLinkedAccounts[i].itemId;
    }
  }
  return null;
}

function getActivePlaidItemIds() {
  if (!Array.isArray(plaidLinkedAccounts)) return [];
  return plaidLinkedAccounts
    .filter(function(acct) { return !!(acct && acct.itemId && !acct.needsRelink); })
    .map(function(acct) { return acct.itemId; });
}

function getPlaidLinkedItem(itemId) {
  if (!itemId || !Array.isArray(plaidLinkedAccounts)) return null;
  for (var i = 0; i < plaidLinkedAccounts.length; i++) {
    if (plaidLinkedAccounts[i] && plaidLinkedAccounts[i].itemId === itemId) return plaidLinkedAccounts[i];
  }
  return null;
}

function migrateLegacyPlaidTokens() {
  var fbUser = requireSignedInForPlaid();
  if (!fbUser || !Array.isArray(plaidLinkedAccounts) || !plaidLinkedAccounts.length) return Promise.resolve(false);

  var pending = plaidLinkedAccounts.filter(function(acct) {
    return acct && acct.itemId && acct.accessToken;
  });
  if (!pending.length) return Promise.resolve(false);

  return Promise.all(pending.map(function(acct) {
    return plaidAuthFetch('/api/migrate-plaid-item', {
      method: 'POST',
      body: JSON.stringify({
        item_id: acct.itemId,
        access_token: acct.accessToken,
        institution: {
          name: acct.institutionName || 'Bank',
          institution_id: acct.institutionId || ''
        },
        accounts: acct.accounts || [],
        connected_at: acct.connectedAt || null
      })
    })
    .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
    .then(function(result) {
      if (!result.ok) throw new Error(result.data && result.data.error || 'Migration failed');
      acct.accessToken = null;
      acct.needsRelink = false;
      return true;
    });
  })).then(function() {
    plaidLinkedAccounts = plaidLinkedAccounts.map(sanitizePlaidAccount);
    savePlaidState();
    if (typeof savePlaidConfig === 'function') savePlaidConfig();
    return true;
  }).catch(function(err) {
    console.warn('[Plaid] Legacy token migration failed:', err.message || err);
    return false;
  });
}

// ── Load saved state ──
(function initPlaid() {
  try {
    var saved = localStorage.getItem('fc-plaid-v2');
    if (saved) {
      var d = JSON.parse(saved);
      plaidLinkedAccounts = d.accounts || [];
      // Always use hardcoded production URL — never restore stale saved URL
      // if (d.backendUrl) FC_PLAID.BACKEND_URL = d.backendUrl;
      FC_PLAID.ENV = d.env || 'production';
      var urlEl = document.getElementById('plaid-backend-url');
      if (urlEl) urlEl.value = FC_PLAID.BACKEND_URL;

      if (plaidLinkedAccounts.length > 0) {
        var hasLinkedItem = hasLinkedPlaidItem();
        var lastSync = d.lastSync ? new Date(d.lastSync) : null;
        var minsSince = lastSync ? (Date.now() - lastSync.getTime()) / 60000 : 9999;

        if (!hasLinkedItem) {
          // No token — accounts need relinking, show warning
          console.warn('[Plaid] No linked item found — accounts may need relinking');
          setTimeout(function() {
            if (typeof toast === 'function') toast('Please re-link your bank account to sync transactions', 'amb');
          }, 2000);
        } else if (minsSince > 240) {
          // Token exists, >4hrs — background sync
          setTimeout(function() {
            console.log('[Plaid] Auto-sync (' + Math.round(minsSince/60) + 'h since last)');
            fetchPlaidTransactions();
          }, 2500);
        } else if (minsSince > 30) {
          // 30min-4hr — silent background refresh
          setTimeout(function() {
            console.log('[Plaid] Silent refresh (' + Math.round(minsSince) + 'min since last)');
            fetchPlaidTransactionsSilent();
          }, 4000);
        } else {
          // <30min — use cached, just re-render
          console.log('[Plaid] Using cache (' + Math.round(minsSince) + 'min ago)');
          setTimeout(function() {
            if (typeof rDash === 'function') rDash();
            if (typeof renderTxnPage === 'function') renderTxnPage();
          }, 600);
        }
        if (plaidLinkedAccounts.some(function(a) { return !!(a && a.accessToken); })) {
          setTimeout(function() {
            migrateLegacyPlaidTokens();
          }, 1200);
        }
      }
    }
  } catch(e) { console.error('[Plaid] initPlaid error:', e); }
  rPlaid();
})();

function savePlaidState() {
  try {
    var accountsToSave = Array.isArray(plaidLinkedAccounts)
      ? plaidLinkedAccounts.map(sanitizePlaidAccount)
      : [];
    localStorage.setItem('fc-plaid-v2', JSON.stringify({
      accounts: accountsToSave,
      // backendUrl intentionally not saved — always use hardcoded URL
      env: FC_PLAID.ENV,
      lastSync: new Date().toISOString()
    }));
  } catch(e) { console.error('[Plaid] savePlaidState failed:', e); }
}

function sameInstitution(a, b) {
  if (!a || !b) return false;
  var idA = String(a.institutionId || '').trim();
  var idB = String(b.institutionId || '').trim();
  if (idA && idB && idA === idB) return true;
  var nameA = String(a.institutionName || '').trim().toLowerCase();
  var nameB = String(b.institutionName || '').trim().toLowerCase();
  return !!(nameA && nameB && nameA === nameB);
}

function sameAnyAccount(a, b) {
  var aAccounts = Array.isArray(a && a.accounts) ? a.accounts : [];
  var bAccounts = Array.isArray(b && b.accounts) ? b.accounts : [];
  if (!aAccounts.length || !bAccounts.length) return false;
  for (var i = 0; i < aAccounts.length; i++) {
    for (var j = 0; j < bAccounts.length; j++) {
      if (aAccounts[i] && bAccounts[j] && aAccounts[i].id && bAccounts[j].id && aAccounts[i].id === bAccounts[j].id) {
        return true;
      }
    }
  }
  return false;
}

function upsertLinkedPlaidItem(linkedItem) {
  if (!linkedItem) return;
  if (!Array.isArray(plaidLinkedAccounts)) plaidLinkedAccounts = [];
  plaidLinkedAccounts = plaidLinkedAccounts.filter(function(existing) {
    if (!existing) return false;
    if (linkedItem.itemId && existing.itemId === linkedItem.itemId) return false;
    if (sameInstitution(existing, linkedItem)) return false;
    if (sameAnyAccount(existing, linkedItem)) return false;
    return true;
  });
  plaidLinkedAccounts.push(linkedItem);
}

// ── Render Plaid page ──
function rPlaid() {
  var connected = plaidLinkedAccounts.length > 0;

  // Hero status
  var heroStatus = document.getElementById('plaid-hero-status');
  var needsRelink = connected && plaidLinkedAccounts.some(function(a) { return a.needsRelink || !a.itemId; });
  if (heroStatus) {
    if (!connected) heroStatus.textContent = 'No accounts connected';
    else if (needsRelink) heroStatus.textContent = 'Account needs relinking';
    else heroStatus.textContent = plaidLinkedAccounts.length + ' account' + (plaidLinkedAccounts.length > 1 ? 's' : '') + ' connected';
  }
  // Show relink warning if needed
  var relinkWarn = document.getElementById('plaid-relink-warn');
  if (relinkWarn) relinkWarn.style.display = needsRelink ? 'block' : 'none';

  // Live badge
  var badge = document.getElementById('plaid-live-badge');
  if (badge) badge.style.display = connected ? 'block' : 'none';

  // Linked accounts section
  var acctList = document.getElementById('plaid-accounts-list');
  if (acctList) acctList.style.display = connected ? 'block' : 'none';

  // Sync info
  var syncInfo = document.getElementById('plaid-sync-info');
  if (syncInfo) syncInfo.style.display = connected ? 'block' : 'none';

  // Settings plaid status
  var settingsStatus = document.getElementById('settings-plaid-status');
  if (settingsStatus) settingsStatus.textContent = connected
    ? plaidLinkedAccounts.length + ' account' + (plaidLinkedAccounts.length > 1 ? 's' : '') + ' linked'
    : 'No accounts linked';

  // Settings live badge
  var settingsBadge = document.getElementById('plaid-sync-badge');
  if (settingsBadge) settingsBadge.style.display = connected ? 'block' : 'none';

  // Render account rows
  var wrap = document.getElementById('plaid-accounts-wrap');
  if (wrap && connected) {
    wrap.innerHTML = plaidLinkedAccounts.map(function(acct, i) {
      var isLast = i === plaidLinkedAccounts.length - 1;
      return '<div style="display:flex;align-items:center;gap:13px;padding:14px 16px;' + (!isLast ? 'border-bottom:1px solid rgba(255,255,255,.04);' : '') + '">' +
        '<div style="width:40px;height:40px;background:rgba(245,166,35,.08);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#F5A623"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 10V18M10 10V18M14 10V18M18 10V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 4l9 4H3l9-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14.5px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (acct.institutionName || 'Bank') + '</div>' +
          '<div style="font-size:11.5px;color:var(--t3);margin-top:2px">' + (acct.accounts ? acct.accounts.length + ' account' + (acct.accounts.length > 1 ? 's' : '') : 'Linked') + '</div>' +
        '</div>' +
        '<button onclick="disconnectPlaidItem(' + i + ')" style="background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.2);color:#ff5252;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">Disconnect</button>' +
      '</div>';
    }).join('');
  }

  // Last sync
  try {
    var saved = localStorage.getItem('fc-plaid-v2');
    if (saved) {
      var d = JSON.parse(saved);
      if (d.lastSync) {
        var syncEl = document.getElementById('plaid-last-sync');
        if (syncEl) {
          var dt = new Date(d.lastSync);
          syncEl.textContent = dt.toLocaleDateString('en-US', {month:'short', day:'numeric'}) + ' at ' + dt.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
        }
      }
    }
  } catch(e) {}

  // Dashboard accounts section
  rDashAccounts();
}

// ── LAUNCH PLAID LINK ──
function launchPlaid(type) {
  try { window._fcPlaidRequestedType = type || window._fcPlaidRequestedType || 'checking'; } catch (e) {}
  try { if (typeof FCTrack === 'function') FCTrack('plaid_link_started', { requestedType: type || 'checking' }); } catch (e) {}
  if (!requireSignedInForPlaid()) {
    try {
      if (typeof obShowOverlay === 'function') obShowOverlay();
      if (typeof obPg === 'function') obPg('ob-signin');
      else if (typeof openAuth === 'function') openAuth('signin');
    } catch (e) {}
    return;
  }
  if (typeof toast === 'function') toast('Opening Plaid…');
  if (!FC_PLAID.BACKEND_URL) FC_PLAID.BACKEND_URL = 'https://getflowcheck.app';
  getLinkToken(type);
}

if (typeof window !== 'undefined') {
  window.__fcRealLaunchPlaid = launchPlaid;
}

function plaidBackendOrigin() {
  return (FC_PLAID && FC_PLAID.BACKEND_URL) ? FC_PLAID.BACKEND_URL : 'https://getflowcheck.app';
}

function plaidAuthFetch(path, options) {
  return authFetchWithBackendFallback(path, options, plaidBackendOrigin());
}

function plaidFetch(path, options, preferredOrigin) {
  return fetchWithBackendFallback(path, options, preferredOrigin || plaidBackendOrigin());
}

// ── Get link_token from YOUR backend ──
function getLinkToken(type) {
  if (!requireSignedInForPlaid()) return;
  var path = '/api/create-link-token';
  var url = plaidBackendOrigin().replace(/\/$/, '') + path;
  var btn = document.querySelector('#pg-plaid button[onclick="launchPlaid()"]');
  var requestedType = type || window._fcOnboardingPlaidType || window._fcPlaidRequestedType || 'checking';
  if (btn) { btn.textContent = 'Connecting…'; btn.disabled = true; }

  console.log('FlowCheck: requesting link token from', url);
  ensureFreshAuthToken(true).then(function() {
    return authFetchWithBackendFallback(path, {
      method: 'POST',
      body: JSON.stringify({ requested_type: requestedType })
    }, plaidBackendOrigin());
  })
  .then(function(r) {
    console.log('FlowCheck: link token response status', r.status);
    return r.text().then(function(text) {
      var data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { error: text || 'Invalid response from Plaid server' }; }
      if (!r.ok) {
        var err = new Error(data.error || ('HTTP ' + r.status));
        err.status = r.status;
        err.payload = data;
        throw err;
      }
      return data;
    });
  })
  .then(function(data) {
    console.log('FlowCheck: link token data', JSON.stringify(data).substring(0, 100));
    if (btn) { btn.textContent = 'Connect a Bank Account'; btn.disabled = false; }
    if (data.link_token) {
      openPlaidLink(data.link_token);
    } else {
      throw new Error(data.error || 'No link_token in response');
    }
  })
  .catch(function(err) {
    if (btn) { btn.textContent = 'Connect a Bank Account'; btn.disabled = false; }
    var message = (err && (err.message || (err.payload && err.payload.error))) || 'Unknown Plaid error';
    console.error('Plaid link token error:', message, err && err.payload ? err.payload : err);
    if (typeof toast === 'function') {
      if (err && err.status === 401) toast('Your session expired. Please sign in again, then reconnect Plaid.', 'red');
      else toast(message.indexOf('Failed to create link token') >= 0 ? 'Plaid server is not ready yet. Check backend setup.' : message, 'red');
    }
  });
}

// ── Open Plaid Link with token ──
function openPlaidLink(linkToken) {
  // If Plaid SDK loaded fine, use it immediately
  if (window.Plaid) {
    _doOpenPlaid(linkToken);
    return;
  }

  // SDK not loaded yet — inject it dynamically then open
  if (window._plaidLoading) {
    if (typeof toast === 'function') toast('Connecting to bank… tap again in a moment', 'amb');
    return;
  }

  window._plaidLoading = true;
  var s = document.createElement('script');
  s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
  s.onload = function() {
    window._plaidLoading = false;
    window._plaidFailed  = false;
    if (window.Plaid) _doOpenPlaid(linkToken);
    else if (typeof toast === 'function') toast('Bank connection unavailable. Check your internet.', 'red');
  };
  s.onerror = function() {
    window._plaidLoading = false;
    window._plaidFailed  = true;
    if (typeof toast === 'function') toast('Bank connection unavailable. Check your internet connection.', 'red');
  };
  document.head.appendChild(s);
}

function _doOpenPlaid(linkToken) {
  if (!window.Plaid) {
    if (typeof toast === 'function') toast('Bank connection unavailable. Check your internet connection.', 'red');
    return;
  }
  if (!linkToken || typeof linkToken !== 'string') {
    console.warn('[Plaid] Missing or invalid link token');
    if (typeof toast === 'function') toast('Could not start bank connection. Please try again.', 'red');
    return;
  }
  try {
    if (window._plaidHandler) {
      try { window._plaidHandler.destroy(); } catch(e) {}
    }
    window._plaidHandler = window.Plaid.create({
      token: linkToken,
      onSuccess: function(publicToken, metadata) {
        if (typeof handlePlaidSuccess === 'function') handlePlaidSuccess(publicToken, metadata);
      },
      onExit: function(err) {
        if (err) console.warn('[Plaid] exit with error:', err.display_message || err.error_code);
      },
      onEvent: function(eventName) {}
    });
    window._plaidHandler.open();
  } catch(e) {
    if (typeof toast === 'function') toast('Could not open bank connection: ' + (e.message||''), 'red');
  }
}
function handlePlaidSuccess(publicToken, metadata) {
  var inst = metadata.institution || {};
  var accounts = (metadata.accounts || []).map(function(a) {
    return { id: a.id, name: a.name, type: a.type, subtype: a.subtype, mask: a.mask, balance: null };
  });

  // Exchange public token on your backend
  if (FC_PLAID.BACKEND_URL) {
    exchangePublicToken(publicToken, inst, accounts);
  } else {
    // Store minimal info for demo
    upsertLinkedPlaidItem({
      institutionName: inst.name || 'Bank',
      institutionId: inst.institution_id,
      publicToken: publicToken, // In production: exchange this server-side ONLY
      accounts: accounts,
      connectedAt: new Date().toISOString()
    });
    savePlaidState();
    rPlaid();
    try {
      if (typeof obMarkLinked === 'function') obMarkLinked((window._fcOnboardingPlaidType || window._fcPlaidRequestedType || 'checking') === 'credit' ? 'credit' : 'checking');
    } catch (e) {}
    if (typeof toast === 'function') toast('✓ ' + (inst.name || 'Bank') + ' connected!');
    fetchPlaidTransactions();
  }
}

// ── Exchange public token (server-side) ──
function exchangePublicToken(publicToken, inst, accounts) {
  if (!requireSignedInForPlaid()) return;
  console.log('[Plaid] Exchanging token, backend:', plaidBackendOrigin());
  console.log('[Plaid] Institution:', inst.name);
  if (typeof toast === 'function') toast('Linking ' + (inst.name || 'bank') + '...');

  plaidAuthFetch('/api/exchange-token', {
    method: 'POST',
    body: JSON.stringify({ public_token: publicToken, institution: inst, accounts: accounts })
  })
  .then(function(r) {
    console.log('[Plaid] Exchange response status:', r.status);
    return r.json();
  })
  .then(function(data) {
    console.log('[Plaid] Exchange response:', JSON.stringify(data).substring(0,100));
    if (!data.item_id) throw new Error(data.error || 'No item_id in response');

    var linkedItem = {
      institutionName: inst.name || 'Bank',
      institutionId:   inst.institution_id || '',
      itemId:          data.item_id || '',
      accounts:        accounts,
      connectedAt:     new Date().toISOString()
    };
    upsertLinkedPlaidItem(linkedItem);
    savePlaidState();
    // Mirror non-secret account metadata to legacy plaidConfig while preserving compatibility.
    if (typeof plaidConfig !== 'undefined') {
      if (!plaidConfig.linkedItems) plaidConfig.linkedItems = [];
      plaidConfig.linkedItems = plaidConfig.linkedItems.filter(function(existing) {
        if (!existing) return false;
        if (data.item_id && existing.itemId === data.item_id) return false;
        if (sameInstitution(existing, linkedItem)) return false;
        if (sameAnyAccount(existing, linkedItem)) return false;
        return true;
      });
      plaidConfig.linkedItems.push({ itemId: data.item_id, institutionName: inst.name || 'Bank', institutionId: inst.institution_id || '', accounts: accounts });
      if (typeof savePlaidConfig === 'function') savePlaidConfig();
    }
    rPlaid();
    try {
      var requestedType = window._fcOnboardingPlaidType || window._fcPlaidRequestedType || '';
      var accountLooksChecking = (accounts || []).some(function(a) {
        var type = String((a && a.type) || '').toLowerCase();
        var subtype = String((a && a.subtype) || '').toLowerCase();
        return type === 'depository' || subtype.indexOf('checking') > -1;
      });
      if (typeof obMarkLinked === 'function') obMarkLinked((requestedType === 'credit' && !accountLooksChecking) ? 'credit' : 'checking');
    } catch (e) {}
    if (typeof haptic === 'function') haptic('heavy');
    try { if (typeof FCTrack === 'function') FCTrack('plaid_link_succeeded', { institution: inst.name || 'Bank', accountCount: (accounts || []).length }); } catch (e) {}
    if (typeof toast === 'function') toast('\u2713 ' + (inst.name || 'Bank') + ' connected!');
    // Auto-fetch liabilities in background
    _triggerLiabilitySync();
    fetchPlaidTransactions(data.item_id);
  })
  .catch(function(err) {
    console.error('[Plaid] Exchange error:', err.message || err);
    try { if (typeof FCTrack === 'function') FCTrack('plaid_link_failed', { institution: inst && inst.name ? inst.name : '', code: err.message || 'unknown' }); } catch (e) {}
    if (typeof toast === 'function') toast('Failed to link bank: ' + (err.message || 'Unknown error'), 'red');
  });
}

// ══════════════════════════════════════════════════════════════
// PLAID LIABILITIES — Automated debt tracking
// ══════════════════════════════════════════════════════════════

var _plaidLastLiabilitySync = null;
var _plaidLiabilitySyncError = null;
var FC_MANUAL_DEBT_ONLY = true;

function fetchPlaidLiabilities(silent) {
  if (FC_MANUAL_DEBT_ONLY) {
    _plaidLiabilitySyncError = null;
    _plaidLastLiabilitySync = null;
    _renderDebtSyncStatus();
    if (!silent && typeof toast === 'function') toast('Manual debt tracking is on for now', 'amb');
    return Promise.resolve(false);
  }
  var itemIds = getActivePlaidItemIds();
  if (!itemIds.length) {
    if (!silent && typeof toast === 'function') toast('Connect a bank account first', 'amb');
    return;
  }
  if (!silent && typeof toast === 'function') toast('Syncing debts…', 'amb');

  Promise.allSettled(itemIds.map(function(itemId) {
    return plaidAuthFetch('/api/liabilities', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || data.error) throw new Error((data && (data.message || data.error)) || 'Unknown error');
      return data.liabilities || data;
    });
  }))
  .then(function(results) {
    var combined = { credit: [], student: [], mortgage: [], other: [] };
    var hadSuccess = false;
    var firstError = '';

    results.forEach(function(result, index) {
      if (result.status !== 'fulfilled') {
        var reason = result.reason;
        var message = (reason && reason.message) || 'Unknown error';
        if (!firstError) firstError = message;
        if (message.indexOf('ITEM_LOGIN_REQUIRED') > -1) {
          var expiredId = itemIds[index];
          plaidLinkedAccounts = plaidLinkedAccounts.map(function(a) {
            if (a && a.itemId === expiredId) return Object.assign({}, a, { needsRelink: true });
            return a;
          });
          savePlaidState();
        }
        return;
      }

      hadSuccess = true;
      var liabilities = result.value || {};
      combined.credit = combined.credit.concat(liabilities.credit || []);
      combined.student = combined.student.concat(liabilities.student || []);
      combined.mortgage = combined.mortgage.concat(liabilities.mortgage || []);
      combined.other = combined.other.concat(liabilities.other || liabilities.personal || []);
    });

    if (!hadSuccess) {
      _plaidLiabilitySyncError = firstError || 'Network error';
      _renderDebtSyncStatus();
      if (!silent && typeof toast === 'function') toast('Debt sync failed — check connection', 'red');
      return;
    }

    _plaidLiabilitySyncError = null;
    _plaidLastLiabilitySync = new Date().toISOString();
    _mergePlaidDebts(combined);
    if (!silent && typeof toast === 'function') toast('Debts synced ✓', 'grn');
    if (typeof rDbt === 'function') rDbt();
    if (typeof rDash === 'function') setTimeout(rDash, 100);
    _renderDebtSyncStatus();
  })
  .catch(function(err) {
    _plaidLiabilitySyncError = err.message || 'Network error';
    _renderDebtSyncStatus();
    if (!silent && typeof toast === 'function') toast('Debt sync failed — check connection', 'red');
  });
}

if (typeof window !== 'undefined') {
  window.__fcRealFetchPlaidLiabilities = fetchPlaidLiabilities;
}

function _getPlaidUserId() {
  try {
    var fb = JSON.parse(localStorage.getItem('fc-fb-user') || 'null');
    if (fb && fb.uid) return fb.uid;
  } catch(e) {}
  return 'fc_user_' + (localStorage.getItem('fc-anon-id') || (function(){
    var id = 'anon_' + Date.now();
    localStorage.setItem('fc-anon-id', id);
    return id;
  })());
}

function _mergePlaidDebts(liabilities) {
  // liabilities can be: { credit: [], student: [], mortgage: [], other: [] }
  // or a flat array
  var items = [];

  function pushItem(item, category) {
    var name     = item.name || item.account_name || item.official_name || category;
    var balance  = item.balances ? (item.balances.current || 0) : (item.current_balance || item.balance || 0);
    var apr      = 0;
    // APR from interest_rate or apr_percentage or apr_type
    if (item.aprs && item.aprs.length > 0) {
      var purchaseApr = item.aprs.find(function(a){ return a.apr_type === 'purchase_apr' || a.apr_type === 'interest_charge_billed_apr'; });
      apr = purchaseApr ? purchaseApr.apr_percentage : (item.aprs[0].apr_percentage || 0);
    } else if (item.interest_rate) {
      apr = item.interest_rate;
    }
    var minPay   = item.minimum_payment_amount || item.minimum_monthly_payment_amount || 0;
    var dueDate  = item.next_payment_due_date || item.due_date || null;
    var accountId = item.account_id || item.id || (name + '_' + balance);

    items.push({
      plaidAccountId: accountId,
      name:    name,
      bal:     Math.abs(balance),
      apr:     Math.round(apr * 100) / 100,
      min:     Math.round(minPay * 100) / 100,
      dueDate: dueDate,
      cat:     category,
      src:     'plaid',
      paid:    0,
    });
  }

  if (Array.isArray(liabilities)) {
    liabilities.forEach(function(item) { pushItem(item, item.type || 'Credit Card'); });
  } else {
    (liabilities.credit   || []).forEach(function(i){ pushItem(i, 'Credit Card');   });
    (liabilities.student  || []).forEach(function(i){ pushItem(i, 'Student Loan');  });
    (liabilities.mortgage || []).forEach(function(i){ pushItem(i, 'Mortgage');      });
    (liabilities.other    || liabilities.personal || []).forEach(function(i){ pushItem(i, 'Personal Loan'); });
  }

  if (!items.length) return;

  // Merge: update existing Plaid debts, add new ones, keep manual debts
  if (typeof debts === 'undefined') window.debts = [];

  // Remove old Plaid debts that are no longer returned
  var returnedIds = items.map(function(i){ return i.plaidAccountId; });
  debts = debts.filter(function(d) {
    return d.src !== 'plaid' || returnedIds.indexOf(d.plaidAccountId) >= 0;
  });

  // Update or insert
  items.forEach(function(item) {
    var existing = debts.find(function(d){ return d.plaidAccountId === item.plaidAccountId; });
    if (existing) {
      // Update live values, preserve user-edited name if they changed it
      existing.bal     = item.bal;
      existing.min     = item.min || existing.min;
      existing.apr     = item.apr || existing.apr;
      existing.dueDate = item.dueDate || existing.dueDate;
    } else {
      item.id = typeof newId === 'function' ? newId() : Date.now() + Math.random();
      debts.push(item);
    }
  });

  if (typeof persist === 'function') persist();
}

function _renderDebtSyncStatus() {
  var el = document.getElementById('debt-sync-status');
  if (!el) return;
  if (FC_MANUAL_DEBT_ONLY) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  if (_plaidLiabilitySyncError) {
    var raw = String(_plaidLiabilitySyncError || '').toLowerCase();
    var title = 'Debt sync needs attention';
    var copy = 'FlowCheck could not refresh liability details right now.';
    var action = 'Retry';
    var actionJs = 'fetchPlaidLiabilities(false)';
    if (raw.indexOf('product_liabilities') >= 0 || raw.indexOf('liabilities') >= 0 || raw.indexOf('consent') >= 0) {
      title = 'Debt details need a quick relink';
      copy = 'This bank connection is not sharing liability details yet.';
      action = 'Relink debt account';
      actionJs = "launchPlaid('credit')";
    } else if (raw.indexOf('item_login_required') >= 0 || raw.indexOf('reauth') >= 0) {
      title = 'Your debt connection needs to be refreshed';
      copy = 'A quick reconnect should bring balances and minimums back in.';
      action = 'Reconnect';
      actionJs = "launchPlaid('credit')";
    }
    el.innerHTML =
      '<div class="debt-sync-pill" style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px;border-radius:999px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.14);color:rgba(255,255,255,.72)">' +
        '<span style="display:flex;align-items:center;gap:8px">' +
          '<span style="width:8px;height:8px;border-radius:999px;background:#F5A623;flex-shrink:0"></span>' +
          '<span><strong style="font-size:11px;color:inherit">' + title + '.</strong> <span style="font-size:11px;color:inherit">' + copy + '</span></span>' +
        '</span>' +
        '<button onclick="' + actionJs + '" style="background:none;border:none;color:#F5A623;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;padding:0 4px">' + action + '</button>' +
      '</div>';
    el.style.display = 'block';
  } else if (_plaidLastLiabilitySync) {
    var d = new Date(_plaidLastLiabilitySync);
    el.innerHTML = '<span style="color:rgba(255,255,255,.35)">Last synced: ' +
      d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + '</span>' +
      ' <button onclick="fetchPlaidLiabilities(false)" style="background:none;border:none;color:#F5A623;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;padding:0 4px">↻</button>';
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// ── Fetch transactions from backend ──
// ── Core transaction importer (shared by fetch + silent) ──
// Auto-fetch liabilities after successful Plaid link
function _triggerLiabilitySync() {
  if (FC_MANUAL_DEBT_ONLY) return;
  setTimeout(function() {
    if (typeof fetchPlaidLiabilities === 'function') fetchPlaidLiabilities(true);
  }, 2000);
}

function plaidEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getLinkedPlaidAccountMeta(linkedItem, accountId) {
  var accounts = linkedItem && Array.isArray(linkedItem.accounts) ? linkedItem.accounts : [];
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i] && accounts[i].id === accountId) return accounts[i];
  }
  return null;
}

function getPlaidAccountRole(acct) {
  var text = [
    String((acct && acct.type) || '').toLowerCase(),
    String((acct && acct.subtype) || '').toLowerCase(),
    String((acct && acct.name) || '').toLowerCase()
  ].join(' ');
  if (/credit|charge/.test(text) || String((acct && acct.type) || '').toLowerCase() === 'credit') return 'credit';
  if (/loan|mortgage|student|auto loan|personal loan|line of credit/.test(text) || String((acct && acct.type) || '').toLowerCase() === 'loan') return 'loan';
  if (/savings|money market|high yield|high-yield|reserve|emergency/.test(text)) return 'savings';
  if (/checking/.test(text) || String((acct && acct.type) || '').toLowerCase() === 'depository') return 'checking';
  return 'other';
}

function getPlaidAccountProfile(acct) {
  var role = getPlaidAccountRole(acct);
  if (role === 'checking') {
    return { role: role, badge: 'Daily cash', hint: 'Feeds your safe-to-spend', short: 'CH', iconBg: 'rgba(74,222,128,.12)', iconFg: '#4ade80' };
  }
  if (role === 'savings') {
    return { role: role, badge: 'Cash buffer', hint: 'Held outside daily spending', short: 'SV', iconBg: 'rgba(96,165,250,.12)', iconFg: '#60a5fa' };
  }
  if (role === 'credit') {
    return { role: role, badge: 'Card balance', hint: 'Keep payoff in view', short: 'CC', iconBg: 'rgba(245,166,35,.12)', iconFg: '#F5A623' };
  }
  if (role === 'loan') {
    return { role: role, badge: 'Debt account', hint: 'Track payoff over time', short: 'LN', iconBg: 'rgba(248,113,113,.12)', iconFg: '#f87171' };
  }
  return { role: role, badge: 'Linked account', hint: 'Available for planning insights', short: 'AC', iconBg: 'rgba(148,163,184,.12)', iconFg: '#cbd5e1' };
}

function _importPlaidTxns(transactions, silent, linkedItem) {
  if (!transactions || transactions.length === 0) return 0;
  var added = 0, updated = 0;
  transactions.forEach(function(tx) {
    var existingIdx = (logList||[]).findIndex(function(l) { return l.plaidId === tx.transaction_id; });
    var isCredit = tx.amount < 0; // Plaid: negative = money IN to account
    var txDesc = (tx.name || tx.merchant_name || '').toLowerCase();
    var accountMeta = getLinkedPlaidAccountMeta(linkedItem, tx.account_id);
    var accountText = [
      String((accountMeta && accountMeta.type) || '').toLowerCase(),
      String((accountMeta && accountMeta.subtype) || '').toLowerCase(),
      String((accountMeta && accountMeta.name) || '').toLowerCase()
    ].join(' ');

    // Smart category classification
    var rawCat = (typeof mapPlaidCategory === 'function')
      ? mapPlaidCategory(tx.personal_finance_category || tx.category)
      : 'Other';

    // Refund detection
    if (/refund|reversal|credit adjustment/i.test(txDesc)) {
      rawCat = 'Refund';
    } else if ((/credit|loan|mortgage|card/.test(accountText) && /payment|autopay|thank you|ach|online payment|internet payment/.test(txDesc)) ||
               /credit card payment|card payment|loan payment|mortgage payment|payment thank you|thank you payment/.test(txDesc)) {
      rawCat = 'Debt Payment';
    } else if (/^(transfer (from|to)|account transfer|internal transfer)/i.test(txDesc) ||
               /^(zelle from|zelle to|venmo|cashapp)/i.test(txDesc) ||
               (/savings|money market|reserve/.test(accountText) && /deposit|withdrawal|transfer/.test(txDesc))) {
      rawCat = 'Transfer';
    } else if (isCredit ||
               /payroll|payday|early pay|direct deposit|ach deposit|salary|wages|employer/i.test(txDesc) ||
               /interest (earned|paid)|dividend|tax refund|government/i.test(txDesc)) {
      rawCat = 'Income';
    }

    // Tag with account identifiers for cleanup when account is disconnected
    var _linkedAcct = linkedItem || null;
    var entry = {
      id:            existingIdx >= 0 ? logList[existingIdx].id : ('plaid_' + tx.transaction_id),
      plaidId:       tx.transaction_id,
      desc:          tx.name || tx.merchant_name || 'Transaction',
      amt:           Math.abs(tx.amount),
      cat:           rawCat,
      date:          tx.date,
      src:           'plaid',
      isCredit:      isCredit,
      pending:       tx.pending || false,
      itemId:        (_linkedAcct && _linkedAcct.itemId) || null,
      institutionId: (_linkedAcct && _linkedAcct.institutionId) || null,
      institutionName: (_linkedAcct && _linkedAcct.institutionName) || null,
      plaidAccountId: tx.account_id || (accountMeta && accountMeta.id) || null,
      plaidAccountType: (accountMeta && accountMeta.type) || null,
      plaidAccountSubtype: (accountMeta && accountMeta.subtype) || null,
      accountName: (accountMeta && accountMeta.name) || null,
      accountMask: (accountMeta && accountMeta.mask) || null
    };

    if (existingIdx >= 0) {
      var existing = logList[existingIdx] || {};
      var shouldReplace = !!(existing.pending && !tx.pending);
      var metaChanged =
        existing.cat !== entry.cat ||
        existing.itemId !== entry.itemId ||
        existing.institutionName !== entry.institutionName ||
        existing.plaidAccountId !== entry.plaidAccountId ||
        existing.plaidAccountType !== entry.plaidAccountType ||
        existing.plaidAccountSubtype !== entry.plaidAccountSubtype ||
        existing.accountName !== entry.accountName;
      if (shouldReplace || metaChanged) {
        logList[existingIdx] = Object.assign({}, existing, entry);
        updated++;
      }
    } else {
      if (typeof logList !== 'undefined') {
        logList.unshift(entry);
        added++;
      }
    }
  });

  if (added > 0 || updated > 0) {
    if (typeof persist === 'function') persist();
    if (typeof rLog === 'function') rLog();
    if (typeof renderTxnPage === 'function') renderTxnPage();
    if (typeof rDash === 'function') rDash();
    if (typeof primeTxnEnrichment === 'function') {
      setTimeout(function() { primeTxnEnrichment(true); }, silent ? 600 : 1200);
    }
    if (!silent && typeof toast === 'function') {
      var msg = added > 0 ? '✓ ' + added + ' new transaction' + (added !== 1 ? 's' : '') : '';
      if (updated > 0) msg += (msg ? ', ' : '✓ ') + updated + ' updated';
      toast(msg + ' loaded!');
    }
    // Update lastSync
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('fc-plaid-v2') || '{}'); } catch(e) {}
    saved.lastSync = new Date().toISOString();
    try { localStorage.setItem('fc-plaid-v2', JSON.stringify(saved)); } catch(e) {}
  }
  return added + updated;
}

function fetchPlaidTransactions(itemIdOverride, options) {
  var opts = options || {};
  var activeItemIds = getActivePlaidItemIds();
  var itemId = itemIdOverride || activeItemIds[0];
  var syncEl = document.getElementById('plaid-sync-status');

  if (!itemId) {
    console.warn('[Plaid] No linked item — need to relink');
    if (!opts.silent && typeof toast === 'function') toast('Re-link your bank to sync transactions', 'amb');
    return Promise.resolve(0);
  }
  if (!FC_PLAID.BACKEND_URL) {
    console.warn('[Plaid] No backend URL');
    return Promise.resolve(0);
  }

  if (!itemIdOverride && activeItemIds.length > 1 && !opts._multiPass) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (typeof showSync === 'function') showSync('No internet — using cached data', 'error');
      return Promise.resolve(0);
    }
    if (syncEl) syncEl.textContent = 'Syncing…';
    return Promise.all(activeItemIds.map(function(id) {
      return fetchPlaidTransactions(id, {
        _multiPass: true,
        silent: true,
        suppressSuccessUI: true,
        suppressErrorUI: true
      });
    }))
    .then(function(results) {
      var total = results.reduce(function(sum, count) { return sum + (count || 0); }, 0);
      if (syncEl) syncEl.textContent = total > 0 ? '✓ Synced' : 'Up to date';
      if (typeof showSync === 'function') {
        showSync(total > 0 ? total + ' transaction' + (total === 1 ? '' : 's') + ' imported' : 'Already up to date', 'success');
      }
      rPlaid();
      if (typeof rDash === 'function') rDash();
      if (typeof persist === 'function') persist();
      return total;
    })
    .catch(function(err) {
      console.error('[Plaid] Multi-item sync error:', err && err.message ? err.message : err);
      if (syncEl) syncEl.textContent = 'Sync failed';
      if (typeof showSync === 'function') showSync('Sync failed — check connection', 'error');
      else if (typeof toast === 'function') toast('Sync failed', 'amb');
      return 0;
    });
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (!opts.silent && typeof showSync === 'function') showSync('No internet — using cached data', 'error');
    return Promise.resolve(0);
  }

  if (!opts.suppressSuccessUI && syncEl) syncEl.textContent = 'Syncing…';

  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var linkedItem = getPlaidLinkedItem(itemId);
  var timeoutHandle = null;

  if (!opts.silent && !opts.suppressErrorUI) {
    timeoutHandle = setTimeout(function() {
      _resetSyncBtn();
      if (typeof showSync === 'function') showSync('Sync timed out — check your connection', 'error');
      else if (typeof toast === 'function') toast('Sync timed out', 'red');
    }, 15000);
  }

  function finish() {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    _resetSyncBtn();
  }

  return plaidAuthFetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      item_id: itemId,
      start_date: start.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0]
    })
  })
  .then(function(r) {
    if (r.status === 400 || r.status === 401) {
      return r.json().then(function(d) { throw new Error('AUTH:' + (d.error || 'Invalid token')); });
    }
    return r.json();
  })
  .then(function(data) {
    finish();
    if (data.error) throw new Error(data.error);
    var suppressOnboardingToast = false;
    try { suppressOnboardingToast = !!window._fcSuppressPlaidSyncToast; } catch (e) {}
    var count = _importPlaidTxns(data.transactions, suppressOnboardingToast || opts.silent, linkedItem);
    if (!opts.suppressSuccessUI && syncEl) syncEl.textContent = count > 0 ? '✓ Synced' : 'Up to date';
    if (!suppressOnboardingToast && !opts.silent && !opts.suppressSuccessUI && typeof showSync === 'function') {
      showSync(count > 0 ? count + ' transaction' + (count === 1 ? '' : 's') + ' imported' : 'Already up to date', 'success');
    }
    try {
      if (window._fcSuppressPlaidSyncToast) {
        window._fcSuppressPlaidSyncToast = false;
        window._fcOnboardingPlaidType = null;
      }
    } catch (e) {}
    rPlaid();
    if (typeof rDash === 'function') rDash();
    if (typeof persist === 'function') persist();
    return count;
  })
  .catch(function(err) {
    var errMsg = (err && err.message) || '';
    var isNotReady = errMsg.toLowerCase().indexOf('not yet ready') > -1 ||
                     errMsg.indexOf('PRODUCT_NOT_READY') > -1;

    if (isNotReady) {
      var retryKey = '_retries_' + itemId;
      var retries = (fetchPlaidTransactions[retryKey] = (fetchPlaidTransactions[retryKey] || 0) + 1);
      if (retries <= 3) {
        var delay = retries * 12000;
        if (!opts.suppressSuccessUI && syncEl) syncEl.textContent = 'Provisioning — retry ' + retries + '/3…';
        console.log('[Plaid] Product not ready, retrying in ' + delay/1000 + 's (attempt ' + retries + ')');
        finish();
        return new Promise(function(resolve) {
          setTimeout(function() {
            fetchPlaidTransactions(itemId, opts).then(resolve).catch(function() { resolve(0); });
          }, delay);
        });
      }
      fetchPlaidTransactions[retryKey] = 0;
      finish();
      if (!opts.silent && !opts.suppressErrorUI) {
        if (!opts.suppressSuccessUI && syncEl) syncEl.textContent = 'Bank linked — transactions sync in progress';
        if (!(typeof window !== 'undefined' && window._fcSuppressPlaidSyncToast) && typeof toast === 'function') {
          toast('Bank linked! Transactions will sync within a few minutes.', 'amb');
        }
      }
      try {
        window._fcSuppressPlaidSyncToast = false;
        window._fcOnboardingPlaidType = null;
      } catch (e) {}
      return 0;
    }

    finish();
    fetchPlaidTransactions['_retries_' + itemId] = 0;
    console.error('[Plaid] Sync error:', errMsg);
    if (!opts.suppressSuccessUI && syncEl) syncEl.textContent = 'Sync failed';

    if (err.message && err.message.startsWith('AUTH:')) {
      plaidLinkedAccounts = plaidLinkedAccounts.map(function(a) {
        if (a && a.itemId === itemId) return Object.assign({}, a, { needsRelink: true });
        return a;
      });
      savePlaidState();
      if (!opts.silent && !opts.suppressErrorUI) {
        if (typeof showSync === 'function') showSync('Bank connection expired — reconnect in Settings', 'error');
        else if (typeof toast === 'function') toast('Bank connection expired — reconnect in Settings', 'red');
      }
      rPlaid();
      return 0;
    }

    if (!opts.silent && !opts.suppressErrorUI) {
      if (typeof showSync === 'function') showSync('Sync failed — check connection', 'error');
      else if (typeof toast === 'function') toast('Sync failed', 'amb');
    }

    try {
      var _fbU = JSON.parse(localStorage.getItem('fc-fb-user') || 'null');
      var _bankName = (linkedItem && linkedItem.institutionName) || '';
      if (_fbU && _fbU.email && !opts.silent) {
        authFetchWithBackendFallback('/api/email/events', {
          method: 'POST',
          body: JSON.stringify({
            event: 'sync_issue',
            data: { email: _fbU.email, name: _fbU.name || '', bankName: _bankName }
          })
        }, plaidBackendOrigin()).catch(function() {});
      }
    } catch (e) {}

    try {
      window._fcSuppressPlaidSyncToast = false;
      window._fcOnboardingPlaidType = null;
    } catch (e) {}
    return 0;
  });
}

// ── Silent background refresh (no toasts) ──
function fetchPlaidTransactionsSilent() {
  var itemIds = getActivePlaidItemIds();
  if (!itemIds.length) return;
  Promise.all(itemIds.map(function(itemId) {
    return fetchPlaidTransactions(itemId, {
      _multiPass: true,
      silent: true,
      suppressSuccessUI: true,
      suppressErrorUI: true
    }).catch(function(e) {
      console.log('[Plaid] Silent refresh failed:', e && e.message ? e.message : e);
      return 0;
    });
  })).then(function() {
    if (typeof rDash === 'function') rDash();
  });
}


// ── Sync Plaid data ──
function syncPlaidData() {
  var btn = document.getElementById('plaid-sync-btn');
  if (btn) { btn.textContent = 'Syncing…'; btn.disabled = true; btn.style.opacity = '.5'; }
  if (typeof showSync === 'function') showSync('Syncing transactions…', 'syncing');
  fetchPlaidTransactions();
}

if (typeof window !== 'undefined') {
  window.__fcRealSyncPlaidData = syncPlaidData;
}

function _resetSyncBtn() {
  var btn = document.getElementById('plaid-sync-btn');
  if (btn) { btn.textContent = 'Sync Now'; btn.disabled = false; btn.style.opacity = '1'; }
}

// ── Disconnect account ──
function disconnectPlaidItem(index) {
  var acct = plaidLinkedAccounts[index];
  if (!acct) return;
  var name = acct.institutionName || 'this account';

  if (!confirm('Disconnect ' + name + '? This will also remove all imported transactions from this account.')) return;

  // Remove transactions imported from this account
  var removed = 0;
  if (typeof logList !== 'undefined') {
    var before = logList.length;
    // Match by institutionId, itemId, or src:'plaid' if only one account
    var itemId = acct.itemId;
    var instId = acct.institutionId;
    if (itemId || instId) {
      logList = logList.filter(function(tx) {
        if (tx.src !== 'plaid') return true; // keep manual transactions
        if (itemId && tx.itemId === itemId) return false;
        if (instId && tx.institutionId === instId) return false;
        return true;
      });
    } else if (plaidLinkedAccounts.length === 1) {
      // Only one account — remove all plaid transactions
      logList = logList.filter(function(tx) { return tx.src !== 'plaid'; });
    }
    removed = before - logList.length;
  }

  function finishDisconnect() {
    plaidLinkedAccounts.splice(index, 1);
    savePlaidState();

    if(typeof persist==='function')persist();
    if(typeof rAll==='function')rAll();
    if(typeof rDash==='function')rDash();
    if(typeof rPlaid==='function')rPlaid();
    if(typeof renderTxnPage==='function')renderTxnPage();
    var msg=name+' disconnected';
    if(removed>0)msg+=' · '+removed+' transactions removed';
    if(typeof toast==='function')toast(msg,'amb');
    if(typeof haptic==='function')haptic('medium');
  }

  if (acct.itemId) {
    plaidAuthFetch('/api/disconnect-item', {
      method: 'POST',
      body: JSON.stringify({ item_id: acct.itemId })
    }).catch(function(err) {
      console.warn('[Plaid] Server disconnect failed:', err && err.message ? err.message : err);
    }).finally(finishDisconnect);
    return;
  }

  finishDisconnect();
}

// ── Native Capacitor Plaid (for real iOS build) ──
// launchPlaidNative removed — using web flow via Vercel

// launchPlaidSandboxDemo removed — always use real Plaid

function injectDemoTransactions() {
  if (typeof logList === 'undefined') return;
  var today = new Date();
  var demos = [
    { desc: 'Walmart', amt: 87.43, cat: 'Needs' },
    { desc: 'Netflix', amt: 15.99, cat: 'Wants' },
    { desc: 'Shell Gas Station', amt: 52.10, cat: 'Needs' },
    { desc: 'Spotify', amt: 9.99, cat: 'Wants' },
    { desc: 'Chipotle', amt: 14.75, cat: 'Wants' },
    { desc: 'Electric Bill', amt: 96.00, cat: 'Needs' },
    { desc: 'Amazon', amt: 38.99, cat: 'Wants' },
    { desc: 'Starbucks', amt: 6.45, cat: 'Wants' },
    { desc: 'Savings Transfer', amt: 200.00, cat: 'Savings' },
    { desc: 'Target', amt: 63.21, cat: 'Needs' },
  ];
  demos.forEach(function(d, i) {
    var date = new Date(today);
    date.setDate(today.getDate() - i * 2);
    logList.push({
      id: 'demo_' + Date.now() + '_' + i,
      desc: d.desc, amt: d.amt, cat: d.cat,
      date: date.toISOString().split('T')[0],
      src: 'plaid-demo'
    });
  });
  if (typeof persist === 'function') persist();
  if (typeof rLog === 'function') rLog();
  if (typeof renderTxnPage === 'function') renderTxnPage();
  if (typeof rDash === 'function') rDash();
  if (typeof toast === 'function') setTimeout(function() { toast('✓ 10 transactions imported!'); }, 1200);
}

// ── Dashboard accounts render ──
function rDashAccounts() {
  var wrap = document.getElementById('dash-accounts-wrap');
  var allBtn = document.getElementById('dash-accounts-see-all');
  if (!wrap) return;
  if (plaidLinkedAccounts.length === 0) {
    if (allBtn) allBtn.style.display = 'none';
    wrap.innerHTML = ''
      + '<div style="padding:18px 16px;background:linear-gradient(180deg,rgba(245,166,35,.07),rgba(255,255,255,.02));border:1px solid rgba(245,166,35,.12);border-radius:18px">'
      +   '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">'
      +     '<div style="width:42px;height:42px;background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.16);border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#F5A623"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 10V18M10 10V18M14 10V18M18 10V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 4l9 4H3l9-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>'
      +     '<div style="flex:1;text-align:left">'
      +       '<div style="font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:rgba(245,166,35,.72);margin-bottom:6px">First Step</div>'
      +       '<div style="font-size:16px;font-weight:800;color:var(--t1);letter-spacing:-.02em;margin-bottom:5px">Link your primary checking account</div>'
      +       '<div style="font-size:13px;line-height:1.5;color:var(--t3)">FlowCheck becomes dramatically more useful once it can reserve bills, spot recurring charges, and calculate a real safe-to-spend number from live activity.</div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
      +     '<div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--t3)"><span style="color:#4ade80">✓</span> Read-only connection through Plaid</div>'
      +     '<div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--t3)"><span style="color:#4ade80">✓</span> Your bank password stays with your bank</div>'
      +     '<div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--t3)"><span style="color:#4ade80">✓</span> Faster onboarding, bills, and spending insights</div>'
      +   '</div>'
      +   '<button onclick="go(\'plaid\')" style="width:100%;background:#F5A623;color:#000;border:none;border-radius:100px;padding:12px 22px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;margin-bottom:10px">Connect My Bank</button>'
      +   '<div style="font-size:11.5px;line-height:1.45;color:var(--t3);text-align:center">Best experience starts with checking. You can add cards and other accounts right after.</div>'
      + '</div>';
    return;
  }
  var rows = [];
  var hasChecking = false;
  var hasSavings = false;
  var roleOrder = { checking: 0, savings: 1, credit: 2, loan: 3, other: 4 };
  plaidLinkedAccounts.forEach(function(item) {
    (item.accounts || []).forEach(function(acct) {
      var profile = getPlaidAccountProfile(acct);
      var displayBalance = (profile.role === 'credit' || profile.role === 'loan')
        ? Math.abs(Number(acct.balance) || 0)
        : (Number(acct.balance) || 0);
      if (profile.role === 'checking') hasChecking = true;
      if (profile.role === 'savings') hasSavings = true;
      rows.push({
        role: profile.role,
        balance: Math.abs(Number(acct.balance) || 0),
        html:
          '<div style="display:flex;align-items:center;gap:12px;padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.04)">' +
            '<div style="width:38px;height:38px;background:' + profile.iconBg + ';color:' + profile.iconFg + ';border:1px solid rgba(255,255,255,.05);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;letter-spacing:.08em;flex-shrink:0">' + profile.short + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
                '<div style="font-size:13.5px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">' + plaidEscape(acct.name || profile.badge) + '</div>' +
                '<div style="font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:' + profile.iconFg + ';background:' + profile.iconBg + ';border:1px solid rgba(255,255,255,.04);border-radius:999px;padding:3px 7px">' + profile.badge + '</div>' +
              '</div>' +
              '<div style="font-size:11px;color:var(--t3);margin-top:3px">' + profile.hint + ' · ···' + plaidEscape(acct.mask || '????') + '</div>' +
            '</div>' +
            (acct.balance !== null
              ? '<div style="text-align:right;flex-shrink:0"><div style="font-size:13.5px;font-weight:800;color:var(--t1)">$' + displayBalance.toLocaleString() + '</div><div style="font-size:10px;color:var(--t3);margin-top:2px">' + (profile.role === 'credit' || profile.role === 'loan' ? 'Outstanding' : 'Available') + '</div></div>'
              : '') +
          '</div>'
      });
    });
  });
  rows.sort(function(a, b) {
    var roleDiff = (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9);
    if (roleDiff !== 0) return roleDiff;
    return b.balance - a.balance;
  });
  var visibleRows = rows.slice(0, 2);
  var hiddenCount = Math.max(0, rows.length - visibleRows.length);
  var footerCta = '';
  if (hasChecking && !hasSavings) {
    footerCta =
      '<button onclick="go(\'plaid\')" style="width:100%;background:rgba(96,165,250,.08);border:none;border-top:1px solid rgba(255,255,255,.05);padding:11px 16px;font-family:inherit;font-size:12px;font-weight:700;color:#60a5fa;cursor:pointer">Add savings next → Build a cleaner cash buffer</button>';
  } else if (!hasChecking) {
    footerCta =
      '<button onclick="go(\'plaid\')" style="width:100%;background:rgba(245,166,35,.08);border:none;border-top:1px solid rgba(255,255,255,.05);padding:11px 16px;font-family:inherit;font-size:12px;font-weight:700;color:#F5A623;cursor:pointer">Link checking next → Power safe to spend</button>';
  } else if (hiddenCount > 0) {
    footerCta =
      '<button onclick="go(\'plaid\')" style="width:100%;background:rgba(245,166,35,.08);border:none;border-top:1px solid rgba(255,255,255,.05);padding:11px 16px;font-family:inherit;font-size:12px;font-weight:700;color:#F5A623;cursor:pointer">See all ' + rows.length + ' linked accounts →</button>';
  }
  wrap.innerHTML = visibleRows.map(function(row) { return row.html; }).join('') + footerCta;
  if (allBtn) allBtn.style.display = hiddenCount > 0 ? 'inline-flex' : 'none';
}

// ── Toggle config panel ──
function togglePlaidConfig() {
  var panel = document.getElementById('plaid-config-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ── Test backend connection ──
function testPlaidBackend() {
  var url = (document.getElementById('plaid-backend-url') || {}).value || '';
  var st  = document.getElementById('plaid-backend-status');
  if (!url) { if (st) st.textContent = 'Please enter a URL first.'; return; }
  if (st) st.textContent = 'Testing…';
  plaidFetch('/api/health', {}, url.replace(/\/$/, ''))
  .then(function(r) { return r.ok ? 'OK' : 'HTTP ' + r.status; })
  .then(function(msg) { if (st) st.textContent = '✓ Connected: ' + msg; })
  .catch(function() { if (st) st.textContent = '✗ Cannot reach server — check URL or CORS'; });
}

// ── Show setup modal when no backend ──
// showPlaidSetupModal removed

// Compat aliases
function loadPlaidConfig() {
  try {
    var saved = localStorage.getItem('fc-plaid-v2');
    if (saved) {
      var d = JSON.parse(saved);
      // Always use hardcoded production URL — skip restoring stale backendUrl from storage
      plaidLinkedAccounts = d.accounts || [];
    }
  } catch(e) {}
}
