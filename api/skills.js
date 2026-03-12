// Firestore persistence for UILSON skills and execution logs
// Uses Firestore REST API with service account JWT auth
import crypto from 'crypto';

const PROJECT_ID = 'uilson-app';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Cache access token in module scope
let cachedToken = null;
let tokenExpiry = 0;

async function getFirestoreToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

  const keyRaw = process.env.FIRESTORE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error('FIRESTORE_SERVICE_ACCOUNT_KEY not configured');

  let key;
  try {
    key = JSON.parse(Buffer.from(keyRaw, 'base64').toString());
  } catch {
    key = JSON.parse(keyRaw);
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const signature = sign.sign(key.private_key, 'base64url');
  const jwt = header + '.' + payload + '.' + signature;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (data.error) throw new Error('Firestore auth failed: ' + (data.error_description || data.error));

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

// Convert JS object to Firestore Value format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore Value to JS object
function fromFirestoreValue(val) {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

// Convert a Firestore document to a plain JS object
function docToObject(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = fromFirestoreValue(v);
  }
  return obj;
}

// Convert a JS object to Firestore document fields
function objectToFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getFirestoreToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const { action } = req.method === 'GET' ? req.query : req.body;

    switch (action) {
      // ===== SKILLS =====
      case 'get_skills': {
        // List all skills from the "skills" collection
        const resp = await fetch(`${FIRESTORE_BASE}/skills?pageSize=100`, { headers });
        const data = await resp.json();
        const skills = (data.documents || []).map(docToObject).filter(Boolean);
        return res.json({ ok: true, skills });
      }

      case 'save_skill': {
        const { skill } = req.body;
        if (!skill || !skill.id) return res.status(400).json({ error: 'skill.id required' });
        // Upsert skill document
        const resp = await fetch(`${FIRESTORE_BASE}/skills/${skill.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: objectToFields(skill) }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        return res.json({ ok: true, skill: docToObject(data) });
      }

      case 'delete_skill': {
        const skillId = req.body.skillId || req.query.skillId;
        if (!skillId) return res.status(400).json({ error: 'skillId required' });
        await fetch(`${FIRESTORE_BASE}/skills/${skillId}`, {
          method: 'DELETE',
          headers,
        });
        return res.json({ ok: true });
      }

      // ===== EXECUTION LOGS =====
      case 'get_logs': {
        // Get recent execution logs, ordered by timestamp desc
        // Firestore REST API structured query
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: 'execution_logs' }],
            orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
            limit: 200,
          },
        };
        const resp = await fetch(
          `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
          { method: 'POST', headers, body: JSON.stringify(queryBody) }
        );
        const data = await resp.json();
        const logs = (data || [])
          .filter(r => r.document)
          .map(r => docToObject(r.document))
          .filter(Boolean);
        return res.json({ ok: true, logs });
      }

      case 'save_log': {
        const { log } = req.body;
        if (!log || !log.id) return res.status(400).json({ error: 'log.id required' });
        const resp = await fetch(`${FIRESTORE_BASE}/execution_logs/${log.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: objectToFields(log) }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        return res.json({ ok: true, log: docToObject(data) });
      }

      // ===== BULK SYNC =====
      case 'sync': {
        // Full sync: save all skills and logs at once (for initial migration from localStorage)
        const { skills = [], logs = [] } = req.body;
        const results = { skillsSaved: 0, logsSaved: 0, errors: [] };

        // Save skills in parallel (batch of 10)
        for (let i = 0; i < skills.length; i += 10) {
          const batch = skills.slice(i, i + 10);
          await Promise.all(batch.map(async (skill) => {
            try {
              await fetch(`${FIRESTORE_BASE}/skills/${skill.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ fields: objectToFields(skill) }),
              });
              results.skillsSaved++;
            } catch (e) {
              results.errors.push(`skill ${skill.id}: ${e.message}`);
            }
          }));
        }

        // Save logs in parallel (batch of 20)
        for (let i = 0; i < logs.length; i += 20) {
          const batch = logs.slice(i, i + 20);
          await Promise.all(batch.map(async (log) => {
            try {
              await fetch(`${FIRESTORE_BASE}/execution_logs/${log.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ fields: objectToFields(log) }),
              });
              results.logsSaved++;
            } catch (e) {
              results.errors.push(`log ${log.id}: ${e.message}`);
            }
          }));
        }

        return res.json({ ok: true, ...results });
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Skills API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
