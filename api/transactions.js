const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { requireUser } = require('./_auth');
const { getPlaidItem } = require('./_plaid-store');

const plaid = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'production'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET':    process.env.PLAID_SECRET,
    },
  },
}));

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const { item_id, start_date, end_date } = req.body || {};
    if (!item_id) return res.status(400).json({ error: 'Missing item_id' });

    const plaidItem = await getPlaidItem(user.uid, item_id);
    if (!plaidItem?.accessToken) {
      return res.status(404).json({ error: 'Linked account not found' });
    }

    const now = new Date();
    const start = start_date || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const end   = end_date   || now.toISOString().split('T')[0];

    const response = await plaid.transactionsGet({
      access_token: plaidItem.accessToken,
      start_date: start,
      end_date:   end,
      options: { count: 500, offset: 0, include_personal_finance_category: true },
    });
    res.json({ transactions: response.data.transactions });
  } catch (err) {
    console.error('transactions error:', err?.response?.data || err.message);
    const plaidErr = err?.response?.data;
    if (plaidErr?.error_code === 'ITEM_LOGIN_REQUIRED') {
      return res.status(401).json({ error: 'ITEM_LOGIN_REQUIRED', message: 'Bank connection expired' });
    }
    res.status(err.statusCode || 500).json({ error: plaidErr?.error_message || err.message });
  }
};
