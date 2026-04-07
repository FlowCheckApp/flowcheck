const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { requireUser } = require('./_auth');
const { savePlaidItem } = require('./_plaid-store');

const client = new PlaidApi(new Configuration({
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
    const { public_token, institution, accounts } = req.body;
    if (!public_token) return res.status(400).json({ error: 'public_token required' });

    const response = await client.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    const item_id     = response.data.item_id;

    await savePlaidItem(user.uid, {
      itemId: item_id,
      accessToken: access_token,
      institution,
      accounts,
    });

    res.json({ item_id, institution, accounts });
  } catch (err) {
    console.error('exchange_token error:', err.response?.data || err.message);
    res.status(err.statusCode || 500).json({
      error: err.response?.data?.error_message || err.message || 'Exchange failed'
    });
  }
};
