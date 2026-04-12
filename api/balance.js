const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { requireUser } = require('../lib/auth');
const { getPlaidItem } = require('../lib/plaid-store');

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
    const { item_id } = req.body || {};
    if (!item_id) return res.status(400).json({ error: 'Missing item_id' });

    const plaidItem = await getPlaidItem(user.uid, item_id);
    if (!plaidItem?.accessToken) {
      return res.status(404).json({ error: 'Linked account not found' });
    }

    const response = await plaid.accountsBalanceGet({ access_token: plaidItem.accessToken });
    res.json({ accounts: response.data.accounts });
  } catch (err) {
    console.error('balance error:', err?.response?.data || err.message);
    res.status(err.statusCode || 500).json({ error: err?.response?.data?.error_message || err.message });
  }
};
