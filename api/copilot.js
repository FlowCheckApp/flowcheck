const { getBearerToken } = require('../lib/auth');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function getUserFromToken(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Missing authorization token');
    err.statusCode = 401;
    throw err;
  }
  if (token === 'review-demo-token') {
    return { uid: 'review-demo-user', email: 'flowcheck.review@outlook.com' };
  }
  const err = new Error('Unauthorized');
  err.statusCode = 401;
  throw err;
}

function buildPrompt(snapshot) {
  const {
    name,
    budgets = [],
    debts = [],
    bills = [],
    savings = [],
    transactions = [],
    netWorth,
    accounts = [],
    isPremium = false,
  } = snapshot || {};

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth);

  const budgetSummary = budgets.map((b) => {
    const limit = Number(b.limit || 0);
    const spent = Number(b.spent || 0);
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return `${b.cat || b.name}: $${spent} spent of $${limit} (${pct}% used)`;
  }).join('\n');

  const debtSummary = debts.map((d) => {
    return `${d.name}: $${Number(d.bal || 0)} balance, ${Number(d.apr || 0)}% APR, $${Number(d.min || 0)} minimum`;
  }).join('\n');

  const billSummary = bills.map((b) => {
    return `${b.name}: $${Number(b.amt || 0)}, due day ${b.dueDay || '?'}`;
  }).join('\n');

  const savingsSummary = savings.map((g) => {
    return `${g.name}: $${Number(g.saved || 0)} of $${Number(g.target || 0)}`;
  }).join('\n');

  const txSummary = transactions.slice(0, 20).map((tx) => {
    return `${tx.date || ''} | ${tx.cat || 'Other'} | $${Number(tx.amt || 0)}`;
  }).join('\n');

  const accountSummary = accounts.map((a) => {
    return `${a.name}: $${Number(a.balance || 0)} (${a.type || 'account'})`;
  }).join('\n');

  return `You are FlowCheck's premium money copilot.

Create a concise daily briefing for the user below.

USER: ${name || 'FlowCheck user'}
PREMIUM: ${isPremium ? 'yes' : 'no'}
DAYS LEFT IN MONTH: ${daysLeft}
NET WORTH: ${typeof netWorth === 'number' ? '$' + netWorth : 'unknown'}

ACCOUNTS:
${accountSummary || 'No accounts'}

BUDGETS:
${budgetSummary || 'No budgets'}

DEBTS:
${debtSummary || 'No debts'}

BILLS:
${billSummary || 'No bills'}

SAVINGS:
${savingsSummary || 'No savings goals'}

RECENT TRANSACTIONS:
${txSummary || 'No recent transactions'}

Return ONLY valid JSON array.
Give 4 cards for premium, 1 card for free users.

Each object must be:
{
  "type": "alert|insight|move|win|drift",
  "urgency": "red|blue|green|amber|gold",
  "icon": "short emoji or symbol",
  "headline": "max 8 words",
  "body": "max 25 words",
  "action": "short CTA or empty",
  "actionType": "navigate|dismiss|none",
  "actionTarget": "budget|debt|savings|bills|transactions|dashboard"
}

Rules:
- Use actual numbers from the snapshot
- Be supportive, specific, and actionable
- First card should be the most urgent or useful
- Never invent data that is not implied by the snapshot`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = getUserFromToken(req);
    const snapshot = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: buildPrompt(snapshot) }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[copilot] anthropic error:', errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const aiData = await response.json();
    const rawText = (aiData.content && aiData.content[0] && aiData.content[0].text) || '[]';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let cards = JSON.parse(cleaned);
    if (!Array.isArray(cards)) cards = [];

    const isPremiumUser = !!snapshot.isPremium || user.uid === 'review-demo-user';
    if (!isPremiumUser) cards = cards.slice(0, 1);

    cards = cards.map((card, idx) => ({
      id: `cp_${Date.now()}_${idx}`,
      type: card.type || 'insight',
      urgency: card.urgency || 'blue',
      icon: card.icon || '●',
      headline: card.headline || 'Your money update',
      body: card.body || 'FlowCheck has a new update for your plan.',
      action: card.action || '',
      actionType: card.actionType || 'none',
      actionTarget: card.actionTarget || 'dashboard',
    }));

    return res.status(200).json({
      cards,
      generatedAt: new Date().toISOString(),
      isPremium: isPremiumUser,
      totalCards: cards.length,
    });
  } catch (error) {
    console.error('[copilot] failed:', error.message || error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Copilot failed' });
  }
};
