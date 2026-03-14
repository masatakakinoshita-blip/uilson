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

// Generate initial "zero-second" suggestions on user session start
// Frontend calls this once on load to populate suggestion cards
router.post('/generate/:userId', async (req, res) => {
  try {
    const db = getFirestore();
    const userId = req.params.userId;
    const now = new Date();

    // Check if we already have fresh suggestions (avoid re-generating within 30 min)
    const existing = await db.collection('suggestions')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .where('expiresAt', '>', now)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.json({ ok: true, message: 'Fresh suggestions exist', count: existing.size });
    }

    // Generate context-aware suggestions based on time of day
    const hour = now.getHours();
    const timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const suggestions = [];

    if (timeContext === 'morning') {
      suggestions.push({
        type: 'briefing',
        title: '今日のブリーフィング',
        body: '予定・メール・天気をまとめてチェック',
        action: 'おはよう！今日のブリーフィングをお願いします。',
        priority: 'high',
        userId,
        source: 'system',
        read: false,
        createdAt: now,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      });
    }

    if (timeContext === 'afternoon') {
      suggestions.push({
        type: 'status_check',
        title: '午後の進捗チェック',
        body: '残りの予定と未読メールを確認',
        action: '今日の残りの予定と対応が必要なメールを教えて。',
        priority: 'normal',
        userId,
        source: 'system',
        read: false,
        createdAt: now,
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });
    }

    if (timeContext === 'evening') {
      suggestions.push({
        type: 'daily_summary',
        title: '今日のまとめ',
        body: '今日の活動を振り返り',
        action: '今日一日のまとめを作ってください。明日の予定も教えて。',
        priority: 'normal',
        userId,
        source: 'system',
        read: false,
        createdAt: now,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }

    if (suggestions.length > 0) {
      const batch = db.batch();
      for (const sug of suggestions) {
        const ref = db.collection('suggestions').doc();
        batch.set(ref, sug);
      }
      await batch.commit();
    }

    res.json({ ok: true, count: suggestions.length });
  } catch (err) {
    console.error('[Suggest/Generate] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
