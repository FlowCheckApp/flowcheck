const { getBearerToken } = require('../lib/auth');
const { auth, db } = require('../lib/firebase-admin');

async function getOptionalUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const event = String(body.event || '').trim();
    const props = body.props && typeof body.props === 'object' ? body.props : {};
    const anonymousId = String(body.anonymousId || '').slice(0, 120);
    const sessionId = String(body.sessionId || '').slice(0, 120);
    const platform = String(body.platform || 'ios').slice(0, 40);
    const appVersion = String(body.appVersion || '').slice(0, 40);

    if (!event) return res.status(400).json({ error: 'Missing event' });

    const user = await getOptionalUser(req);
    await db.collection('analyticsEvents').add({
      event,
      props,
      anonymousId: anonymousId || null,
      sessionId: sessionId || null,
      platform,
      appVersion: appVersion || null,
      userId: user ? user.uid : null,
      userEmail: user && user.email ? user.email : null,
      createdAt: new Date().toISOString(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[analytics] failed:', error.message || error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Analytics failed' });
  }
};
