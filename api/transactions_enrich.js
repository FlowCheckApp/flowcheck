const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { requireUser } = require('../lib/auth');

const plaid = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'production'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}));

function pickPrimaryCounterparty(counterparties) {
  if (!Array.isArray(counterparties) || !counterparties.length) return null;
  var sorted = counterparties.slice().sort(function(a, b) {
    var aScore = String((a && a.confidence_level) || '');
    var bScore = String((b && b.confidence_level) || '');
    var ranks = { VERY_HIGH: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
    return (ranks[bScore] || 0) - (ranks[aScore] || 0);
  });
  return sorted[0] || null;
}

function sanitizeEnrichedTransaction(tx) {
  const enrichments = tx && tx.enrichments ? tx.enrichments : {};
  const counterparty = pickPrimaryCounterparty(enrichments.counterparties);
  return {
    id: tx.id,
    merchant_name: enrichments.merchant_name || (counterparty && counterparty.name) || null,
    website: enrichments.website || (counterparty && counterparty.website) || null,
    logo_url: enrichments.logo_url || (counterparty && counterparty.logo_url) || null,
    payment_channel: enrichments.payment_channel || null,
    personal_finance_category: enrichments.personal_finance_category || null,
    counterparty_name: counterparty && counterparty.name ? counterparty.name : null,
    counterparty_type: counterparty && counterparty.type ? counterparty.type : null,
    counterparty_confidence: counterparty && counterparty.confidence_level ? counterparty.confidence_level : null,
    location: enrichments.location || null,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = req.body || {};
    const input = Array.isArray(body.transactions) ? body.transactions : [];
    if (!input.length) return res.status(400).json({ error: 'Missing transactions' });

    const cleaned = input
      .slice(0, 100)
      .map((tx) => {
        if (!tx || !tx.id || !tx.description || typeof tx.amount !== 'number') return null;
        return {
          id: String(tx.id),
          client_user_id: String(user.uid),
          client_account_id: tx.client_account_id ? String(tx.client_account_id) : undefined,
          account_type: tx.account_type === 'credit' ? 'credit' : 'depository',
          account_subtype: tx.account_subtype ? String(tx.account_subtype) : undefined,
          description: String(tx.description).slice(0, 280),
          amount: Math.abs(Number(tx.amount) || 0),
          direction: tx.direction === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
          iso_currency_code: String(tx.iso_currency_code || 'USD'),
          date_posted: tx.date_posted ? String(tx.date_posted) : undefined,
        };
      })
      .filter(Boolean);

    if (!cleaned.length) return res.status(400).json({ error: 'No valid transactions to enrich' });

    const grouped = cleaned.reduce((acc, tx) => {
      const key = tx.account_type === 'credit' ? 'credit' : 'depository';
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {});

    const out = [];
    for (const accountType of Object.keys(grouped)) {
      const response = await plaid.transactionsEnrich({
        account_type: accountType,
        transactions: grouped[accountType],
        options: {
          personal_finance_category_version: 'v2',
        },
      });
      const enriched = (response && response.data && response.data.enriched_transactions) || [];
      enriched.forEach((tx) => out.push(sanitizeEnrichedTransaction(tx)));
    }

    return res.status(200).json({ enrichments: out, unavailable: false });
  } catch (err) {
    const plaidErr = err && err.response && err.response.data ? err.response.data : null;
    const code = plaidErr && plaidErr.error_code ? plaidErr.error_code : '';
    const msg = (plaidErr && (plaidErr.error_message || plaidErr.error_code)) || err.message || 'Enrich failed';
    console.error('transactions_enrich error:', plaidErr || err.message);

    if (code === 'PRODUCT_NOT_ENABLED' || code === 'INVALID_PRODUCT' || /enrich/i.test(msg)) {
      return res.status(200).json({ enrichments: [], unavailable: true, reason: msg });
    }

    return res.status(err.statusCode || 500).json({ error: msg });
  }
};
