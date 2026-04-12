const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { requireUser } = require('../lib/auth');
const { savePlaidItem, listPlaidItems, deletePlaidItem } = require('../lib/plaid-store');

function sameInstitution(existing, institution) {
  if (!existing || !institution) return false;
  const existingId = String(existing.institution?.institution_id || existing.institution?.id || '').trim();
  const nextId = String(institution.institution_id || institution.id || '').trim();
  if (existingId && nextId && existingId === nextId) return true;
  const existingName = String(existing.institution?.name || '').trim().toLowerCase();
  const nextName = String(institution.name || '').trim().toLowerCase();
  return !!(existingName && nextName && existingName === nextName);
}

function hasOverlappingAccounts(existing, accounts) {
  const existingAccounts = Array.isArray(existing?.accounts) ? existing.accounts : [];
  const nextAccounts = Array.isArray(accounts) ? accounts : [];
  if (!existingAccounts.length || !nextAccounts.length) return false;
  const nextIds = new Set(nextAccounts.map((acct) => acct && acct.id).filter(Boolean));
  return existingAccounts.some((acct) => acct && acct.id && nextIds.has(acct.id));
}

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

    const existingItems = await listPlaidItems(user.uid);
    const staleItems = existingItems.filter((item) => {
      if (!item || !item.itemId || item.itemId === item_id) return false;
      if (sameInstitution(item, institution)) return true;
      if (hasOverlappingAccounts(item, accounts)) return true;
      return false;
    });

    for (const stale of staleItems) {
      try {
        if (stale.accessToken) {
          await client.itemRemove({ access_token: stale.accessToken });
        }
      } catch (removeErr) {
        console.warn('exchange_token stale itemRemove warning:', stale.itemId, removeErr.response?.data || removeErr.message);
      }
      try {
        await deletePlaidItem(user.uid, stale.itemId);
      } catch (deleteErr) {
        console.warn('exchange_token stale delete warning:', stale.itemId, deleteErr.message);
      }
    }

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
