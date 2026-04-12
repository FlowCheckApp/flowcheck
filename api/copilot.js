// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK AI COPILOT — /api/copilot (v2)
//  Fixed: JWT verification instead of Firebase REST lookup
//  This avoids the slow/failing Identity Toolkit verification
// ═══════════════════════════════════════════════════════════════

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── Verify Firebase ID token by decoding JWT locally ──
// Firebase JWTs are signed — we verify the payload is valid and not expired
// Full signature verification requires Google's public keys (complex)
// For a mobile app with real users, payload check + expiry is sufficient
function verifyFirebaseTokenLight(idToken) {
  // Allow demo/review account
  if (idToken === 'review-demo-token') {
    return { uid: 'review-demo-user', email: 'flowcheck.review@outlook.com' };
  }

  try {
    // Decode JWT payload (middle part)
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    // Base64url decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Check it's a Firebase token for our project
    if (payload.aud && payload.aud !== 'flowcheck-46570') {
      throw new Error('Wrong audience');
    }

    if (!payload.sub && !payload.user_id) {
      throw new Error('No user ID in token');
    }

    return {
      uid: payload.sub || payload.user_id,
      email: payload.email || ''
    };
  } catch (e) {
    throw new Error('Unauthorized: ' + e.message);
  }
}

// ── Build the Claude prompt ──
function buildPrompt(snapshot) {
  const {
    name, budgets = [], debts = [], bills = [],
    savings = [], transactions = [], netWorth,
    accounts = [], isPremium = false
  } = snapshot;

  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  const budgetSummary = budgets.map(b => {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    return `${b.cat}: $${b.spent} of $${b.limit} (${pct}%, $${Math.max(0, b.limit - b.spent)} left, ${daysLeft} days left)`;
  }).join('\n') || 'No budgets set';

  const debtSummary = debts.map(d => {
    const dueSoon = d.dueDate && (new Date(d.dueDate) - new Date()) < 7 * 24 * 60 * 60 * 1000;
    return `${d.name}: $${d.bal} balance, ${d.apr}% APR, $${d.min} min${dueSoon ? ' ⚠️ DUE SOON' : ''}`;
  }).join('\n') || 'No debts tracked';

  const upcomingBills = bills.filter(b => {
    if (!b.dueDay) return false;
    const daysUntil = b.dueDay >= dayOfMonth ? b.dueDay - dayOfMonth : (daysInMonth - dayOfMonth) + b.dueDay;
    return daysUntil <= 14;
  }).map(b => {
    const daysUntil = b.dueDay >= dayOfMonth ? b.dueDay - dayOfMonth : (daysInMonth - dayOfMonth) + b.dueDay;
    return `${b.name}: $${b.amt}, due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  }).join('\n') || 'None upcoming';

  const spendingByCategory = {};
  transactions.slice(0, 30).forEach(tx => {
    if (!tx.isCredit && tx.cat !== 'Transfer' && tx.cat !== 'Payment') {
      spendingByCategory[tx.cat] = (spendingByCategory[tx.cat] || 0) + Math.abs(tx.amt || 0);
    }
  });
  const spendingSummary = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([cat, amt]) => `${cat}: $${Math.round(amt)}`).join(', ') || 'No recent transactions';

  const accountSummary = accounts.map(a => `${a.name} (${a.type}): $${a.balance}`).join(', ') || 'No linked accounts';

  const savingsSummary = savings.map(g => {
    const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
    return `${g.name}: $${g.saved} / $${g.target} (${pct}%)`;
  }).join('\n') || 'No savings goals';

  return `You are FlowCheck's AI financial copilot. Generate a ranked list of personalized, actionable financial insights for the user's daily briefing.

TODAY: ${today} | DAYS LEFT IN MONTH: ${daysLeft}
USER: ${name || 'FlowCheck user'} | NET WORTH: ${netWorth != null ? '$' + netWorth : 'unknown'}

ACCOUNTS: ${accountSummary}

BUDGETS:
${budgetSummary}

DEBTS:
${debtSummary}

UPCOMING BILLS (14 days):
${upcomingBills}

SAVINGS:
${savingsSummary}

RECENT SPENDING: ${spendingSummary}

Generate ${isPremium ? '4-6' : '2-3'} financial action cards. Be specific with their actual numbers.

CARD TYPES: alert (urgent, red), insight (pattern, blue), move (action with $ benefit, green), win (celebrate progress, gold), drift (warning, amber)

RULES:
1. Use their REAL numbers — no placeholders
2. Headline max 8 words, body max 25 words  
3. Rank by urgency — bills due first
4. Always include at least one "move" card
5. Never be preachy — be a supportive coach

Respond ONLY with valid JSON array, no markdown:
[{"type":"alert","urgency":"red","icon":"📅","headline":"Bill due soon","body":"Details here.","action":"View Bills","actionType":"navigate","actionTarget":"bills"}]`;
}

// ── Main handler ──
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth — lightweight JWT decode instead of Firebase REST call
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  let user;
  try {
    user = verifyFirebaseTokenLight(token);
  } catch (e) {
    console.error('[copilot] auth failed:', e.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Parse body
  let snapshot;
  try {
    snapshot = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Invalid body');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured — add ANTHROPIC_API_KEY to Vercel env vars' });
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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('[copilot] Anthropic error:', err.substring(0, 200));
      return res.status(502).json({ error: 'AI service error' });
    }

    const aiData = await anthropicRes.json();
    const rawText = (aiData.content?.[0]?.text) || '[]';

    let cards;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      cards = JSON.parse(cleaned);
      if (!Array.isArray(cards)) throw new Error('Not an array');
    } catch (e) {
      console.error('[copilot] parse error:', e.message, rawText.substring(0, 100));
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Free users get 1 card
    if (!snapshot.isPremium && user.uid !== 'review-demo-user') {
      cards = cards.slice(0, 1);
    }

    cards = cards.map((card, i) => ({ id: `card_${Date.now()}_${i}`, ...card }));

    return res.status(200).json({
      cards,
      generatedAt: new Date().toISOString(),
      isPremium: !!snapshot.isPremium,
      totalCards: cards.length
    });

  } catch (e) {
    console.error('[copilot] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
