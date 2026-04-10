// lib/templates/index.js
// All FlowCheck email templates.
// Returns { subject, html } for every emailType.

const BASE_STYLES = `
  body { margin:0; padding:0; background:#060606; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:#f5f5f5; }
  .wrapper { max-width:620px; margin:0 auto; padding:28px 14px; background:
    radial-gradient(circle at top, rgba(245,166,35,.10), transparent 34%),
    linear-gradient(180deg,#060606 0%,#0b0b0b 100%); }
  .card { background:#111111; border-radius:26px; overflow:hidden; border:1px solid rgba(255,255,255,.08); box-shadow:0 28px 80px rgba(0,0,0,.45); }
  .accent-bar { height:4px; background:linear-gradient(90deg,#F5A623,#ff9f1a 42%,#ff6b35 100%); }
  .header { background:
    radial-gradient(circle at top right, rgba(245,166,35,.18), transparent 42%),
    linear-gradient(180deg,#1a1409 0%,#0f0f0f 100%);
    padding:34px 34px 26px; text-align:center; border-bottom:1px solid rgba(255,255,255,.06); }
  .logo-wrap { width:68px; height:68px; margin:0 auto 18px; border-radius:20px; background:linear-gradient(145deg,#1a1400,#101010); border:1px solid rgba(245,166,35,.16); box-shadow:0 16px 36px rgba(0,0,0,.32); text-align:center; line-height:68px; }
  .logo-bars { display:inline-block; vertical-align:middle; }
  .logo { font-size:28px; font-weight:800; color:#ffffff; letter-spacing:-.7px; }
  .logo-sub { font-size:11px; color:rgba(255,255,255,.45); font-weight:600; letter-spacing:.18em; text-transform:uppercase; margin-top:4px; }
  .body { padding:34px 32px 26px; background:#151515; }
  .eyebrow { display:inline-block; font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:rgba(245,166,35,.78); margin:0 0 14px; }
  .h1 { font-size:28px; font-weight:800; color:#ffffff; letter-spacing:-.7px; margin:0 0 8px; line-height:1.05; }
  .sub { font-size:14px; color:rgba(255,255,255,.56); line-height:1.65; margin:0 0 24px; }
  .p { font-size:15px; color:rgba(255,255,255,.78); line-height:1.75; margin:0 0 16px; }
  .p-sm { font-size:13px; color:rgba(255,255,255,.50); line-height:1.65; margin:0 0 14px; }
  .hero-panel { background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02)); border:1px solid rgba(255,255,255,.07); border-radius:18px; padding:18px 18px 16px; margin:0 0 22px; }
  .hero-kicker { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:rgba(245,166,35,.76); margin-bottom:8px; }
  .hero-title { font-size:18px; font-weight:800; color:#fff; letter-spacing:-.3px; margin-bottom:6px; }
  .hero-copy { font-size:13px; line-height:1.6; color:rgba(255,255,255,.55); }
  .cta { display:block; text-align:center; background:#F5A623; color:#000000 !important; font-size:15px; font-weight:800; text-decoration:none; padding:16px 28px; border-radius:999px; margin:24px 0 14px; box-shadow:0 10px 26px rgba(245,166,35,.22); }
  .cta-outline { display:block; text-align:center; background:transparent; color:#F5A623 !important; font-size:14px; font-weight:700; text-decoration:none; padding:13px 24px; border-radius:999px; border:1.5px solid rgba(245,166,35,.45); margin:0 0 22px; }
  .stat-row { display:flex; gap:10px; margin:20px 0; }
  .stat { flex:1; padding:16px 12px; text-align:center; border:1px solid rgba(255,255,255,.07); border-radius:16px; background:rgba(255,255,255,.03); }
  .stat-val { font-size:20px; font-weight:800; color:#ffffff; letter-spacing:-.4px; }
  .stat-lbl { font-size:10px; color:rgba(255,255,255,.36); font-weight:700; letter-spacing:.1em; text-transform:uppercase; margin-top:3px; }
  .bullet { display:flex; align-items:flex-start; gap:12px; margin:0 0 14px; }
  .bullet-icon { width:30px; height:30px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; background:rgba(245,166,35,.10); border:1px solid rgba(245,166,35,.16); }
  .bullet-text { font-size:14px; color:rgba(255,255,255,.74); line-height:1.6; padding-top:3px; }
  .alert-box, .alert-box-red, .alert-box-green { border-radius:16px; padding:16px 18px; margin:20px 0; }
  .alert-box { background:rgba(245,166,35,.09); border:1px solid rgba(245,166,35,.18); }
  .alert-box-red { background:rgba(239,68,68,.10); border:1px solid rgba(248,113,113,.20); }
  .alert-box-green { background:rgba(34,197,94,.10); border:1px solid rgba(74,222,128,.20); }
  .footer { background:#101010; padding:22px 30px 26px; border-top:1px solid rgba(255,255,255,.06); text-align:center; }
  .footer-text { font-size:12px; color:rgba(255,255,255,.36); line-height:1.8; }
  .footer-link { color:#F5A623; text-decoration:none; }
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
      <div class="logo-wrap"><span class="logo-bars">▁▃▅▇</span></div>
      <div class="logo">FlowCheck</div>
      <div class="logo-sub">Money Manager</div>
    </div>
    ${content}
    <div class="footer">
      <p class="footer-text">
        You're receiving this because you have a FlowCheck account.<br>
        Questions? <a href="mailto:flowcheckapp.help@outlook.com" class="footer-link">flowcheckapp.help@outlook.com</a><br><br>
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
      <div class="eyebrow">Welcome</div>
      <h1 class="h1">Welcome to FlowCheck</h1>
      <p class="sub">Your financial clarity starts here.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Thanks for joining. FlowCheck is built to help you feel calmer, sharper, and more intentional with money every day.</p>
      <div class="hero-panel">
        <div class="hero-kicker">Best First Move</div>
        <div class="hero-title">Link checking after setup</div>
        <div class="hero-copy">That is what unlocks your real safe-to-spend number, recurring charge detection, and a dashboard that feels alive instead of empty.</div>
      </div>
      <div class="bullet"><div class="bullet-icon">📊</div><div class="bullet-text"><strong>Track your spending</strong> — automatic categorization for every transaction</div></div>
      <div class="bullet"><div class="bullet-icon">💡</div><div class="bullet-text"><strong>See your Safe to Spend</strong> — a real-time number you can actually trust</div></div>
      <div class="bullet"><div class="bullet-icon">🏦</div><div class="bullet-text"><strong>Link your bank</strong> — secure, read-only access via Plaid</div></div>
      <div class="bullet"><div class="bullet-icon">🔒</div><div class="bullet-text"><strong>Your data stays private</strong> — stored on your device, never sold</div></div>
      <a href="https://getflowcheck.app" class="cta">Open My FlowCheck →</a>
      <p class="p-sm">Reply to this email anytime if you want help with setup, bank linking, or making the app fit your money life better.</p>
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
      <div class="eyebrow">Premium Trial</div>
      <h1 class="h1">Your free trial has started</h1>
      <p class="sub">7 days of full Premium access. Cancel anytime, no charge today.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">For the next 7 days, you have full access to the premium FlowCheck experience — richer clarity, better sync, and a more complete money cockpit.</p>
      <div class="hero-panel">
        <div class="hero-kicker">Unlocked Now</div>
        <div class="hero-title">Premium is live on your account</div>
        <div class="hero-copy">Use this week to link accounts, explore recurring charges, and see how FlowCheck feels when every signal is turned on.</div>
      </div>
      <div class="bullet"><div class="bullet-icon">🏦</div><div class="bullet-text"><strong>Bank Sync</strong> — automatic transaction import via Plaid</div></div>
      <div class="bullet"><div class="bullet-icon">📈</div><div class="bullet-text"><strong>Cash Flow</strong> — see money in vs money out at a glance</div></div>
      <div class="bullet"><div class="bullet-icon">📋</div><div class="bullet-text"><strong>Monthly Reports</strong> — premium financial insights every month</div></div>
      <div class="bullet"><div class="bullet-icon">🏠</div><div class="bullet-text"><strong>House & Car Calculators</strong> — know what you can actually afford</div></div>
      <div class="bullet"><div class="bullet-icon">⭐</div><div class="bullet-text"><strong>Credit Score Tracking</strong> — monitor and improve over time</div></div>
      ${trialEndsAt ? `<div class="alert-box-green"><p class="p-sm" style="margin:0;color:#166534">Your trial ends on <strong>${trialEndsAt}</strong>. You can cancel anytime before then at no charge.</p></div>` : ''}
      <a href="https://getflowcheck.app" class="cta">Explore Premium →</a>
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
      <div class="eyebrow">Premium Active</div>
      <h1 class="h1">You're now Premium</h1>
      <p class="sub">Full access to every feature in FlowCheck.</p>
      <p class="p">Hi ${name},</p>
      <p class="p">Your FlowCheck Premium ${plan === 'yearly' ? 'annual' : 'monthly'} subscription is now active. Every feature is unlocked and ready to make the app feel dramatically more complete.</p>
      <div class="hero-panel">
        <div class="hero-kicker">What Changes</div>
        <div class="hero-title">More signal, less guesswork</div>
        <div class="hero-copy">You now have the full system: bank sync, richer recurring insight, premium reporting, and a clearer daily spending picture.</div>
      </div>
      <div class="alert-box-green">
        <p class="p-sm" style="margin:0;color:#166534">You're on the <strong>${plan === 'yearly' ? 'Yearly plan ($24.99/year)' : 'Monthly plan ($4.99/month)'}</strong>. You can manage or cancel your subscription anytime in iPhone Settings → Apple ID → Subscriptions.</p>
      </div>
      <a href="https://getflowcheck.app" class="cta">Open Premium FlowCheck →</a>
      <p class="p-sm">If you ever have questions about your subscription, please reach out at <a href="mailto:flowcheckapp.help@outlook.com">flowcheckapp.help@outlook.com</a>.</p>
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
      <p class="p-sm">Questions? Reply to this email or contact us at <a href="mailto:flowcheckapp.help@outlook.com">flowcheckapp.help@outlook.com</a>.</p>
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
        <p class="p-sm" style="margin:0;color:#92400e">This action is permanent and cannot be undone. If you believe this was a mistake, please contact us immediately at <a href="mailto:flowcheckapp.help@outlook.com">flowcheckapp.help@outlook.com</a>.</p>
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
