const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const basePath = PlaidEnvironments[PLAID_ENV] || PlaidEnvironments.sandbox;

const plaidConfig = new Configuration({
  basePath,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return res.status(500).json({ error: 'Plaid credentials not configured on the server' });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: `flowcheck-user-${Date.now()}`,
      },
      client_name: 'FlowCheck',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    return res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    const plaidError = error?.response?.data || error;
    console.error('Plaid link token error:', plaidError);
    return res.status(500).json({ error: 'Failed to create link token', details: plaidError });
  }
};