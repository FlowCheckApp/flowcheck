const { requireUser } = require('./_auth');
const { deletePlaidItem } = require('./_plaid-store');

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

    await deletePlaidItem(user.uid, item_id);
    res.json({ success: true });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Disconnect failed' });
  }
};
