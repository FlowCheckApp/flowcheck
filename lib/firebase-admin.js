const crypto = require('crypto');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const FIRESTORE_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : null;

let cachedServiceToken = null;
let cachedServiceTokenExpiresAt = 0;
let cachedSecureTokenCerts = null;
let cachedSecureTokenCertsExpiresAt = 0;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + padding, 'base64');
}

function safeJsonParse(buffer) {
  return JSON.parse(Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer || ''));
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };

  const type = typeof value;
  if (type === 'string') return { stringValue: value };
  if (type === 'boolean') return { booleanValue: value };
  if (type === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (type === 'object') {
    const fields = {};
    Object.entries(value).forEach(([key, nested]) => {
      if (nested !== undefined) fields[key] = toFirestoreValue(nested);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    const out = {};
    const fields = value.mapValue.fields || {};
    Object.entries(fields).forEach(([key, nested]) => {
      out[key] = fromFirestoreValue(nested);
    });
    return out;
  }
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

function firestoreDocToData(doc) {
  const out = {};
  Object.entries(doc.fields || {}).forEach(([key, value]) => {
    out[key] = fromFirestoreValue(value);
  });
  return out;
}

async function getServiceAccessToken() {
  requireEnv('FIREBASE_PROJECT_ID', FIREBASE_PROJECT_ID);
  requireEnv('FIREBASE_CLIENT_EMAIL', FIREBASE_CLIENT_EMAIL);
  requireEnv('FIREBASE_PRIVATE_KEY', FIREBASE_PRIVATE_KEY);

  const now = Math.floor(Date.now() / 1000);
  if (cachedServiceToken && now < cachedServiceTokenExpiresAt - 60) {
    return cachedServiceToken;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: [
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/identitytoolkit',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(FIREBASE_PRIVATE_KEY, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const assertion = `${unsigned}.${signature}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Google service token');
  }

  cachedServiceToken = data.access_token;
  cachedServiceTokenExpiresAt = now + Number(data.expires_in || 3600);
  return cachedServiceToken;
}

async function googleApi(path, options = {}) {
  const token = await getServiceAccessToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.error || `Google API request failed (${response.status})`);
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

async function getSecureTokenCerts() {
  const now = Date.now();
  if (cachedSecureTokenCerts && now < cachedSecureTokenCertsExpiresAt) {
    return cachedSecureTokenCerts;
  }

  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  const certs = await response.json();
  const cacheControl = response.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = match ? Number(match[1]) : 3600;

  cachedSecureTokenCerts = certs;
  cachedSecureTokenCertsExpiresAt = now + maxAgeSeconds * 1000;
  return certs;
}

async function verifyIdToken(idToken) {
  requireEnv('FIREBASE_PROJECT_ID', FIREBASE_PROJECT_ID);
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing ID token');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed ID token');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = safeJsonParse(base64UrlDecode(encodedHeader));
  const payload = safeJsonParse(base64UrlDecode(encodedPayload));

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid ID token header');
  }

  const certs = await getSecureTokenCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown Firebase signing key');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const signature = base64UrlDecode(encodedSignature);
  const valid = verifier.verify(cert, signature);
  if (!valid) {
    throw new Error('Invalid ID token signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Invalid token audience');
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error('Invalid token issuer');
  if (payload.exp && now >= payload.exp) throw new Error('ID token expired');
  if (payload.iat && now < payload.iat) throw new Error('ID token not yet valid');

  return {
    ...payload,
    uid: payload.user_id || payload.sub,
  };
}

async function getUser(uid) {
  return googleApi(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:lookup`, {
    method: 'POST',
    body: JSON.stringify({ localId: [uid] }),
  }).then((data) => {
    const user = data.users && data.users[0];
    if (!user) {
      const error = new Error('User not found');
      error.code = 'auth/user-not-found';
      throw error;
    }
    return {
      uid: user.localId,
      email: user.email || null,
      displayName: user.displayName || null,
    };
  });
}

async function deleteUser(uid) {
  try {
    await googleApi(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:delete`, {
      method: 'POST',
      body: JSON.stringify({ localId: uid }),
    });
  } catch (error) {
    if (error.response?.error?.message === 'USER_NOT_FOUND') {
      error.code = 'auth/user-not-found';
    }
    throw error;
  }
}

function docPath(collectionName, docId) {
  return `${FIRESTORE_BASE}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
}

async function getDocument(collectionName, docId) {
  try {
    return await googleApi(docPath(collectionName, docId));
  } catch (error) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

async function setDocument(collectionName, docId, data, options = {}) {
  const query = options.merge ? '?updateMask.fieldPaths=' + Object.keys(data).map(encodeURIComponent).join('&updateMask.fieldPaths=') : '';
  return googleApi(`${docPath(collectionName, docId)}${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFirestoreValue(data).mapValue.fields || {} }),
  });
}

async function deleteDocument(collectionName, docId) {
  try {
    await googleApi(docPath(collectionName, docId), { method: 'DELETE' });
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }
}

async function addDocument(collectionName, data) {
  const id = crypto.randomUUID();
  await setDocument(collectionName, id, data);
  return { id };
}

async function runSimpleQuery(collectionName, field, operator, value) {
  if (operator !== '==') {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  const response = await googleApi(`${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: toFirestoreValue(value),
          },
        },
      },
    }),
  });

  return response
    .map((entry) => entry.document)
    .filter(Boolean)
    .map((doc) => {
      const id = doc.name.split('/').pop();
      return makeDocSnapshot(collectionName, id, doc);
    });
}

function makeDocSnapshot(collectionName, docId, rawDoc) {
  return {
    id: docId,
    exists: Boolean(rawDoc),
    data: () => (rawDoc ? firestoreDocToData(rawDoc) : undefined),
    ref: makeDocRef(collectionName, docId),
  };
}

function makeDocRef(collectionName, docId) {
  return {
    id: docId,
    async get() {
      const raw = await getDocument(collectionName, docId);
      return makeDocSnapshot(collectionName, docId, raw);
    },
    async set(data, options) {
      return setDocument(collectionName, docId, data, options);
    },
    async delete() {
      return deleteDocument(collectionName, docId);
    },
  };
}

function makeCollectionRef(collectionName) {
  return {
    doc(docId) {
      return makeDocRef(collectionName, docId);
    },
    where(field, operator, value) {
      return {
        async get() {
          const docs = await runSimpleQuery(collectionName, field, operator, value);
          return {
            empty: docs.length === 0,
            size: docs.length,
            docs,
          };
        },
      };
    },
    async add(data) {
      return addDocument(collectionName, data);
    },
  };
}

function makeBatch() {
  const deletes = [];
  return {
    delete(ref) {
      deletes.push(ref);
    },
    async commit() {
      await Promise.all(deletes.map((ref) => ref.delete()));
    },
  };
}

const auth = {
  verifyIdToken,
  deleteUser,
  getUser,
};

const db = {
  collection: makeCollectionRef,
  batch: makeBatch,
};

const admin = {
  apps: [{}],
  initializeApp() {
    return admin;
  },
  credential: {
    cert(config) {
      return config;
    },
  },
  auth() {
    return auth;
  },
  firestore() {
    return db;
  },
};

module.exports = { admin, auth, db };
