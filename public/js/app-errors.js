// Global error handler — catches and logs all JS errors with detail
window.onerror = function(msg, src, line, col, err) {
  // Ignore cross-origin "Script error" — these come from external CDN scripts
  // and contain no useful debug info (browser hides details for security)
  if (msg === 'Script error.' || msg === 'Script error') return true;
  // Ignore errors from external scripts
  if (src && (src.indexOf('cdnjs.') > -1 || src.indexOf('plaid.') > -1 || src.indexOf('cdn-cgi') > -1)) return true;
  var detail = (err && err.stack) ? err.stack.substring(0,400) : (msg + ' @ ' + src + ':' + line + ':' + col);
  console.error('[FlowCheck Error]', detail);
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  var reason = e.reason;
  var msg = reason && (reason.message || String(reason));
  // Suppress Capacitor bridge errors — these are benign plugin communication failures
  if (!msg || msg === 'Script error.' || msg === 'Script error' ||
      msg.indexOf('capacitor') > -1 || msg.indexOf('Capacitor') > -1 ||
      msg.indexOf('Plugin') > -1 || msg === 'undefined') {
    e.preventDefault();
    return;
  }
  console.error('[FlowCheck Promise]', msg);
});
