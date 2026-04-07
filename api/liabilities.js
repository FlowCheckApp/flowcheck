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
    const { item_id } = req.body || {};
    if (!item_id) return res.status(400).json({ error: 'Missing item_id' });

    const plaidItem = await getPlaidItem(user.uid, item_id);
    if (!plaidItem?.accessToken) {
      return res.status(404).json({ error: 'Linked account not found' });
    }

    const response = await plaid.liabilitiesGet({ access_token: plaidItem.accessToken });
    const liabilities = response.data.liabilities;

    // liabilities shape: { credit: [...], student: [...], mortgage: [...] }
    // Return it directly — the app's _mergePlaidDebts handles all three arrays
    res.json({ liabilities });
  } catch (err) {
    console.error('liabilities error:', err?.response?.data || err.message);
    const plaidErr = err?.response?.data;

    // PRODUCTS_NOT_SUPPORTED means this institution doesn't support liabilities
    if (plaidErr?.error_code === 'PRODUCTS_NOT_SUPPORTED') {
      return res.status(200).json({ liabilities: { credit: [], student: [], mortgage: [] }, warning: 'Liabilities not supported for this institution' });
    }
    // ITEM_LOGIN_REQUIRED means the bank connection expired
    if (plaidErr?.error_code === 'ITEM_LOGIN_REQUIRED') {
      return res.status(401).json({ error: 'ITEM_LOGIN_REQUIRED', message: 'Bank connection expired — please relink' });
    }
    // NO_LIABILITY_ACCOUNTS means the linked account has no debt products
    if (plaidErr?.error_code === 'NO_LIABILITY_ACCOUNTS') {
      return res.status(200).json({ liabilities: { credit: [], student: [], mortgage: [] }, warning: 'No liability accounts found' });
    }

    res.status(err.statusCode || 500).json({ error: plaidErr?.error_message || err.message });
  }
};
