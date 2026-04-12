// ── TOKEN FIX: Replace hasCopilotAuthSignal with a token-freshness check ──
// This patches the 401 Unauthorized issue by ensuring the token is always
// refreshed before calling /api/copilot

// Override the auth check to verify token freshness
function hasCopilotAuthSignal(user) {
  user = user || getCopilotUser();
  if (!user || !user.uid) return false;
  // Must have either a fresh idToken or a refreshToken to get one
  if (user.refreshToken && String(user.refreshToken).trim()) return true;
  if (user.idToken && String(user.idToken).trim()) return true;
  return false;
}

// Override fetchCopilotCards to always refresh token first
var _origFetchCopilotCards = window.fetchCopilotCards;
window.fetchCopilotCards = function(force) {
  if (FC_COPILOT._loading) return;
  var feed = document.getElementById('copilot-feed');
  if (!feed) return;

  var fbUser = getCopilotUser();
  if (!fbUser) { feed.innerHTML = ''; return; }
  if (isCopilotLockVisible()) {
    renderCopilotAwaitingAuth('Unlock FlowCheck to load your secure briefing.');
    scheduleCopilotRetry('app is still locked');
    return;
  }

  // Check cache first (skip token refresh if we have fresh cache)
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

  // Always refresh token before calling API — this fixes the 401
  var tokenPromise = (typeof refreshAuthTokenIfNeeded === 'function')
    ? refreshAuthTokenIfNeeded(false)
    : Promise.resolve(fbUser.idToken);

  tokenPromise
    .catch(function() { return fbUser.idToken; }) // fall back to existing token
    .then(function() {
      return authFetchWithBackendFallback('/api/copilot', {
        method: 'POST',
        body: JSON.stringify(buildCopilotSnapshot())
      }, copilotBackendOrigin());
    })
    .then(function(r) {
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status);
        err.status = r.status;
        throw err;
      }
      return r.json();
    })
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
      console.warn('[copilot] fetch failed:', err && err.message ? err.message : err);
      if (err && err.status === 401) {
        // Token truly expired — schedule retry with longer delay
        scheduleCopilotRetry('token expired, will retry');
        var cached = getCachedCopilot();
        if (cached) renderCopilotFeed(cached.cards || [], cached.generatedAt, !!cached.isPremium);
        return;
      }
      var cached = getCachedCopilot();
      if (cached) renderCopilotFeed(cached.cards || [], cached.generatedAt, !!cached.isPremium);
      else renderCopilotError();
    });
};

// Also make sure the ANTHROPIC_API_KEY env var check in copilot.js works
// The key needs to be set in Vercel — remind user if still getting 401s after this fix

console.log('[FC Copilot Fix] Token refresh patch applied');
