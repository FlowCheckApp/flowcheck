const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL     = 'FlowCheck <hello@getflowcheck.app>';
const SUPPORT_EMAIL  = 'flowcheckapp.help@outlook.com';

function sendResendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
    const options = {
      hostname: 'api.resend.com',
      path:     '/emails',
      method:   'POST',
      headers:  {
        'Authorization':  `Bearer ${RESEND_API_KEY}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const welcomeHtml = (name) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#111;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08)">
    <div style="font-size:40px;margin-bottom:16px">💰</div>
    <h1 style="margin:0;font-size:26px;font-weight:800">Welcome to FlowCheck</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,.5);font-size:15px">Your money, finally under control</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;color:rgba(255,255,255,.8)">Hey ${name || 'there'} 👋</p>
    <p style="font-size:15px;line-height:1.7;color:rgba(255,255,255,.6)">You just took the first step toward financial clarity. Here's what to do first:</p>
    <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0;border:1px solid rgba(255,255,255,.08)">
      <div style="margin-bottom:14px">🔗 <strong style="color:#fff">Connect your bank</strong> — auto-import transactions with Plaid</div>
      <div style="margin-bottom:14px">💼 <strong style="color:#fff">Set your budget</strong> — tell FlowCheck your income</div>
      <div>🎯 <strong style="color:#fff">Add a savings goal</strong> — track your progress</div>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,.35)">Questions? Reply to this email — we read every one.<br>— Brandon, FlowCheck</p>
  </div>
  <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.06);text-align:center">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,.2)">You're receiving this because you created a FlowCheck account.</p>
  </div>
</div>`;

const trialEndingHtml = (name, daysLeft) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#111;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08)">
    <div style="font-size:40px;margin-bottom:16px">⏰</div>
    <h1 style="margin:0;font-size:24px;font-weight:800">Trial ending in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h1>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;color:rgba(255,255,255,.8)">Hey ${name || 'there'},</p>
    <p style="font-size:15px;line-height:1.7;color:rgba(255,255,255,.6)">Your 7-day free trial ends soon. Keep access to everything — budgets, transactions, savings goals, and bank connections.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="https://apps.apple.com/us/app/flowcheck-money-manager/id6761015139" style="background:#F5A623;color:#000;text-decoration:none;padding:16px 32px;border-radius:100px;font-weight:700;font-size:16px;display:inline-block">Continue for $2.99/month →</a>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,.35)">Cancel anytime in Settings → Apple ID → Subscriptions.</p>
  </div>
</div>`;

const monthlySummaryHtml = (name, spendAmt, topCategory, savedAmt) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#111;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08)">
    <div style="font-size:40px;margin-bottom:16px">📊</div>
    <h1 style="margin:0;font-size:24px;font-weight:800">Your Monthly Summary</h1>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;color:rgba(255,255,255,.8)">Hey ${name || 'there'},</p>
    <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0;border:1px solid rgba(255,255,255,.08)">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="color:rgba(255,255,255,.5)">Total Spent</span><strong style="color:#fff">$${spendAmt||0}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="color:rgba(255,255,255,.5)">Top Category</span><strong style="color:#F5A623">${topCategory||'N/A'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:rgba(255,255,255,.5)">Saved</span><strong style="color:#4ade80">$${savedAmt||0}</strong>
      </div>
    </div>
  </div>
</div>`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, to, name, data = {} } = req.body;

    if (!to || !type) return res.status(400).json({ error: 'Missing to or type' });
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set. Available env keys:', Object.keys(process.env).filter(k => k.startsWith('RESEND')));
      return res.status(500).json({ error: 'Email not configured' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Invalid email' });

    let subject, html;
    if (type === 'welcome') {
      subject = `Welcome to FlowCheck, ${name || 'there'}! 🎉`;
      html = welcomeHtml(name);
    } else if (type === 'trial_ending') {
      subject = `Your free trial ends in ${data.daysLeft || 2} days ⏰`;
      html = trialEndingHtml(name, data.daysLeft || 2);
    } else if (type === 'monthly_summary') {
      subject = `Your FlowCheck monthly summary 📊`;
      html = monthlySummaryHtml(name, data.spendAmt, data.topCategory, data.savedAmt);
    } else {
      return res.status(400).json({ error: 'Unknown email type' });
    }

    const result = await sendResendEmail(to, subject, html);
    console.log('Resend response:', result.status, JSON.stringify(result.body));

    if (result.status >= 400) {
      return res.status(500).json({ error: result.body.message || result.body.name || 'Send failed' });
    }

    res.json({ success: true, id: result.body.id });
  } catch (err) {
    console.error('send_email error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
