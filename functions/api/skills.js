// Firestore persistence for UILSON skills and execution logs
// Uses Firebase Admin SDK (auto-authenticates in Cloud Functions environment)
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action } = req.method === 'GET' ? req.query : (req.body || {});

    switch (action) {
      // ===== SKILLS =====
      case 'get_skills': {
        const snapshot = await db.collection('skills').limit(100).get();
        const skills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json({ ok: true, skills });
      }

      case 'save_skill': {
        const { skill } = req.body;
        if (!skill || !skill.id) return res.status(400).json({ error: 'skill.id required' });
        await db.collection('skills').doc(skill.id).set(skill, { merge: true });
        return res.json({ ok: true, skill });
      }

      case 'delete_skill': {
        const skillId = (req.body || {}).skillId || (req.query || {}).skillId;
        if (!skillId) return res.status(400).json({ error: 'skillId required' });
        await db.collection('skills').doc(skillId).delete();
        return res.json({ ok: true });
      }

      // ===== EXECUTION LOGS =====
      case 'get_logs': {
        const snapshot = await db.collection('execution_logs')
          .orderBy('timestamp', 'desc')
          .limit(200)
          .get();
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json({ ok: true, logs });
      }

      case 'save_log': {
        const { log } = req.body;
        if (!log || !log.id) return res.status(400).json({ error: 'log.id required' });
        await db.collection('execution_logs').doc(log.id).set(log, { merge: true });
        return res.json({ ok: true, log });
      }

      // ===== BULK SYNC =====
      case 'sync': {
        const { skills = [], logs = [] } = req.body;
        const results = { skillsSaved: 0, logsSaved: 0, errors: [] };

        // Save skills in batches (Firestore batch limit = 500)
        for (let i = 0; i < skills.length; i += 10) {
          const batch = db.batch();
          const chunk = skills.slice(i, i + 10);
          for (const skill of chunk) {
            if (skill && skill.id) {
              batch.set(db.collection('skills').doc(skill.id), skill, { merge: true });
              results.skillsSaved++;
            }
          }
          try {
            await batch.commit();
          } catch (e) {
            results.errors.push(`skills batch ${i}: ${e.message}`);
          }
        }

        // Save logs in batches
        for (let i = 0; i < logs.length; i += 20) {
          const batch = db.batch();
          const chunk = logs.slice(i, i + 20);
          for (const log of chunk) {
            if (log && log.id) {
              batch.set(db.collection('execution_logs').doc(log.id), log, { merge: true });
              results.logsSaved++;
            }
          }
          try {
            await batch.commit();
          } catch (e) {
            results.errors.push(`logs batch ${i}: ${e.message}`);
          }
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
