const { requireUser } = require('./_auth');
const { deleteAllPlaidItems } = require('./_plaid-store');
const { auth, db } = require('../lib/firebase-admin');

async function deleteCollectionByUser(collectionName, userId) {
  const snapshot = await db.collection(collectionName).where('userId', '==', userId).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);

    let plaidDeleted = 0;
    try {
      plaidDeleted = await deleteAllPlaidItems(user.uid);
      await db.collection('userEmailState').doc(user.uid).delete().catch(() => {});
      await deleteCollectionByUser('emailLogs', user.uid).catch(() => {});
    } catch (error) {
      console.warn('[delete_account] Firestore cleanup skipped:', error.message || error);
    }

    try {
      await auth.deleteUser(user.uid);
    } catch (error) {
      if (error && error.code !== 'auth/user-not-found') throw error;
    }

    return res.json({ success: true, plaidDeleted });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message || 'Account deletion failed' });
  }
};
