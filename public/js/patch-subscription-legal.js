// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK SUBSCRIPTION DISCLOSURE — patch-subscription-legal.js
//  Meets Apple Guideline 3.1.2(c) requirements
//  Drop into public/js/ and add script tag to index.html
//  Call injectSubscriptionDisclosure() on your paywall screen
// ═══════════════════════════════════════════════════════════════

// ── The legal disclosure HTML block ──
// Drop this inside your paywall/onboarding premium screen
// It must be VISIBLE before the user taps "Subscribe"

var FC_SUBSCRIPTION_DISCLOSURE = {

  // Full disclosure block — inject near the subscribe button
  fullDisclosure: function(price, period) {
    price = price || '$4.99';
    period = period || 'month';
    return [
      '<div id="fc-sub-legal" style="',
        'padding:14px 16px;',
        'background:rgba(255,255,255,.04);',
        'border:1px solid rgba(255,255,255,.07);',
        'border-radius:14px;',
        'margin:12px 0;',
      '">',
        '<div style="font-size:11px;line-height:1.7;color:rgba(255,255,255,.45);text-align:center">',
          '<strong style="color:rgba(255,255,255,.65);display:block;margin-bottom:4px">',
            'FlowCheck Premium — ' + price + '/' + period,
          '</strong>',
          'Auto-renewable subscription. ',
          price + ' per ' + period + ' after any free trial. ',
          'Cancel anytime in iPhone Settings → Apple ID → Subscriptions. ',
          'Payment charged to your Apple ID account. ',
          'Subscription renews automatically unless cancelled at least 24 hours before the end of the current period.',
          '<br><br>',
          '<a href="https://getflowcheck.app/privacy" style="color:rgba(6,182,212,.8);text-decoration:none">Privacy Policy</a>',
          ' &nbsp;·&nbsp; ',
          '<a href="https://getflowcheck.app/terms" style="color:rgba(6,182,212,.8);text-decoration:none">Terms of Use</a>',
        '</div>',
      '</div>'
    ].join('');
  },

  // Compact version for tight spaces — still Apple compliant
  compactDisclosure: function(price, period) {
    price = price || '$4.99';
    period = period || 'month';
    return [
      '<div id="fc-sub-legal-compact" style="',
        'padding:10px 0;',
        'text-align:center;',
      '">',
        '<div style="font-size:10px;line-height:1.65;color:rgba(255,255,255,.35)">',
          price + '/' + period + ' · Auto-renews · Cancel anytime in Settings',
          '<br>',
          '<a href="https://getflowcheck.app/privacy" style="color:rgba(6,182,212,.7);text-decoration:none">Privacy</a>',
          ' · ',
          '<a href="https://getflowcheck.app/terms" style="color:rgba(6,182,212,.7);text-decoration:none">Terms</a>',
        '</div>',
      '</div>'
    ].join('');
  }
};

// ── Auto-inject into existing paywall if it exists ──
function injectSubscriptionDisclosure() {
  // Find subscribe/upgrade buttons in the paywall
  var paywallEls = [
    document.getElementById('paywall-overlay'),
    document.getElementById('premium-screen'),
    document.querySelector('[id*="paywall"]'),
    document.querySelector('[id*="premium"]')
  ].filter(Boolean);

  paywallEls.forEach(function(el) {
    // Don't inject twice
    if (el.querySelector('#fc-sub-legal') || el.querySelector('#fc-sub-legal-compact')) return;

    // Find the subscribe button to inject before it
    var subBtn = el.querySelector('button[onclick*="subscribe"], button[onclick*="purchase"], button[onclick*="Subscribe"], button[onclick*="Upgrade"]')
      || el.querySelector('button[class*="primary"]')
      || el.querySelector('button[style*="background:var(--acc"]');

    if (subBtn && subBtn.parentNode) {
      var disclosure = document.createElement('div');
      disclosure.innerHTML = FC_SUBSCRIPTION_DISCLOSURE.compactDisclosure();
      subBtn.parentNode.insertBefore(disclosure, subBtn);
    } else {
      // Just append to the paywall
      el.insertAdjacentHTML('beforeend', FC_SUBSCRIPTION_DISCLOSURE.fullDisclosure());
    }
  });
}

// ── Run on load and when paywall opens ──
setTimeout(injectSubscriptionDisclosure, 1500);

// Hook into paywall open function if it exists
var _origOpenPaywall = window.openPaywall;
window.openPaywall = function() {
  if (typeof _origOpenPaywall === 'function') _origOpenPaywall.apply(this, arguments);
  setTimeout(injectSubscriptionDisclosure, 200);
};

console.log('[FC Legal] Subscription disclosure loaded');
