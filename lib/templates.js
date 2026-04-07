// lib/templates/index.js
// All FlowCheck email templates.
// Returns { subject, html } for every emailType.

const BASE_STYLES = `
  body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
  .wrapper { max-width:580px; margin:0 auto; padding:32px 16px; }
  .card { background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .header { background:#0a0a0a; padding:32px 36px 28px; text-align:center; }
  .logo { font-size:22px; font-weight:800; color:#F5A623; letter-spacing:-.5px; }
  .logo-sub { font-size:11px; color:rgba(255,255,255,.35); font-weight:500; letter-spacing:.1em; text-transform:uppercase; margin-top:2px; }
  .body { padding:36px 36px 28px; }
  .h1 { font-size:24px; font-weight:800; color:#0a0a0a; letter-spacing:-.4px; margin:0 0 8px; }
  .sub { font-size:14px; color:#6b7280; line-height:1.6; margin:0 0 24px; }
  .p { font-size:15px; color:#374151; line-height:1.7; margin:0 0 18px; }
  .p-sm { font-size:13px; color:#6b7280; line-height:1.6; margin:0 0 14px; }
  .cta { display:block; text-align:center; background:#F5A623; color:#000000 !important; font-size:15px; font-weight:800; text-decoration:none; padding:16px 28px; border-radius:100px; margin:24px 0; }
  .cta-outline { display:block; text-align:center; background:transparent; color:#F5A623 !important; font-size:14px; font-weight:700; text-decoration:none; padding:13px 24px; border-radius:100px; border:1.5px solid #F5A623; margin:12px 0 24px; }
  .divider { height:1px; background:#f0f0f0; margin:24px 0; }
  .stat-row { display:flex; gap:0; border:1px solid #f0f0f0; border-radius:12px; overflow:hidden; margin:20px 0; }
  .stat { flex:1; padding:16px 12px; text-align:center; border-right:1px solid #f0f0f0; }
  .stat:last-child { border-right:none; }
  .stat-val { font-size:20px; font-weight:800; color:#0a0a0a; }
  .stat-lbl { font-size:10px; color:#9ca3af; font-weight:600; letter-spacing:.08em; text-transform:uppercase; margin-top:2px; }
  .bullet { display:flex; align-items:flex-start; gap:12px; margin:0 0 14px; }
  .bullet-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; background:#fff8ed; }
  .bullet-text { font-size:14px; color:#374151; line-height:1.5; padding-top:4px; }
  .alert-box { background:#fff8ed; border:1px solid #fde68a; border-radius:12px; padding:16px 18px; margin:20px 0; }
  .alert-box-red { background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:16px 18px; margin:20px 0; }
  .alert-box-green { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px 18px; margin:20px 0; }
  .footer { background:#f9fafb; padding:24px 36px; border-top:1px solid #f0f0f0; text-align:center; }
  .footer-text { font-size:12px; color:#9ca3af; line-height:1.7; }
  .footer-link { color:#F5A623; text-decoration:none; }
  .accent-bar { height:3px; background:linear-gradient(90deg,#F5A623,#ff6b35); }
`;

function wrap(content, previewText = '') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
${previewText ? `<meta name="description" content="${previewText}">` : ''}
<style>${BASE_STYLES}</style></head><body>
<div class="wrapper">
  <div class="card">
    <div class="accent-bar"></div>
    <div class="header">
      <div class="logo">FlowCheck</div>
      <div class="logo-sub">Money Manager</div>
    </div>
    ${content}
    <div class="footer">
      <p class="footer-text">
        You're receiving this because you have a FlowCheck account.<br>
        Questions? <a href="mailto:support@getflowcheck.app" class="footer-link">support@getflowcheck.app</a><br><br>
        <a href="https://getflowcheck.app/unsubscribe" class="footer-link">Unsubscribe</a> &nbsp;·&nbsp;
        <a href="https://btminkler03.github.io/flowcheck-legal" class="footer-link">Privacy Policy</a><br><br>
        © 2026 FlowCheck LLC — All rights reserved.
      </p>
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════

const TEMPLATES = {

  // ── 1. Welcome ──────────────────────────────
  welcome: ({ name }) => ({
    subject: `Welcome to FlowCheck, ${name} 👋`,
    preview: 'Your financial clarity starts here.',
    body: `
    <div class="body">
      <h1 class="h1">Welcome to FlowCheck</h1>
      <p class="sub">Your financial clarity starts here.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Thanks for joining FlowCheck. You now have a smart, private space to understand your money — where it's going, what you can safely spend, and how to get ahead.</p>
      <div class="bullet"><div class="bullet-icon">📊</div><div class="bullet-text"><strong>Track your spending</strong> — automatic categorization for every transaction</div></div>
      <div class="bullet"><div class="bullet-icon">💡</div><div class="bullet-text"><strong>See your Safe to Spend</strong> — a real-time number you can actually trust</div></div>
      <div class="bullet"><div class="bullet-icon">🏦</div><div class="bullet-text"><strong>Link your bank</strong> — secure, read-only access via Plaid</div></div>
      <div class="bullet"><div class="bullet-icon">🔒</div><div class="bullet-text"><strong>Your data stays private</strong> — stored on your device, never sold</div></div>
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="p-sm">If you have any questions or need help getting started, reply to this email — we'd love to hear from you.</p>
    </div>`
  }),

  // ── 2. Verify Email ─────────────────────────
  verify: ({ name, actionUrl }) => ({
    subject: 'Verify your FlowCheck email address',
    preview: 'One quick step to secure your account.',
    body: `
    <div class="body">
      <h1 class="h1">Verify your email</h1>
      <p class="sub">One quick step to keep your account secure.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Please verify your email address to complete your FlowCheck account setup. This link expires in 24 hours.</p>
      <a href="${actionUrl || '#'}" class="cta">Verify Email Address →</a>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">If you didn't create a FlowCheck account, you can safely ignore this email. No action is needed.</p>
      </div>
      <p class="p-sm">For security, this link can only be used once and expires in 24 hours.</p>
    </div>`
  }),

  // ── 3. Password Reset ───────────────────────
  password_reset: ({ name, actionUrl }) => ({
    subject: 'Reset your FlowCheck password',
    preview: 'We received a request to reset your password.',
    body: `
    <div class="body">
      <h1 class="h1">Reset your password</h1>
      <p class="sub">This link expires in 1 hour.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">We received a request to reset the password for your FlowCheck account. Click the button below to choose a new password.</p>
      <a href="${actionUrl || '#'}" class="cta">Reset Password →</a>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e"><strong>Didn't request this?</strong> Your account is safe. You can ignore this email — your password will not change unless you click the link above.</p>
      </div>
      <p class="p-sm">For security reasons, this link expires in 1 hour and can only be used once.</p>
    </div>`
  }),

  // ── 4. Trial Started ────────────────────────
  trial_started: ({ name, trialEndsAt }) => ({
    subject: 'Your FlowCheck Premium trial has started ✨',
    preview: '7 days of full access — no commitment.',
    body: `
    <div class="body">
      <h1 class="h1">Your free trial has started</h1>
      <p class="sub">7 days of full Premium access. Cancel anytime, no charge today.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Welcome to FlowCheck Premium. For the next 7 days, you have full access to every feature — no charge today, no commitment required.</p>
      <div class="bullet"><div class="bullet-icon">🏦</div><div class="bullet-text"><strong>Bank Sync</strong> — automatic transaction import via Plaid</div></div>
      <div class="bullet"><div class="bullet-icon">📈</div><div class="bullet-text"><strong>Cash Flow</strong> — see money in vs money out at a glance</div></div>
      <div class="bullet"><div class="bullet-icon">📋</div><div class="bullet-text"><strong>Monthly Reports</strong> — premium financial insights every month</div></div>
      <div class="bullet"><div class="bullet-icon">🏠</div><div class="bullet-text"><strong>House & Car Calculators</strong> — know what you can actually afford</div></div>
      <div class="bullet"><div class="bullet-icon">⭐</div><div class="bullet-text"><strong>Credit Score Tracking</strong> — monitor and improve over time</div></div>
      ${trialEndsAt ? `<div class="alert-box-green"><p class="p-sm" style="margin:0;color:#166534">Your trial ends on <strong>${trialEndsAt}</strong>. You can cancel anytime before then at no charge.</p></div>` : ''}
      <a href="https://getflowcheck.app" class="cta">Explore Premium Features →</a>
      <p class="p-sm">To cancel or manage your subscription, go to Settings → Apple ID → Subscriptions on your iPhone.</p>
    </div>`
  }),

  // ── 5. Trial Ending Soon ────────────────────
  trial_ending: ({ name, trialEndsAt, daysLeft }) => ({
    subject: `Your FlowCheck trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    preview: `Keep your financial momentum going.`,
    body: `
    <div class="body">
      <h1 class="h1">Your trial ends ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}</h1>
      <p class="sub">Keep your financial momentum going.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Your FlowCheck Premium trial ends on <strong>${trialEndsAt}</strong>. After that, you'll move to a free plan — which still includes budgeting, debt tracking, savings goals, and more.</p>
      <p class="p">To keep Premium features like Bank Sync, Monthly Reports, and Cash Flow — subscribe before your trial ends.</p>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">Premium is <strong>$2.08/month</strong> when billed yearly, or $4.99/month. Cancel anytime from your iPhone Settings.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta">Keep Premium Access →</a>
      <a href="https://getflowcheck.app" class="cta-outline">See What's Included</a>
      <p class="p-sm">If you decide not to subscribe, your free features stay active forever. No pressure.</p>
    </div>`
  }),

  // ── 6. Subscription Active ──────────────────
  subscription_active: ({ name, plan }) => ({
    subject: 'FlowCheck Premium is now active 🎉',
    preview: 'Welcome to the full experience.',
    body: `
    <div class="body">
      <h1 class="h1">You're now Premium</h1>
      <p class="sub">Full access to every feature in FlowCheck.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Your FlowCheck Premium ${plan === 'yearly' ? 'annual' : 'monthly'} subscription is now active. Every feature is unlocked — thank you for your support.</p>
      <div class="alert-box-green">
        <p class="p-sm" style="margin:0;color:#166534">You're on the <strong>${plan === 'yearly' ? 'Yearly plan ($24.99/year)' : 'Monthly plan ($4.99/month)'}</strong>. You can manage or cancel your subscription anytime in iPhone Settings → Apple ID → Subscriptions.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="p-sm">If you ever have questions about your subscription, please reach out at <a href="mailto:support@getflowcheck.app">support@getflowcheck.app</a>.</p>
    </div>`
  }),

  // ── 7. Payment Failed ───────────────────────
  payment_failed: ({ name }) => ({
    subject: 'Action needed: FlowCheck billing issue',
    preview: 'Your Premium access may be interrupted.',
    body: `
    <div class="body">
      <h1 class="h1">We couldn't process your payment</h1>
      <p class="sub">Your Premium access may be interrupted soon.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">We weren't able to renew your FlowCheck Premium subscription. This usually happens when a payment method has expired or been updated.</p>
      <div class="alert-box-red">
        <p class="p-sm" style="margin:0;color:#991b1b">To keep your Premium access uninterrupted, please update your payment method in <strong>iPhone Settings → Apple ID → Subscriptions → FlowCheck</strong>.</p>
      </div>
      <a href="https://apps.apple.com/account/subscriptions" class="cta">Update Payment Method →</a>
      <p class="p-sm">Your data and settings are safe and won't be affected. Once your payment is updated, Premium access will resume automatically.</p>
      <p class="p-sm">Questions? Reply to this email or contact us at <a href="mailto:support@getflowcheck.app">support@getflowcheck.app</a>.</p>
    </div>`
  }),

  // ── 8. Subscription Canceled ────────────────
  subscription_canceled: ({ name }) => ({
    subject: 'Your FlowCheck Premium subscription has been canceled',
    preview: 'Your free features stay active.',
    body: `
    <div class="body">
      <h1 class="h1">Subscription canceled</h1>
      <p class="sub">We hope to see you again.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Your FlowCheck Premium subscription has been canceled. You'll keep Premium access until the end of your current billing period, then move to the free plan.</p>
      <p class="p">Your free features — budgeting, debt tracking, savings goals, bill tracker, and net worth — remain active forever.</p>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">Changed your mind? You can resubscribe anytime from inside the FlowCheck app.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta-outline">Resubscribe Anytime →</a>
      <p class="p-sm">If you canceled because of a problem or something wasn't working, we'd genuinely love to know. Reply to this email — every message is read.</p>
    </div>`
  }),

  // ── 9. Weekly Summary ───────────────────────
  weekly_summary: ({ name, spent, income, topCategory, biggestPurchase, safeToSpend, insight, weekLabel }) => ({
    subject: `Your FlowCheck week in review — ${weekLabel}`,
    preview: `You spent $${spent?.toLocaleString()} this week.`,
    body: `
    <div class="body">
      <h1 class="h1">Your week in review</h1>
      <p class="sub">${weekLabel}</p>
      <p class="p">Hi ${name}, here's a snapshot of your finances this week.</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-val">$${(spent || 0).toLocaleString()}</div><div class="stat-lbl">Spent</div></div>
        <div class="stat"><div class="stat-val" style="color:#16a34a">$${(income || 0).toLocaleString()}</div><div class="stat-lbl">Income</div></div>
        <div class="stat"><div class="stat-val" style="color:${safeToSpend >= 0 ? '#16a34a' : '#dc2626'}">$${Math.abs(safeToSpend || 0).toLocaleString()}</div><div class="stat-lbl">Safe to Spend</div></div>
      </div>
      ${topCategory ? `<div class="bullet"><div class="bullet-icon">📊</div><div class="bullet-text"><strong>Top category:</strong> ${topCategory}</div></div>` : ''}
      ${biggestPurchase ? `<div class="bullet"><div class="bullet-icon">💳</div><div class="bullet-text"><strong>Biggest purchase:</strong> ${biggestPurchase}</div></div>` : ''}
      ${insight ? `<div class="alert-box-green"><p class="p-sm" style="margin:0;color:#166534">💡 ${insight}</p></div>` : ''}
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
    </div>`
  }),

  // ── 10. Monthly Summary ──────────────────────
  monthly_summary: ({ name, month, spent, income, topCategory, biggestPurchase, safeToSpend, savingsProgress, insight }) => ({
    subject: `Your FlowCheck monthly report — ${month}`,
    preview: `${month} by the numbers.`,
    body: `
    <div class="body">
      <h1 class="h1">${month} in review</h1>
      <p class="sub">Your personal financial snapshot.</p>
      <p class="p">Hi ${name}, here's how your finances looked in ${month}.</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-val">$${(spent || 0).toLocaleString()}</div><div class="stat-lbl">Total Spent</div></div>
        <div class="stat"><div class="stat-val" style="color:#16a34a">$${(income || 0).toLocaleString()}</div><div class="stat-lbl">Income</div></div>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="stat-val" style="color:${safeToSpend >= 0 ? '#16a34a' : '#dc2626'}">$${Math.abs(safeToSpend || 0).toLocaleString()}</div><div class="stat-lbl">Safe to Spend</div></div>
        ${savingsProgress ? `<div class="stat"><div class="stat-val" style="color:#2563eb">$${savingsProgress.toLocaleString()}</div><div class="stat-lbl">Saved</div></div>` : ''}
      </div>
      ${topCategory ? `<div class="bullet"><div class="bullet-icon">📊</div><div class="bullet-text"><strong>Top spending category:</strong> ${topCategory}</div></div>` : ''}
      ${biggestPurchase ? `<div class="bullet"><div class="bullet-icon">💳</div><div class="bullet-text"><strong>Biggest purchase:</strong> ${biggestPurchase}</div></div>` : ''}
      ${insight ? `<div class="alert-box-green"><p class="p-sm" style="margin:0;color:#166534">💡 ${insight}</p></div>` : ''}
      <a href="https://getflowcheck.app" class="cta">See Full Report in App →</a>
    </div>`
  }),

  // ── 11. Reengagement ────────────────────────
  reengagement: ({ name }) => ({
    subject: `Hey ${name}, your finances are waiting`,
    preview: 'A few minutes can make a real difference.',
    body: `
    <div class="body">
      <h1 class="h1">We've missed you</h1>
      <p class="sub">A few minutes can make a real difference.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">You haven't opened FlowCheck in a while. That's okay — life gets busy. But your finances keep moving whether you're watching them or not.</p>
      <p class="p">A quick check-in takes less than two minutes and can help you stay ahead before things add up.</p>
      <div class="bullet"><div class="bullet-icon">📊</div><div class="bullet-text">See what you've spent recently</div></div>
      <div class="bullet"><div class="bullet-icon">🔔</div><div class="bullet-text">Check for any bills coming up</div></div>
      <div class="bullet"><div class="bullet-icon">💡</div><div class="bullet-text">Review your Safe to Spend</div></div>
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="p-sm">If FlowCheck isn't working for you, we'd genuinely love to know why. Reply to this email — we read every message.</p>
    </div>`
  }),

  // ── 12. Bills Due Soon ──────────────────────
  bills_due: ({ name, bills }) => ({
    subject: `Heads up: bills coming up for ${name}`,
    preview: 'Stay ahead of upcoming payments.',
    body: `
    <div class="body">
      <h1 class="h1">Bills coming up soon</h1>
      <p class="sub">Stay ahead of your upcoming payments.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">You have bills due in the next 7 days. Here's what's coming up:</p>
      ${(bills || []).map(b =>
        `<div class="bullet"><div class="bullet-icon">🔔</div><div class="bullet-text"><strong>${b.name}</strong> — $${b.amount} due ${b.dueDate}</div></div>`
      ).join('')}
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">Total due: <strong>$${(bills || []).reduce((s,b)=>s+(b.amount||0),0).toLocaleString()}</strong></p>
      </div>
      <a href="https://getflowcheck.app" class="cta">Review Bills in FlowCheck →</a>
      <p class="p-sm">To stop receiving bill reminders, update your notification preferences in FlowCheck Settings.</p>
    </div>`
  }),

  // ── 13. Savings Goal Milestone ───────────────
  savings_milestone: ({ name, goalName, currentAmount, targetAmount, percent }) => ({
    subject: `You're making real progress on "${goalName}" 🎯`,
    preview: `${percent}% of the way there.`,
    body: `
    <div class="body">
      <h1 class="h1">Great progress on your goal</h1>
      <p class="sub">Keep going — you're building something real.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">You've reached <strong>${percent}%</strong> of your <em>${goalName}</em> savings goal. That's $${(currentAmount||0).toLocaleString()} of $${(targetAmount||0).toLocaleString()}.</p>
      <div class="alert-box-green">
        <p class="p-sm" style="margin:0;color:#166534">Progress like this compounds. Every dollar you set aside today works for you tomorrow.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta">See Your Goals →</a>
    </div>`
  }),

  // ── 14. Account Deleted ─────────────────────
  account_deleted: ({ name }) => ({
    subject: 'Your FlowCheck account has been deleted',
    preview: 'Your data has been permanently removed.',
    body: `
    <div class="body">
      <h1 class="h1">Account deleted</h1>
      <p class="sub">Your data has been permanently removed.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Your FlowCheck account and all associated data have been permanently deleted as requested. This includes your profile, financial data, and any linked accounts.</p>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">This action is permanent and cannot be undone. If you believe this was a mistake, please contact us immediately at <a href="mailto:support@getflowcheck.app">support@getflowcheck.app</a>.</p>
      </div>
      <p class="p-sm">If you had an active subscription, please cancel it in iPhone Settings → Apple ID → Subscriptions to prevent future charges.</p>
      <p class="p-sm">We're sorry to see you go. If there's anything we could have done better, we genuinely want to know.</p>
    </div>`
  }),

  // ── 15. Sync Issue ──────────────────────────
  sync_issue: ({ name, bankName }) => ({
    subject: `Action needed: ${bankName || 'your bank'} sync needs attention`,
    preview: 'Reconnect to keep your transactions up to date.',
    body: `
    <div class="body">
      <h1 class="h1">Bank sync needs attention</h1>
      <p class="sub">Reconnect to keep your transactions current.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">We're having trouble syncing your <strong>${bankName || 'linked bank account'}</strong>. This usually happens when your bank requires you to re-verify your connection — it only takes a moment to fix.</p>
      <div class="alert-box">
        <p class="p-sm" style="margin:0;color:#92400e">Until reconnected, new transactions won't sync automatically. Your existing data is safe and unchanged.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta">Reconnect Your Bank →</a>
      <p class="p-sm">Open FlowCheck → More → Linked Accounts → tap Reconnect next to your bank.</p>
      <p class="p-sm">FlowCheck uses Plaid for secure, read-only bank connections. Your banking credentials are never stored in FlowCheck.</p>
    </div>`
  }),

};

// ── Template renderer ─────────────────────────
function renderTemplate(emailType, data) {
  const templateFn = TEMPLATES[emailType];
  if (!templateFn) throw new Error(`Unknown email template: ${emailType}`);
  const { subject, preview, body } = templateFn(data);
  return {
    subject,
    html: wrap(body, preview),
  };
}

module.exports = { renderTemplate, TEMPLATES };
