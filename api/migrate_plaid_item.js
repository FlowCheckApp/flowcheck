const { requireUser } = require('../lib/auth');
const { savePlaidItem } = require('../lib/plaid-store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const { item_id, access_token, institution, accounts, connected_at } = req.body || {};

    if (!item_id || !access_token) {
      return res.status(400).json({ error: 'Missing item_id or access_token' });
    }

    await savePlaidItem(user.uid, {
      itemId: item_id,
      accessToken: access_token,
      institution,
      accounts,
      createdAt: connected_at,
    });

    res.json({ success: true, item_id });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Migration failed' });
  }
};
