const { auth } = require('./firebase-admin');

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Missing authorization token');
    err.statusCode = 401;
    throw err;
  }

  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    const err = new Error('Invalid authorization token');
    err.statusCode = 401;
    err.cause = error;
    throw err;
  }
}

module.exports = {
  getBearerToken,
  requireUser,
};
