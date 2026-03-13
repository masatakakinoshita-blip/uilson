// Suggestion API routes
// Pre-computed suggestions (written by Pub/Sub workers) + real-time suggestions

import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const router = Router();

// Get current suggestions for user
router.get('/:userId', async (req, res) => {
  try {
    const db = getFirestore();
    const now = new Date();

    const snap = await db.collection('suggestions')
      .where('userId', '==', req.params.userId)
      .where('read', '==', false)
      .where('expiresAt', '>', now)
      .orderBy('expiresAt')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const suggestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark suggestion as read/clicked
router.post('/:suggestionId/action', async (req, res) => {
  try {
    const db = getFirestore();
    const { action } = req.body; // 'clicked', 'dismissed'

    await db.collection('suggestions').doc(req.params.suggestionId).update({
      read: true,
      actionTaken: action,
      actionAt: new Date(),
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pub/Sub push endpoint (Eventarc sends data-change events here)
router.post('/compute', async (req, res) => {
  try {
    // Eventarc sends base64-encoded Pub/Sub message
    const message = req.body.message;
    if (!message?.data) {
      return res.status(400).json({ error: 'No message data' });
    }

    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const { handleDataChangeEvent } = await import('../services/pubsub.js');
    const db = getFirestore();
    const llm = (await import('../services/llm.js')).default;

    await handleDataChangeEvent(data, db, llm);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Suggest/Compute] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
