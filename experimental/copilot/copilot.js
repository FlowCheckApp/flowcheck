// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK AI COPILOT — /api/copilot
//  Generates ranked daily financial action cards via Claude
//  Requires: ANTHROPIC_API_KEY env var
//  Auth: Firebase Bearer token (same pattern as other FC endpoints)
// ═══════════════════════════════════════════════════════════════

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FIREBASE_PROJECT_ID = 'flowcheck-46570';

// ── Verify Firebase ID token ──
async function verifyFirebaseToken(idToken) {
  // Allow demo/review account
  if (idToken === 'review-demo-token') {
    return { uid: 'review-demo-user', email: 'flowcheck.review@outlook.com' };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBtdCUetv2nRPiaZVt-_TXUtd77wxqLVSw`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    const data = await res.json();
    if (!res.ok || !data.users || !data.users[0]) throw new Error('Invalid token');
    return { uid: data.users[0].localId, email: data.users[0].email };
  } catch (e) {
    throw new Error('Unauthorized');
  }
}

// ── Build the prompt from user's financial snapshot ──
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
    isPremium = false
  } = snapshot;

  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  // Summarize budgets
  const budgetSummary = budgets.map(b => {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    return `${b.cat}: $${b.spent} spent of $${b.limit} (${pct}%, $${Math.max(0, b.limit - b.spent)} left, ${daysLeft} days left in month)`;
  }).join('\n');

  // Summarize debts
  const debtSummary = debts.map(d => {
    const dueSoon = d.dueDate && (new Date(d.dueDate) - new Date()) < 7 * 24 * 60 * 60 * 1000;
    return `${d.name}: $${d.bal} balance, ${d.apr}% APR, $${d.min} min payment${d.dueDate ? ', due ' + d.dueDate : ''}${dueSoon ? ' ⚠️ DUE SOON' : ''}`;
  }).join('\n');

  // Summarize bills due soon (next 14 days)
  const upcomingBills = bills.filter(b => {
    if (!b.dueDay) return false;
    const daysUntil = b.dueDay >= dayOfMonth ? b.dueDay - dayOfMonth : (daysInMonth - dayOfMonth) + b.dueDay;
    return daysUntil <= 14;
  }).map(b => {
    const daysUntil = b.dueDay >= dayOfMonth ? b.dueDay - dayOfMonth : (daysInMonth - dayOfMonth) + b.dueDay;
    return `${b.name}: $${b.amt}, due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  }).join('\n');

  // Recent spending patterns (last 7 days vs prior 7 days)
  const recentTxns = transactions.slice(0, 30);
  const spendingByCategory = {};
  recentTxns.forEach(tx => {
    if (!tx.isCredit && tx.cat !== 'Transfer' && tx.cat !== 'Debt Payment') {
      spendingByCategory[tx.cat] = (spendingByCategory[tx.cat] || 0) + tx.amt;
    }
  });
  const spendingSummary = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amt]) => `${cat}: $${Math.round(amt)}`)
    .join(', ');

  // Account balances
  const accountSummary = accounts.map(a => `${a.name} (${a.type}): $${a.balance}`).join(', ');

  // Savings goals
  const savingsSummary = savings.map(g => {
    const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
    return `${g.name}: $${g.saved} / $${g.target} (${pct}%)`;
  }).join('\n');

  return `You are FlowCheck's AI financial copilot. Your job is to generate a ranked list of personalized, actionable financial insights for a user's daily briefing.

TODAY: ${today}
USER: ${name || 'FlowCheck user'}
DAYS LEFT IN MONTH: ${daysLeft}
NET WORTH: ${netWorth != null ? '$' + netWorth : 'unknown'}

ACCOUNTS:
${accountSummary || 'No linked accounts'}

BUDGETS (this month):
${budgetSummary || 'No budgets set'}

DEBTS:
${debtSummary || 'No debts tracked'}

UPCOMING BILLS (next 14 days):
${upcomingBills || 'None upcoming'}

SAVINGS GOALS:
${savingsSummary || 'No savings goals'}

RECENT SPENDING BY CATEGORY (last 30 transactions):
${spendingSummary || 'No recent transactions'}

---

Generate 4-6 financial action cards for this user's daily briefing. Each card should be specific, personalized, and immediately actionable — not generic advice.

CARD TYPES and when to use them:
- "alert": Something urgent that needs attention TODAY (bill due in <3 days, budget blown, debt overdue). Use red urgency.
- "insight": A pattern or observation worth knowing (spending spike, good progress, unusual charge). Use blue urgency.  
- "move": A specific financial action they should take with clear benefit ($X saved, debt paid off X months earlier). Use green urgency.
- "win": Celebrate genuine progress (debt milestone, budget kept, savings goal hit). Use gold urgency.
- "drift": A subtle warning before it becomes a problem (budget at 80%, savings behind pace). Use amber urgency.

RULES:
1. Be SPECIFIC — use their actual numbers, not placeholders
2. Be CONCISE — headline max 8 words, body max 25 words
3. Rank by urgency/impact (most important first)
4. If a bill is due soon, that MUST be first
5. Include at least one "move" card with a concrete dollar action
6. If they have debts AND idle cash, suggest a specific paydown
7. Never be preachy or guilt-trippy — be a supportive coach
8. If data is sparse, generate fewer but higher-quality cards

Respond ONLY with a valid JSON array, no markdown, no explanation. Example format:
[
  {
    "type": "alert",
    "urgency": "red",
    "icon": "📅",
    "headline": "Visa payment due in 2 days",
    "body": "$340 minimum due April 13. Tap to mark paid or set a reminder.",
    "action": "Mark Paid",
    "actionType": "dismiss"
  }
]

actionType options: "dismiss" (mark done), "navigate" (go to a page), "none" (no action button)
For navigate actions, add "actionTarget": one of "budget", "debt", "savings", "bills", "transactions", "networth"`;
}

// ── Main handler ──
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  let user;
  try {
    user = await verifyFirebaseToken(token);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Parse body
  let snapshot;
  try {
    snapshot = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Require premium (or demo user)
  if (!snapshot.isPremium && user.uid !== 'review-demo-user') {
    // Free users get a teaser — 1 card
    snapshot._freeTeaser = true;
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const prompt = buildPrompt(snapshot);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[Copilot] Anthropic error:', errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const aiData = await anthropicRes.json();
    const rawText = (aiData.content && aiData.content[0] && aiData.content[0].text) || '[]';

    // Parse and validate cards
    let cards;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      cards = JSON.parse(cleaned);
      if (!Array.isArray(cards)) throw new Error('Not an array');
    } catch (e) {
      console.error('[Copilot] Parse error:', e.message, rawText.substring(0, 200));
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Enforce free teaser limit
    if (snapshot._freeTeaser) {
      cards = cards.slice(0, 1);
    }

    // Add unique IDs to each card
    cards = cards.map((card, i) => ({
      id: `card_${Date.now()}_${i}`,
      ...card
    }));

    return res.status(200).json({
      cards,
      generatedAt: new Date().toISOString(),
      isPremium: !!snapshot.isPremium,
      totalCards: cards.length
    });

  } catch (e) {
    console.error('[Copilot] Error:', e.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
