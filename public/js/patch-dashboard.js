// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK DASHBOARD UPGRADE — patch-dashboard.js
//  1. Injects copilot-feed div into dashboard (CRITICAL FIX)
//  2. Replaces letter grade with Momentum Score
//  3. Makes Safe to Spend the hero number
//  4. Adds account role badges
// ═══════════════════════════════════════════════════════════════

// ── 1. INJECT COPILOT FEED INTO DASHBOARD ──
function injectCopilotFeed() {
  if (document.getElementById('copilot-feed')) return; // already exists

  var dashPage = document.getElementById('pg-dashboard');
  if (!dashPage) return;

  // Find the daily brief section and inject copilot ABOVE it
  var dailyBrief = document.getElementById('dash-day-brief');
  if (!dailyBrief) return;

  var briefParent = dailyBrief.closest('div[style*="padding"]') || dailyBrief.parentNode;

  var copilotWrapper = document.createElement('div');
  copilotWrapper.style.cssText = 'padding:0 18px 0';
  copilotWrapper.innerHTML = '<div id="copilot-feed"></div>';

  // Insert before the daily brief wrapper
  briefParent.parentNode.insertBefore(copilotWrapper, briefParent);

  console.log('[FC Dash] Copilot feed injected into dashboard');

  // Trigger copilot load if it's ready
  setTimeout(function() {
    if (typeof fetchCopilotCards === 'function') {
      fetchCopilotCards(false);
    }
  }, 400);
}

// ── 2. REPLACE LETTER GRADE WITH MOMENTUM SCORE ──
function calcMomentumScore() {
  var score = 0;
  var reasons = [];

  try {
    // Factor 1: Under budget (30 pts)
    if (typeof budgetS !== 'undefined' && Array.isArray(budgetS) && budgetS.length > 0) {
      var totalLimit = budgetS.reduce(function(s,b) { return s + (b.lim||b.limit||0); }, 0);
      var totalSpent = budgetS.reduce(function(s,b) { return s + (b.spent||0); }, 0);
      if (totalLimit > 0) {
        var budgetPct = totalSpent / totalLimit;
        if (budgetPct <= 0.7) { score += 30; reasons.push('Under budget'); }
        else if (budgetPct <= 0.9) { score += 20; reasons.push('Near budget'); }
        else if (budgetPct <= 1.0) { score += 10; }
      }
    }

    // Factor 2: Positive net cash flow (25 pts)
    var income = 0, spending = 0;
    if (typeof logList !== 'undefined' && Array.isArray(logList)) {
      var now = new Date();
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      logList.forEach(function(tx) {
        if (!tx || !tx.date) return;
        var d = new Date(tx.date);
        if (d < monthStart) return;
        if (tx.isCredit || tx.amt > 0) income += Math.abs(tx.amt);
        else if (!tx.isTransfer && !tx.isPayment) spending += Math.abs(tx.amt);
      });
    }
    if (income > 0 && spending <= income) { score += 25; reasons.push('Spending ≤ income'); }

    // Factor 3: Bills covered (20 pts)
    if (typeof bills !== 'undefined' && Array.isArray(bills) && bills.length > 0) {
      score += 20;
      reasons.push('Bills tracked');
    }

    // Factor 4: Has savings goal progress (15 pts)
    if (typeof FC_SAV !== 'undefined' && FC_SAV.accounts && FC_SAV.accounts.length > 0) {
      var hasProgress = FC_SAV.accounts.some(function(a) { return (a.balance||0) > 0; });
      if (hasProgress) { score += 15; reasons.push('Saving actively'); }
    } else if (typeof savGoals !== 'undefined' && Array.isArray(savGoals) && savGoals.length > 0) {
      score += 10; reasons.push('Goals set');
    }

    // Factor 5: Bank linked (10 pts)
    if (typeof plaidLinkedAccounts !== 'undefined' && Array.isArray(plaidLinkedAccounts) && plaidLinkedAccounts.length > 0) {
      score += 10;
      reasons.push('Bank synced');
    }
  } catch (e) {}

  // Map score to label
  var label, color, emoji, description;
  if (score >= 85) { label = 'Excellent'; color = '#4ade80'; emoji = '🚀'; description = 'Your finances are in great shape.'; }
  else if (score >= 70) { label = 'On Track'; color = '#4ade80'; emoji = '✅'; description = 'Solid progress this month.'; }
  else if (score >= 55) { label = 'Building'; color = '#60a5fa'; emoji = '📈'; description = 'Moving in the right direction.'; }
  else if (score >= 40) { label = 'Watch It'; color = '#f59e0b'; emoji = '⚡'; description = 'A few things need attention.'; }
  else if (score >= 25) { label = 'Under Pressure'; color = '#f59e0b'; emoji = '⚠️'; description = 'This month is tight. You can turn it around.'; }
  else { label = 'Reset Time'; color = '#f87171'; emoji = '🔄'; description = 'Rough month — but every month is a fresh start.'; }

  return { score: score, label: label, color: color, emoji: emoji, description: description, reasons: reasons };
}

function patchFinancialGrade() {
  // Find the grade display element
  var gradeEls = document.querySelectorAll('[id*="grade"], [id*="Grade"]');
  gradeEls.forEach(function(el) {
    var parent = el.closest('.card, [style*="border-radius"]');
    if (!parent) return;

    var momentum = calcMomentumScore();

    // Replace the letter grade card entirely
    parent.innerHTML =
      '<div style="text-align:center;padding:4px 0">' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:12px">FINANCIAL MOMENTUM</div>' +
        '<div style="font-size:48px;margin-bottom:8px">' + momentum.emoji + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:' + momentum.color + ';margin-bottom:6px">' + momentum.label + '</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:14px">' + momentum.description + '</div>' +
        // Score bar
        '<div style="background:rgba(255,255,255,.06);border-radius:999px;height:6px;margin:0 20px 12px;overflow:hidden">' +
          '<div style="height:100%;border-radius:999px;background:' + momentum.color + ';width:' + momentum.score + '%;transition:width .5s ease"></div>' +
        '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.3)">Score: ' + momentum.score + '/100</div>' +
        // Factors
        (momentum.reasons.length > 0 ?
          '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px">' +
            momentum.reasons.map(function(r) {
              return '<div style="font-size:11px;font-weight:700;color:rgba(74,222,128,.8);background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15);border-radius:999px;padding:4px 10px">✓ ' + r + '</div>';
            }).join('') +
          '</div>' : '') +
      '</div>';
  });
}

// ── 3. MAKE SAFE TO SPEND MORE PROMINENT ──
function upgradeSafeToSpend() {
  var heroEl = document.getElementById('hero-safe-spend');
  if (!heroEl) return;

  // Make it bigger and more prominent
  heroEl.style.fontSize = '22px';
  heroEl.style.fontWeight = '900';
  heroEl.style.letterSpacing = '-0.5px';

  // Find the parent label and upgrade it
  var labelEl = heroEl.previousElementSibling;
  if (labelEl) {
    labelEl.style.fontSize = '9px';
    labelEl.style.fontWeight = '800';
    labelEl.style.letterSpacing = '.12em';
    labelEl.style.color = 'rgba(255,255,255,.4)';
  }

  // Add a pulsing ring when safe-to-spend is positive
  var val = parseFloat((heroEl.textContent || '').replace(/[^0-9.-]/g,''));
  if (val > 0 && !document.getElementById('sts-pulse')) {
    var ring = document.createElement('div');
    ring.id = 'sts-pulse';
    ring.style.cssText = 'position:absolute;inset:-4px;border-radius:inherit;border:1.5px solid rgba(74,222,128,.15);animation:stsPulse 2s ease infinite;pointer-events:none';
    if (!document.getElementById('sts-pulse-style')) {
      var s = document.createElement('style');
      s.id = 'sts-pulse-style';
      s.textContent = '@keyframes stsPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.02)}}';
      document.head.appendChild(s);
    }
  }
}

// ── 4. ACCOUNT ROLE BADGES ──
var ACCOUNT_ROLES = {
  checking:   { label: 'Daily Cash', color: '#06b6d4', icon: '💳' },
  savings:    { label: 'Protected', color: '#4ade80', icon: '🛡️' },
  credit:     { label: 'Manage Carefully', color: '#f59e0b', icon: '⚡' },
  investment: { label: 'Long-term', color: '#a78bfa', icon: '📈' },
  loan:       { label: 'Pay Down', color: '#f87171', icon: '📉' }
};

function injectAccountRoles() {
  // Find account list items and add role badges
  var plaidPage = document.getElementById('pg-plaid');
  if (!plaidPage) return;

  // Look for account rows
  var accountRows = plaidPage.querySelectorAll('[data-account-type], .account-row');
  accountRows.forEach(function(row) {
    if (row.querySelector('.fc-role-badge')) return; // already has badge
    var type = (row.dataset.accountType || 'checking').toLowerCase();
    var role = ACCOUNT_ROLES[type] || ACCOUNT_ROLES.checking;
    var badge = document.createElement('span');
    badge.className = 'fc-role-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:3px 8px;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);margin-left:8px';
    badge.textContent = role.icon + ' ' + role.label;
    row.appendChild(badge);
  });
}

// ── Run all upgrades ──
function runDashboardUpgrades() {
  injectCopilotFeed();
  upgradeSafeToSpend();
  setTimeout(patchFinancialGrade, 500); // slight delay so report page renders first
  injectAccountRoles();
}

// Init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(runDashboardUpgrades, 1000); });
} else {
  setTimeout(runDashboardUpgrades, 1000);
}

// Re-run when navigating to dashboard or report
var _fcDashNavOrig = window.fcNav || window.go;
var _navPatchFn = function(page) {
  if (typeof _fcDashNavOrig === 'function') _fcDashNavOrig.apply(this, arguments);
  if (page === 'dashboard') setTimeout(function() { injectCopilotFeed(); upgradeSafeToSpend(); }, 300);
  if (page === 'report') setTimeout(patchFinancialGrade, 400);
  if (page === 'plaid') setTimeout(injectAccountRoles, 300);
};
if (window.fcNav) window.fcNav = _navPatchFn;
else if (window.go) window.go = _navPatchFn;

console.log('[FC Dash] Dashboard upgrade loaded');
