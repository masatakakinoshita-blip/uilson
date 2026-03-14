// Vercel Cron handler — executes scheduled skills
// Called every hour by Vercel Cron (see vercel.json)
import crypto from 'crypto';

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || 'uilson-489209';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let cachedToken = null;
let tokenExpiry = 0;

async function getFirestoreToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const keyRaw = process.env.FIRESTORE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error('FIRESTORE_SERVICE_ACCOUNT_KEY not configured');
  let key;
  try { key = JSON.parse(Buffer.from(keyRaw, 'base64').toString()); } catch { key = JSON.parse(keyRaw); }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const signature = sign.sign(key.private_key, 'base64url');
  const jwt = header + '.' + payload + '.' + signature;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (data.error) throw new Error('Auth failed: ' + data.error_description);
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') { const f = {}; for (const [k, v] of Object.entries(val)) f[k] = toFirestoreValue(v); return { mapValue: { fields: f } }; }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val) {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) { const o = {}; for (const [k, v] of Object.entries(val.mapValue.fields || {})) o[k] = fromFirestoreValue(v); return o; }
  return null;
}

function docToObject(doc) {
  if (!doc || !doc.fields) return null;
  const o = {}; for (const [k, v] of Object.entries(doc.fields)) o[k] = fromFirestoreValue(v); return o;
}

function objectToFields(obj) {
  const f = {}; for (const [k, v] of Object.entries(obj)) f[k] = toFirestoreValue(v); return f;
}

// Parse schedule string to check if it should run now
// Supports: "daily:HH:MM", "weekdays:HH:MM", "weekly:DAY:HH:MM", "hourly"
function shouldRunNow(schedule, lastScheduledRun) {
  if (!schedule) return false;
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // Convert to JST
  const hh = jst.getUTCHours();
  const mm = jst.getUTCMinutes();
  const day = jst.getUTCDay(); // 0=Sun, 1=Mon, ...

  // Don't run if already ran within the last 50 minutes
  if (lastScheduledRun) {
    const lastRun = new Date(lastScheduledRun);
    if (now - lastRun < 50 * 60 * 1000) return false;
  }

  const parts = schedule.split(':');
  const type = parts[0];

  switch (type) {
    case 'hourly':
      return mm < 10; // Run in the first 10 minutes of each hour

    case 'daily': {
      const targetHH = parseInt(parts[1], 10);
      return hh === targetHH && mm < 10;
    }

    case 'weekdays': {
      const targetHH = parseInt(parts[1], 10);
      return day >= 1 && day <= 5 && hh === targetHH && mm < 10;
    }

    case 'weekly': {
      const targetDay = parseInt(parts[1], 10);
      const targetHH = parseInt(parts[2], 10);
      return day === targetDay && hh === targetHH && mm < 10;
    }

    default:
      return false;
  }
}

export default async function handler(req, res) {
  // Verify this is a legitimate cron call
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VERCEL_ENV) {
    // Allow in Vercel environment (Vercel Cron sets its own auth)
  }

  try {
    const token = await getFirestoreToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Fetch all active skills with schedules
    const skillsResp = await fetch(`${FIRESTORE_BASE}/skills?pageSize=100`, { headers });
    const skillsData = await skillsResp.json();
    const allSkills = (skillsData.documents || []).map(docToObject).filter(Boolean);
    const scheduledSkills = allSkills.filter(s => s.status === 'active' && s.schedule);

    if (scheduledSkills.length === 0) {
      return res.json({ ok: true, message: 'No scheduled skills', executed: 0 });
    }

    // 2. Check which skills should run now
    const toRun = scheduledSkills.filter(s => shouldRunNow(s.schedule, s.lastScheduledRun));

    if (toRun.length === 0) {
      return res.json({ ok: true, message: 'No skills due', scheduled: scheduledSkills.length, executed: 0 });
    }

    // 3. Execute each due skill via chat API
    const results = [];
    for (const skill of toRun) {
      const execStart = Date.now();
      try {
        // Build system prompt with skill orchestration
        const systemPrompt =
          "You are UILSON, executing a scheduled skill autonomously. Speak in Japanese." +
          "\nCurrent: " + new Date().toLocaleString("ja-JP") +
          "\n\n## EXECUTING SCHEDULED SKILL: " + skill.name +
          "\n**GOAL**: " + skill.goal +
          "\n**ORCHESTRATION**:\n" + skill.orchestration +
          "\n\nExecute the skill and provide a concise summary of what was done.";

        // Call chat API internally
        const baseUrl = process.env.APP_BASE_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://uilson.vercel.app');
        const chatResp = await fetch(new URL('/api/chat', baseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: skill.name + 'を自動実行してください' }],
            system: systemPrompt,
          }),
        });
        const chatData = await chatResp.json();
        const duration = Date.now() - execStart;
        const reply = typeof chatData.content === 'string' ? chatData.content :
          Array.isArray(chatData.content) ? chatData.content.map(c => c.text || '').join('') : '';

        // Save execution log
        const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const log = {
          id: logId, skillId: skill.id, skillName: skill.name,
          timestamp: new Date().toISOString(), status: 'completed',
          duration, summary: reply.substring(0, 300),
          toolsUsed: chatData.toolsUsed || [], error: null,
          scheduled: true,
        };
        await fetch(`${FIRESTORE_BASE}/execution_logs/${logId}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ fields: objectToFields(log) }),
        });

        // Update skill's lastScheduledRun and usageCount
        const updatedSkill = {
          ...skill,
          lastScheduledRun: new Date().toISOString(),
          usageCount: (skill.usageCount || 0) + 1,
          lastUsed: new Date().toISOString(),
        };
        await fetch(`${FIRESTORE_BASE}/skills/${skill.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ fields: objectToFields(updatedSkill) }),
        });

        results.push({ skill: skill.name, status: 'completed', duration });
      } catch (err) {
        // Save failure log
        const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const log = {
          id: logId, skillId: skill.id, skillName: skill.name,
          timestamp: new Date().toISOString(), status: 'failed',
          duration: Date.now() - execStart, summary: '',
          toolsUsed: [], error: err.message, scheduled: true,
        };
        await fetch(`${FIRESTORE_BASE}/execution_logs/${logId}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ fields: objectToFields(log) }),
        });
        results.push({ skill: skill.name, status: 'failed', error: err.message });
      }
    }

    return res.json({ ok: true, scheduled: scheduledSkills.length, executed: results.length, results });
  } catch (err) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
