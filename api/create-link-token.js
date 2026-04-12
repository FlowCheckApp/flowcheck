const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');
const { requireUser } = require('../lib/auth');

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const requestedType = String(req.body?.requested_type || '').toLowerCase();
    const wantsDebtLink = requestedType === 'credit' || requestedType === 'debt' || requestedType === 'liabilities';
    const products = wantsDebtLink
      ? [Products.Transactions, Products.Liabilities]
      : [Products.Transactions];
    const optionalProducts = wantsDebtLink ? [] : [Products.Liabilities];

    const response = await client.linkTokenCreate({
      user: { client_user_id: user.uid },
      client_name: 'FlowCheck',
      products,
      optional_products: optionalProducts,
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('create_link_token error:', err.response?.data || err.message);
    res.status(err.statusCode || 500).json({
      error: err.response?.data?.error_message || err.message || 'Failed to create link token'
    });
  }
};
