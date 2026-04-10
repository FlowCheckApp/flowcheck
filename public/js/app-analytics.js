(function() {
  var ANALYTICS_ENDPOINT = '/api/analytics';
  var INSTALL_KEY = 'fc-install-id';
  var SESSION_KEY = 'fc-session-id';
  var SESSION_TS_KEY = 'fc-session-started-at';
  var APP_VERSION = '1.2';

  function ensureId(key, prefix) {
    try {
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var created = prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, created);
      return created;
    } catch (e) {
      return prefix + '_' + Date.now();
    }
  }

  function ensureSessionId() {
    try {
      var startedAt = Number(localStorage.getItem(SESSION_TS_KEY) || 0);
      var current = localStorage.getItem(SESSION_KEY);
      if (current && startedAt && (Date.now() - startedAt) < (1000 * 60 * 30)) return current;
      var next = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(SESSION_KEY, next);
      localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
      return next;
    } catch (e) {
      return 'sess_' + Date.now();
    }
  }

  function getAuthHeader() {
    try {
      if (typeof getFbUser === 'function') {
        var user = getFbUser();
        if (user && user.idToken) return { Authorization: 'Bearer ' + user.idToken };
      }
    } catch (e) {}
    return {};
  }

  function getBackendOrigin() {
    try {
      if (typeof FC_BACKEND_ORIGINS !== 'undefined' && FC_BACKEND_ORIGINS && FC_BACKEND_ORIGINS[0]) {
        return String(FC_BACKEND_ORIGINS[0]).replace(/\/$/, '');
      }
    } catch (e) {}
    return 'https://getflowcheck.app';
  }

  function postAnalytics(payload) {
    var url = getBackendOrigin() + ANALYTICS_ENDPOINT;
    var body = JSON.stringify(payload);
    var headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader());

    try {
      if (typeof fcFetch === 'function') {
        return fcFetch(url, { method: 'POST', headers: headers, body: body });
      }
    } catch (e) {}
    return fetch(url, { method: 'POST', headers: headers, body: body, keepalive: true });
  }

  window.FC_ANALYTICS = {
    track: function(event, props) {
      if (!event) return Promise.resolve(false);
      var payload = {
        event: event,
        props: props || {},
        anonymousId: ensureId(INSTALL_KEY, 'install'),
        sessionId: ensureSessionId(),
        platform: 'ios',
        appVersion: APP_VERSION
      };
      return postAnalytics(payload).then(function() { return true; }).catch(function(err) {
        if (event === 'app_opened' && !payload.__retried) {
          setTimeout(function() {
            payload.__retried = true;
            postAnalytics(payload).catch(function() {});
          }, 2200);
          return false;
        }
        console.warn('[analytics]', event, err && err.message ? err.message : err);
        return false;
      });
    }
  };

  window.FCTrack = function(event, props) {
    if (!window.FC_ANALYTICS || typeof window.FC_ANALYTICS.track !== 'function') return;
    window.FC_ANALYTICS.track(event, props);
  };

  setTimeout(function() {
    window.FCTrack('app_opened', { surface: 'ios_app' });
  }, 1800);
})();
