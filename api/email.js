// api/email.js — FlowCheck intelligent email handler
// Uses native fetch only — zero npm dependencies

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = 'FlowCheck <hello@getflowcheck.app>';
const { requireUser } = require('./_auth');

// Firebase Admin for user lookup
let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  _admin = admin;
  return admin;
}

async function getUserInfo(userId, dataOverride) {
  if (dataOverride && dataOverride.email) {
    return { email: dataOverride.email, name: dataOverride.name || dataOverride.email.split('@')[0] || 'there' };
  }
  try {
    const admin = getAdmin();
    const user = await admin.auth().getUser(userId);
    return { email: user.email, name: user.displayName || user.email?.split('@')[0] || 'there' };
  } catch(err) {
    throw new Error('User not found: ' + err.message);
  }
}

async function sendViaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Resend error');
  return data;
}

// ════════════════════════════════════════════════
// EMAIL TEMPLATES
// ════════════════════════════════════════════════
const S = `<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .w{max-width:560px;margin:0 auto;padding:28px 16px}
  .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .bar{height:3px;background:linear-gradient(90deg,#F5A623,#ff6b35)}
  .hdr{background:#0a0a0a;padding:28px 32px;text-align:center}
  .logo{font-size:21px;font-weight:800;color:#F5A623;letter-spacing:-.4px}
  .sub{font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:2px}
  .body{padding:32px}
  h1{font-size:22px;font-weight:800;color:#0a0a0a;margin:0 0 6px;letter-spacing:-.3px}
  .hl{font-size:13px;color:#6b7280;margin:0 0 22px;line-height:1.5}
  p{font-size:14px;color:#374151;line-height:1.7;margin:0 0 14px}
  .sm{font-size:12px;color:#6b7280;line-height:1.6;margin:0 0 10px}
  .cta{display:block;text-align:center;background:#F5A623;color:#000!important;font-weight:800;font-size:15px;text-decoration:none;padding:16px 24px;border-radius:100px;margin:24px 0;letter-spacing:-.1px}
  .box{background:#fff8ed;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin:18px 0}
  .box-g{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:18px 0}
  .box-r{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;margin:18px 0}
  .stats{border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin:18px 0}
  .stat-row{display:flex}
  .stat{flex:1;padding:14px 10px;text-align:center;border-right:1px solid #f0f0f0}
  .stat:last-child{border-right:none}
  .stat-val{font-size:18px;font-weight:800;color:#0a0a0a}
  .stat-lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
  .bill-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0}
  .bill-row:last-child{border-bottom:none}
  .bill-name{font-size:13px;font-weight:600;color:#374151}
  .bill-due{font-size:11px;color:#9ca3af;margin-top:1px}
  .bill-amt{font-size:14px;font-weight:700;color:#0a0a0a}
  .hero-num{font-size:42px;font-weight:800;letter-spacing:-1.5px;text-align:center;margin:16px 0 4px}
  .hero-sub{font-size:13px;color:#6b7280;text-align:center;margin-bottom:20px}
  .divider{height:1px;background:#f0f0f0;margin:20px 0}
  .ft{background:#f9fafb;padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center}
  .ft p{font-size:11px;color:#9ca3af;line-height:1.8;margin:0}
  .ft a{color:#F5A623;text-decoration:none}
</style>`;

function wrap(body, subj, preview) {
  return {
    subject: subj,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${S}</head><body>
    <div class="w"><div class="card">
      <div class="bar"></div>
      <div class="hdr"><div class="logo">FlowCheck</div><div class="sub">Money Manager</div></div>
      <div class="body">${body}</div>
      <div class="ft"><p>
        You're receiving this because you have a FlowCheck account.<br>
        Questions? <a href="mailto:support@getflowcheck.app">support@getflowcheck.app</a><br>
        <a href="https://getflowcheck.app/unsubscribe">Unsubscribe from non-essential emails</a><br><br>
        © 2026 FlowCheck LLC — All rights reserved.
      </p></div>
    </div></div></body></html>`
  };
}

function fmt(n) { return '$' + Math.abs(Math.round(n || 0)).toLocaleString(); }
function fmtSigned(n) { return (n >= 0 ? '$' : '-$') + Math.abs(Math.round(n || 0)).toLocaleString(); }
function listText(items) { return (items || []).filter(Boolean).slice(0, 3).join(', '); }

function buildEmail(type, name, d) {
  d = d || {};
  const safe      = d.safeToSpend || 0;
  const safeStr   = d.safeStr || fmtSigned(safe);
  const safeColor = safe >= 0 ? '#16a34a' : '#dc2626';
  const spent     = d.spentSoFar || 0;
  const income    = d.income || 0;
  const daily     = d.dailyBudget || 0;
  const nextPay   = d.nextPayDate || 'your next paycheck';
  const days      = d.daysLeft || 0;
  const bills     = d.bills || [];
  const billsTotal = d.billsTotal || 0;
  const subsTotal  = d.subsTotal || 0;
  const topCategory = d.topCategory || '';
  const topCategorySpend = d.topCategorySpend || 0;
  const biggestPurchase = d.biggestPurchase || '';
  const biggestPurchaseAmount = d.biggestPurchaseAmount || 0;
  const recurringSummary = d.recurringSummary || [];
  const insight = d.insight || '';
  const projectedSpend = d.projectedMonthlySpend || 0;

  const T = {

    // ── 1. Before Next Paycheck ──────────────────
    before_paycheck: () => wrap(`
      <h1>Before your next paycheck</h1>
      <p class="hl">${days} day${days===1?'':'s'} until ${nextPay} · Here's where you stand</p>

      <div class="hero-num" style="color:${safeColor}">${safeStr}</div>
      <div class="hero-sub">safe to spend before ${nextPay}</div>

      <div class="stats"><div class="stat-row">
        <div class="stat"><div class="stat-val">${fmt(income)}</div><div class="stat-lbl">Income</div></div>
        <div class="stat"><div class="stat-val" style="color:#dc2626">${fmt(spent)}</div><div class="stat-lbl">Spent</div></div>
        <div class="stat"><div class="stat-val" style="color:#2563eb">${fmt(billsTotal + subsTotal)}</div><div class="stat-lbl">Obligations</div></div>
      </div></div>

      ${bills.length > 0 ? `
      <p style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 10px">Upcoming bills</p>
      <div style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;padding:0 16px">
        ${bills.map(b => `<div class="bill-row">
          <div><div class="bill-name">${b.name}</div><div class="bill-due">Due ${b.dueDate}</div></div>
          <div class="bill-amt">${fmt(b.amount)}</div>
        </div>`).join('')}
      </div>` : ''}

      ${safe >= 0
        ? `<div class="box-g"><p style="margin:0;font-size:13px;color:#166534">💡 <strong>${fmt(daily)}/day</strong> keeps you on track until ${nextPay}.</p></div>`
        : `<div class="box-r"><p style="margin:0;font-size:13px;color:#991b1b">⚠️ You're projected to overspend by <strong>${fmt(Math.abs(safe))}</strong> before ${nextPay}. Review non-essential spending now.</p></div>`
      }

      ${insight ? `<p class="sm">Smart insight: ${insight}</p>` : ''}

      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="sm">Based on your ${d.freq || 'biweekly'} pay schedule and current spending pace.</p>`,
      safe >= 0
        ? `${days} days until payday — you're on track`
        : `Heads up: you may overspend before ${nextPay}`
    ),

    // ── 2. Spending Alert ────────────────────────
    spending_alert: () => wrap(`
      <h1>Your spending pace is high</h1>
      <p class="hl">You're on track to spend ${d.pacePct || 0}% of your income this month</p>

      <div class="stats"><div class="stat-row">
        <div class="stat"><div class="stat-val" style="color:#dc2626">${fmt(spent)}</div><div class="stat-lbl">Spent</div></div>
        <div class="stat"><div class="stat-val">${fmt(income)}</div><div class="stat-lbl">Income</div></div>
        <div class="stat"><div class="stat-val" style="color:${safeColor}">${safeStr}</div><div class="stat-lbl">Safe to Spend</div></div>
      </div></div>

      ${insight ? `<div class="${safe >= 0 ? 'box-g' : 'box-r'}"><p style="margin:0;font-size:13px;color:${safe >= 0 ? '#166534' : '#991b1b'}">${safe >= 0 ? '💡' : '⚠️'} ${insight}</p></div>` : ''}

      <div class="box">
        <p style="margin:0;font-size:13px;color:#92400e">At your current pace, you'll spend <strong>${fmt(projectedSpend || (spent / (new Date().getDate() || 1) * 30))}</strong> this month against <strong>${fmt(income)}</strong> in income.</p>
      </div>

      <p>A few things that can help:</p>
      <p style="margin:0 0 8px">· Review your transactions for anything unexpected</p>
      <p style="margin:0 0 8px">· Check for subscriptions you may have forgotten${recurringSummary.length ? ' like ' + listText(recurringSummary) : ''}</p>
      <p style="margin:0 0 14px">· Aim for <strong>${fmt(daily)}/day</strong> to stay on track</p>

      <a href="https://getflowcheck.app" class="cta">Review My Spending →</a>`,
      `Your spending this month is running high`
    ),

    // ── 3. Bills Due ─────────────────────────────
    bills_due: () => wrap(`
      <h1>${bills.length} bill${bills.length===1?'':'s'} due before ${nextPay}</h1>
      <p class="hl">Here's what's coming up and how it affects your finances</p>

      <div style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;padding:0 16px;margin:16px 0">
        ${bills.map(b => `<div class="bill-row">
          <div><div class="bill-name">${b.name}</div><div class="bill-due">Due ${b.dueDate}</div></div>
          <div class="bill-amt">${fmt(b.amount)}</div>
        </div>`).join('')}
        <div class="bill-row" style="background:#fafafa">
          <div class="bill-name" style="font-weight:700">Total</div>
          <div class="bill-amt" style="color:#F5A623">${fmt(billsTotal)}</div>
        </div>
      </div>

      ${safe >= 0
        ? `<div class="box-g"><p style="margin:0;font-size:13px;color:#166534">After these bills, you'll have <strong>${fmtSigned(safe - billsTotal)}</strong> remaining until ${nextPay}.</p></div>`
        : `<div class="box-r"><p style="margin:0;font-size:13px;color:#991b1b">These bills will put your safe-to-spend at <strong>${fmtSigned(safe)}</strong>. Consider adjusting discretionary spending.</p></div>`
      }

      <a href="https://getflowcheck.app" class="cta">Review Bills in FlowCheck →</a>`,
      `${bills.length} bill${bills.length===1?'':'s'} due before ${nextPay} — ${fmt(billsTotal)} total`
    ),

    // ── 4. Weekly Summary ────────────────────────
    weekly_summary: () => wrap(`
      <h1>Your week in review</h1>
      <p class="hl">${d.weekLabel || 'This week'} · ${days > 0 ? days + ' days until ' + nextPay : ''}</p>

      <div class="stats"><div class="stat-row">
        <div class="stat"><div class="stat-val" style="color:#dc2626">${fmt(spent)}</div><div class="stat-lbl">Spent</div></div>
        <div class="stat"><div class="stat-val" style="color:#16a34a">${fmt(income)}</div><div class="stat-lbl">Income</div></div>
        <div class="stat"><div class="stat-val" style="color:${safeColor}">${safeStr}</div><div class="stat-lbl">Safe to Spend</div></div>
      </div></div>

      ${topCategory ? `<p>Your top spending category was <strong>${topCategory}</strong>${topCategorySpend ? ' at ' + fmt(topCategorySpend) : ''}.</p>` : ''}
      ${biggestPurchase ? `<p>Your biggest purchase was <strong>${biggestPurchase}</strong> for <strong>${fmt(biggestPurchaseAmount)}</strong>.</p>` : ''}
      ${recurringSummary.length ? `<p>Recurring charges spotted this month: <strong>${listText(recurringSummary)}</strong>.</p>` : ''}

      ${daily > 0 ? `<div class="${safe >= 0 ? 'box-g' : 'box-r'}">
        <p style="margin:0;font-size:13px;color:${safe >= 0 ? '#166534' : '#991b1b'}">
          ${safe >= 0
            ? `💡 ${fmt(daily)}/day keeps you on track. You're in good shape.`
            : `⚠️ You're projected to overspend before ${nextPay}. Review spending now.`
          }
        </p>
      </div>` : ''}

      ${insight ? `<p class="sm">Smart insight: ${insight}</p>` : ''}

      ${bills.length > 0 ? `<p class="sm">📅 Reminder: ${bills.length} bill${bills.length===1?'':'s'} due before ${nextPay} — ${fmt(billsTotal)} total.</p>` : ''}

      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>`,
      `Your FlowCheck week in review`
    ),

    // ── 5. Re-engagement ─────────────────────────
    reengagement: () => wrap(`
      <h1>A quick check-in</h1>
      <p class="hl">Your finances have been running in the background</p>

      <p>Hi ${name}, you haven't opened FlowCheck in a while. Here's a quick snapshot of where things stand:</p>

      <div class="stats"><div class="stat-row">
        <div class="stat"><div class="stat-val" style="color:${safeColor}">${safeStr}</div><div class="stat-lbl">Safe to Spend</div></div>
        <div class="stat"><div class="stat-val" style="color:#dc2626">${fmt(spent)}</div><div class="stat-lbl">Spent This Month</div></div>
      </div></div>

      ${bills.length > 0 ? `<div class="box"><p style="margin:0;font-size:13px;color:#92400e">📅 You have ${bills.length} bill${bills.length===1?'':'s'} coming up — ${fmt(billsTotal)} total.</p></div>` : ''}
      ${insight ? `<div class="${safe >= 0 ? 'box-g' : 'box-r'}"><p style="margin:0;font-size:13px;color:${safe >= 0 ? '#166534' : '#991b1b'}">${safe >= 0 ? '💡' : '⚠️'} ${insight}</p></div>` : ''}

      <p>A two-minute check-in can help you stay ahead before things add up.</p>

      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="sm">If FlowCheck isn't working for you, reply to this email — we read every message.</p>`,
      `Hey ${name}, here's where your finances stand`
    ),

    // ── 6. Risk Warning ──────────────────────────
    risk_warning: () => wrap(`
      <h1>Your safe-to-spend is negative</h1>
      <p class="hl">You're projected to overspend before ${nextPay}</p>

      <div class="hero-num" style="color:#dc2626">${safeStr}</div>
      <div class="hero-sub">projected before ${nextPay}</div>

      <div class="stats"><div class="stat-row">
        <div class="stat"><div class="stat-val" style="color:#dc2626">${fmt(spent)}</div><div class="stat-lbl">Spent</div></div>
        <div class="stat"><div class="stat-val">${fmt(income)}</div><div class="stat-lbl">Income</div></div>
        <div class="stat"><div class="stat-val" style="color:#2563eb">${fmt(billsTotal + subsTotal)}</div><div class="stat-lbl">Obligations</div></div>
      </div></div>

      <div class="box-r">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#991b1b">What you can do right now:</p>
        <p style="margin:0 0 6px;font-size:13px;color:#991b1b">· Pause non-essential spending for a few days</p>
        <p style="margin:0 0 6px;font-size:13px;color:#991b1b">· Review your transactions for any surprises</p>
        <p style="margin:0;font-size:13px;color:#991b1b">· Check if any bills can be deferred until after ${nextPay}</p>
      </div>

      ${topCategory ? `<p class="sm">Top category so far: <strong>${topCategory}</strong>${topCategorySpend ? ' at ' + fmt(topCategorySpend) : ''}.</p>` : ''}
      ${recurringSummary.length ? `<p class="sm">Recurring charges in the mix: <strong>${listText(recurringSummary)}</strong>.</p>` : ''}
      ${insight ? `<p class="sm">Smart insight: ${insight}</p>` : ''}

      <a href="https://getflowcheck.app" class="cta">Review My Finances →</a>
      <p class="sm">This is just a heads up — not a judgment. Small adjustments now prevent bigger stress later.</p>`,
      `Action needed: you may overspend before ${nextPay}`
    ),

    // ── Core transactional emails ─────────────────
    welcome: () => wrap(`
      <h1>Welcome to FlowCheck</h1>
      <p>Hi ${name}, thanks for joining. You now have a calmer, smarter way to understand your money — what is safe to spend, what is changing, and what needs your attention next.</p>
      <div class="box-g"><p style="margin:0;font-size:13px;color:#166534">Start with your income, then link your bank account. That unlocks your safe-to-spend number, recurring charge detection, and proactive money alerts.</p></div>
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>
      <p class="sm">Questions? Just reply to this email — we read every message.</p>`,
      `Welcome to FlowCheck, ${name} 👋`
    ),

    trial_started: () => wrap(`
      <h1>Your free trial has started ✨</h1>
      <p>Hi ${name}, you now have 7 days of full Premium access — no charge today, cancel anytime.</p>
      <div class="box-g"><p style="margin:0;font-size:13px;color:#166534">Trial ends: <strong>${d.trialEndsAt || '7 days from now'}</strong>. Cancel anytime in iPhone Settings → Apple ID → Subscriptions.</p></div>
      <a href="https://getflowcheck.app" class="cta">Explore Premium →</a>`,
      `Your FlowCheck Premium trial has started ✨`
    ),

    trial_ending: () => wrap(`
      <h1>Your trial ends in ${d.daysLeft || 3} days</h1>
      <p>Hi ${name}, your trial ends on <strong>${d.trialEndsAt || 'soon'}</strong>.</p>
      <div class="box"><p style="margin:0;font-size:13px;color:#92400e">Premium is <strong>$2.08/month</strong> billed yearly or $4.99/month. Cancel anytime.</p></div>
      <a href="https://getflowcheck.app" class="cta">Keep Premium Access →</a>`,
      `Your FlowCheck trial ends in ${d.daysLeft || 3} days`
    ),

    subscription_active: () => wrap(`
      <h1>You're now Premium 🎉</h1>
      <p>Hi ${name}, your FlowCheck Premium subscription is active. Every feature is unlocked — thank you.</p>
      <div class="box-g"><p style="margin:0;font-size:13px;color:#166534">Plan: <strong>${d.plan === 'yearly' ? 'Yearly — $24.99/year' : 'Monthly — $4.99/month'}</strong>. Manage anytime in iPhone Settings → Apple ID → Subscriptions.</p></div>
      <a href="https://getflowcheck.app" class="cta">Open FlowCheck →</a>`,
      `FlowCheck Premium is now active 🎉`
    ),

    subscription_canceled: () => wrap(`
      <h1>Subscription canceled</h1>
      <p>Hi ${name}, your Premium subscription has been canceled. Your free features stay active forever.</p>
      <div class="box"><p style="margin:0;font-size:13px;color:#92400e">Changed your mind? Resubscribe anytime inside the app.</p></div>`,
      `Your FlowCheck subscription has been canceled`
    ),

    payment_failed: () => wrap(`
      <h1>Action needed: billing issue</h1>
      <p>Hi ${name}, we couldn't process your renewal payment. Your Premium access may be interrupted soon.</p>
      <div class="box-r"><p style="margin:0;font-size:13px;color:#991b1b">Update your payment method in <strong>iPhone Settings → Apple ID → Subscriptions → FlowCheck</strong>.</p></div>
      <a href="https://apps.apple.com/account/subscriptions" class="cta">Update Payment Method →</a>`,
      `Action needed: FlowCheck billing issue`
    ),

    account_deleted: () => wrap(`
      <h1>Account deleted</h1>
      <p>Hi ${name}, your FlowCheck account and all data have been permanently deleted as requested.</p>
      <div class="box"><p style="margin:0;font-size:13px;color:#92400e">If this was a mistake, contact us immediately at <a href="mailto:support@getflowcheck.app" style="color:#F5A623">support@getflowcheck.app</a>.</p></div>`,
      `Your FlowCheck account has been deleted`
    ),

    sync_issue: () => wrap(`
      <h1>Bank sync needs attention</h1>
      <p>Hi ${name}, we're having trouble syncing your <strong>${d.bankName || 'linked bank'}</strong>. This usually means your bank needs you to re-verify the connection.</p>
      <div class="box"><p style="margin:0;font-size:13px;color:#92400e">Open FlowCheck → More → Linked Accounts → tap Reconnect.</p></div>
      <a href="https://getflowcheck.app" class="cta">Reconnect Your Bank →</a>`,
      `Action needed: ${d.bankName || 'bank'} sync needs attention`
    ),
  };

  const fn = T[type];
  if (!fn) throw new Error('Unknown template: ' + type);
  return fn();
}

// ════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const url = (req.url || '').split('?')[0];

  // ── /api/email/events ──
  if (url.includes('/events')) {
    const { event, data = {} } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event' });
    if (!RESEND_API_KEY)   return res.status(500).json({ error: 'RESEND_API_KEY not set' });

    let authUser;
    try {
      authUser = await requireUser(req);
    } catch (err) {
      return res.status(err.statusCode || 401).json({ error: err.message });
    }

    let userEmail = authUser.email || '';
    let userName = authUser.name || '';
    if (!userEmail) {
      try {
        const user = await getUserInfo(authUser.uid);
        userEmail = user.email;
        userName = userName || user.name;
      } catch(err) {
        return res.status(400).json({ error: err.message });
      }
    }
    userName = userName || data.name || userEmail.split('@')[0] || 'there';

    let subject, html;
    try {
      ({ subject, html } = buildEmail(event, userName, data));
    } catch(err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const result = await sendViaResend(userEmail, subject, html);
      console.log(`[email] ${event} → ${userEmail} (${result?.id})`);
      return res.status(200).json({ success: true, id: result?.id });
    } catch(err) {
      console.error('[email] Resend error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── /api/email/scheduler ──
  if (url.includes('/scheduler')) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.SCHEDULER_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('[scheduler] Triggered at', new Date().toISOString());
    return res.status(200).json({ success: true, ran: new Date().toISOString() });
  }

  res.status(404).json({ error: 'Not found' });
};
