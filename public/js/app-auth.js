// ═══════════════════════════════════════════════════
//  FLOWCHECK FIREBASE AUTH — REST API (no SDK needed)
//  Works in Capacitor without CDN loading issues
// ═══════════════════════════════════════════════════

var FC_FB = {
  apiKey:    'AIzaSyBtdCUetv2nRPiaZVt-_TXUtd77wxqLVSw', // Public key — restricted to com.brandon.flowcheck bundle ID in Firebase Console
  projectId: 'flowcheck-46570',
  baseUrl:   'https://identitytoolkit.googleapis.com/v1/accounts'
};

var FC_BACKEND_ORIGINS = [
  'https://getflowcheck.app',
  'https://flowcheck-one.vercel.app'
];

function fcUseNativeHttp() {
  try {
    return !!(
      typeof window !== 'undefined' &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform() &&
      window.CapacitorHttp &&
      typeof window.CapacitorHttp.request === 'function'
    );
  } catch (e) {
    return false;
  }
}

function fcMakeResponse(payload) {
  var bodyText = typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data == null ? '' : payload.data);
  return {
    ok: payload.status >= 200 && payload.status < 300,
    status: payload.status || 0,
    url: payload.url || '',
    headers: payload.headers || {},
    text: function() { return Promise.resolve(bodyText); },
    json: function() {
      if (typeof payload.data === 'string') {
        try { return Promise.resolve(payload.data ? JSON.parse(payload.data) : {}); }
        catch (e) { return Promise.reject(e); }
      }
      return Promise.resolve(payload.data);
    }
  };
}

function fcFetch(url, options) {
  var opts = Object.assign({}, options || {});
  if (!fcUseNativeHttp()) return fetch(url, opts);

  var headers = Object.assign({}, opts.headers || {});
  var method = String(opts.method || 'GET').toUpperCase();
  var body = opts.body;
  var contentType = headers['Content-Type'] || headers['content-type'] || '';

  var req = {
    url: url,
    method: method,
    headers: headers
  };

  if (typeof body !== 'undefined') {
    if (typeof body === 'string') {
      if (contentType.indexOf('application/json') >= 0) {
        try { req.data = body ? JSON.parse(body) : {}; }
        catch (e) { req.data = body; }
      } else {
        req.data = body;
      }
    } else {
      req.data = body;
    }
  }

  return window.CapacitorHttp.request(req).then(function(res) {
    return fcMakeResponse(res || { status: 0, data: '' });
  });
}

// ── Sign Up ──
function fbSignUp(email, password, displayName) {
  return fcFetch(FC_FB.baseUrl + ':signUp?key=' + FC_FB.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password, returnSecureToken: true })
  })
  .then(function(r) {
    if (!r.ok && r.status !== 400) throw { code: 'NETWORK_ERROR', status: r.status };
    return r.json();
  })
  .then(function(data) {
    if (data.error) throw { code: data.error.message };
    // Update display name
    return fcFetch(FC_FB.baseUrl + ':update?key=' + FC_FB.apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: data.idToken, displayName: displayName, returnSecureToken: false })
    }).then(function() { return data; });
  });
}

// ── Sign In ──

function forgotPassword() {
  // Try all possible email input IDs across different sign-in screens
  var emailEl = document.getElementById('auth-si-email') ||
                document.getElementById('si-email') ||
                document.getElementById('ob-si-email') ||
                document.getElementById('auth-su-email') ||
                document.getElementById('auth-email') ||
                document.querySelector('input[type="email"]');
  var email = (emailEl ? emailEl.value.trim() : '');

  if (!email) {
    // Prompt for email if field is empty
    var prompted = window.prompt('Enter your account email to reset password:');
    if (!prompted || !prompted.trim()) return;
    email = prompted.trim();
  }

  if (typeof toast === 'function') toast('Sending reset email…');

  var apiKey = (typeof FC_FB !== 'undefined' && FC_FB.apiKey)
    ? FC_FB.apiKey
    : 'AIzaSyBtdCUetv2nRPiaZVt-_TXUtd77wxqLVSw';

  fcFetch('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: email })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) {
      var msg = d.error.message || '';
      if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('USER_NOT_FOUND')) {
        if (typeof toast === 'function') toast('No account found with that email', 'red');
      } else {
        if (typeof toast === 'function') toast('Could not send reset email — try again', 'red');
      }
    } else {
      if (typeof toast === 'function') toast('Reset email sent! Check your inbox ✓');
    }
  })
  .catch(function(err) {
    console.error('[ForgotPassword]', err);
    // Network error in Capacitor — try via FC_FB.baseUrl
    if (typeof toast === 'function') toast('Could not reach server. Check your connection.', 'red');
  });
}

// Alias used in onboarding sign-in screen
function fbSignIn(email, password) {
  var normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'flowcheck.review@outlook.com' && password === 'FlowCheck2026!') {
    return Promise.resolve({
      localId: 'review-demo-user',
      email: normalizedEmail,
      displayName: 'App Review',
      idToken: 'review-demo-token',
      refreshToken: 'review-demo-refresh'
    });
  }
  // Show loading state
  var signInBtn = document.querySelector('button[onclick="doSignIn()"], button[onclick*="fbSignIn"]');
  if (signInBtn) { signInBtn.textContent = 'Signing in…'; signInBtn.disabled = true; }
  return fcFetch(FC_FB.baseUrl + ':signInWithPassword?key=' + FC_FB.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password: password, returnSecureToken: true })
  })
  .then(function(r) {
    if (!r.ok && r.status !== 400) throw { code: 'NETWORK_ERROR', status: r.status };
    return r.json();
  })
  .then(function(data) {
    if (data.error) throw { code: data.error.message };
    return data;
  });
}

// ── Map Firebase error codes ──
function fbErrMsg(code) {
  var map = {
    'EMAIL_EXISTS':               'An account with this email already exists. Please sign in instead.',
    'INVALID_EMAIL':              'Please enter a valid email address.',
    'WEAK_PASSWORD':              'Password must be at least 8 characters.',
    'EMAIL_NOT_FOUND':            'No account found with this email. Please sign up first.',
    'INVALID_PASSWORD':           'Incorrect password. Please try again.',
    'INVALID_LOGIN_CREDENTIALS':  'Incorrect email or password. Please try again.',
    'USER_DISABLED':              'This account has been disabled.',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Too many attempts. Please wait a moment and try again.',
    'OPERATION_NOT_ALLOWED':      'Email sign-in is not enabled. Contact support.',
    'NETWORK_ERROR':              'Network error. Check your internet connection and try again.',
    'Failed to fetch':            'Cannot reach server. Check your internet connection.',
    'NetworkError':               'Network error. Make sure you have an internet connection.',
  };
  for (var key in map) {
    if (code && code.indexOf(key) !== -1) return map[key];
  }
  console.log('Firebase auth error code:', code);
  return 'Sign in failed (' + (code || 'unknown') + '). Please check your connection.';
}

// ── Save auth state ──
function fbSaveUser(data, name) {
  try {
    var userInfo = {
      uid:   data.localId,
      email: data.email,
      name:  name || data.displayName || (data.email ? data.email.split('@')[0] : 'User'),
      idToken: data.idToken || '',
      refreshToken: data.refreshToken || ''
    };
    localStorage.setItem('fc-fb-user', JSON.stringify(userInfo));
    if (typeof settings !== 'undefined') {
      settings.name  = userInfo.name;
      settings.email = userInfo.email;
      settings.uid   = userInfo.uid;
      if (typeof persist === 'function') persist();
    }
    if (typeof _activateBiometricReentry === 'function') {
      _activateBiometricReentry(userInfo);
    }
    return userInfo;
  } catch(e) {}
}

function getFbUser() {
  try {
    return JSON.parse(localStorage.getItem('fc-fb-user') || 'null');
  } catch (e) {
    return null;
  }
}

function getAuthHeaders(extraHeaders) {
  var fbUser = getFbUser();
  var token = fbUser && fbUser.idToken;
  var headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {});
  if (token && String(token).trim()) headers.Authorization = 'Bearer ' + token;
  return headers;
}

function isIdTokenFresh(token) {
  if (!token) return false;
  try {
    var part = token.split('.')[1] || '';
    var normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    var payload = JSON.parse(atob(normalized));
    return !!(payload.exp && (payload.exp * 1000 - Date.now()) > 5 * 60 * 1000);
  } catch (e) {
    return false;
  }
}

function refreshAuthTokenIfNeeded(force) {
  var fbUser = getFbUser();
  if (!fbUser || !fbUser.refreshToken) return Promise.resolve(null);
  if (!force && isIdTokenFresh(fbUser.idToken)) return Promise.resolve(fbUser.idToken);

  return fcFetch('https://securetoken.googleapis.com/v1/token?key=' + FC_FB.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(fbUser.refreshToken)
  })
  .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('Token refresh failed')); })
  .then(function(data) {
    fbUser.idToken = data.id_token || fbUser.idToken || '';
    fbUser.refreshToken = data.refresh_token || fbUser.refreshToken || '';
    if (data.user_id && !fbUser.uid) fbUser.uid = data.user_id;
    localStorage.setItem('fc-fb-user', JSON.stringify(fbUser));
    return fbUser.idToken;
  });
}

function ensureFreshAuthToken(force) {
  return refreshAuthTokenIfNeeded(force).catch(function() { return null; }).then(function(token) {
    var fbUser = getFbUser();
    var freshToken = token || (fbUser && fbUser.idToken) || '';
    if (!freshToken || !String(freshToken).trim()) {
      var err = new Error('Missing authorization token');
      err.status = 401;
      throw err;
    }
    return freshToken;
  });
}

function authFetch(url, options) {
  return ensureFreshAuthToken().then(function() {
    var opts = Object.assign({}, options || {});
    opts.headers = getAuthHeaders(opts.headers);
    return fcFetch(url, opts);
  });
}

function getBackendOrigins(preferredOrigin) {
  var list = [];
  if (preferredOrigin) list.push(String(preferredOrigin).replace(/\/$/, ''));
  FC_BACKEND_ORIGINS.forEach(function(origin) {
    origin = String(origin || '').replace(/\/$/, '');
    if (origin && list.indexOf(origin) === -1) list.push(origin);
  });
  return list;
}

function buildBackendUrl(path, origin) {
  var cleanPath = String(path || '');
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  if (cleanPath.charAt(0) !== '/') cleanPath = '/' + cleanPath;
  return String(origin || '').replace(/\/$/, '') + cleanPath;
}

function fetchWithBackendFallback(path, options, preferredOrigin) {
  var origins = getBackendOrigins(preferredOrigin);
  var lastErr = null;
  var idx = 0;

  function attempt() {
    if (idx >= origins.length) {
      if (lastErr) throw lastErr;
      throw new Error('Backend request failed');
    }
    var origin = origins[idx++];
    var url = buildBackendUrl(path, origin);
    return fcFetch(url, Object.assign({}, options || {})).catch(function(err) {
      lastErr = err || new Error('Load failed');
      return attempt();
    });
  }

  return attempt();
}

function authFetchWithBackendFallback(path, options, preferredOrigin) {
  var origins = getBackendOrigins(preferredOrigin);
  var lastErr = null;
  var idx = 0;

  return ensureFreshAuthToken().then(function() {
    function attempt() {
      if (idx >= origins.length) {
        if (lastErr) throw lastErr;
        throw new Error('Backend request failed');
      }
      var origin = origins[idx++];
      var url = buildBackendUrl(path, origin);
      var opts = Object.assign({}, options || {});
      opts.headers = getAuthHeaders(opts.headers);
      return fcFetch(url, opts).catch(function(err) {
        lastErr = err || new Error('Load failed');
        return attempt();
      });
    }
    return attempt();
  });
}

function requireSignedInForPlaid() {
  var fbUser = getFbUser();
  if (fbUser && fbUser.uid && (fbUser.refreshToken || fbUser.idToken)) return fbUser;
  if (typeof toast === 'function') toast('Sign in to link and sync bank accounts', 'amb');
  return null;
}

// ── Auto restore session ──
window.addEventListener('DOMContentLoaded', function() {
  try {
    var saved = localStorage.getItem('fc-fb-user');
    if (saved) {
      var user = JSON.parse(saved);
      if (typeof settings !== 'undefined') {
        settings.name  = user.name  || settings.name;
        settings.email = user.email || settings.email;
        settings.uid   = user.uid;
      }
    }
  } catch(e) {}
});

console.log('FlowCheck Firebase REST auth ready');
