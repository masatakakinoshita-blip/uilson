// Memory API routes
// Endpoints for frontend to interact with memory system

import { Router } from 'express';
import { getUserPreferences } from '../services/db.js';
import { consolidateMemories, getShortTermMemory, recallLongTermMemory } from '../memory/hierarchy.js';

const router = Router();

// Get user's stored preferences
router.get('/preferences/:userId', async (req, res) => {
  try {
    const prefs = await getUserPreferences(req.params.userId);
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent short-term memories
router.get('/recent/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const memories = await getShortTermMemory(req.params.userId, limit);
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Semantic search in long-term memory
router.post('/search', async (req, res) => {
  try {
    const { userId, query, limit } = req.body;
    if (!userId || !query) return res.status(400).json({ error: 'userId and query required' });

    const results = await recallLongTermMemory(userId, query, limit || 5);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger memory consolidation (called by Cloud Scheduler)
router.post('/consolidate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const result = await consolidateMemories(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
