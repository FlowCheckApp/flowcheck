const { db } = require('../lib/firebase-admin');

const COLLECTION = 'plaidItems';

function itemDoc(userId, itemId) {
  return db.collection(COLLECTION).doc(`${userId}_${itemId}`);
}

async function savePlaidItem(userId, payload) {
  if (!userId || !payload || !payload.itemId || !payload.accessToken) {
    throw new Error('Missing plaid item fields');
  }

  const now = new Date().toISOString();
  await itemDoc(userId, payload.itemId).set({
    userId,
    itemId: payload.itemId,
    accessToken: payload.accessToken,
    institution: payload.institution || null,
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    createdAt: payload.createdAt || now,
    updatedAt: now,
  }, { merge: true });
}

async function getPlaidItem(userId, itemId) {
  if (!userId || !itemId) return null;
  const snapshot = await itemDoc(userId, itemId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function deletePlaidItem(userId, itemId) {
  if (!userId || !itemId) return;
  await itemDoc(userId, itemId).delete();
}

async function deleteAllPlaidItems(userId) {
  if (!userId) return 0;
  const snapshot = await db.collection(COLLECTION).where('userId', '==', userId).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

module.exports = {
  savePlaidItem,
  getPlaidItem,
  deletePlaidItem,
  deleteAllPlaidItems,
};
