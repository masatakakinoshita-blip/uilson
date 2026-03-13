// Memory Hierarchy: Working → Short-term → Long-term
// Working Memory:   Firestore (real-time, per-session, onSnapshot)
// Short-term:       Firestore (24h window, recent interactions)
// Long-term:        CloudSQL + pgvector (semantic search, persistent)

import { getFirestore } from 'firebase-admin/firestore';
import { searchMemories, saveMemory } from '../services/db.js';
import llmService from '../services/llm.js';

const WORKING_MEMORY_TTL = 30 * 60 * 1000;    // 30 min
const SHORT_TERM_TTL = 24 * 60 * 60 * 1000;   // 24 hours

// ── Working Memory (Firestore - real-time) ──

export async function getWorkingMemory(userId, sessionId) {
  const db = getFirestore();
  const doc = await db.collection('working_memory').doc(`${userId}_${sessionId}`).get();
  if (!doc.exists) return { messages: [], context: {} };
  const data = doc.data();
  // Check TTL
  if (data.updatedAt && Date.now() - data.updatedAt.toMillis() > WORKING_MEMORY_TTL) {
    return { messages: [], context: {} };
  }
  return { messages: data.messages || [], context: data.context || {} };
}

export async function setWorkingMemory(userId, sessionId, messages, context = {}) {
  const db = getFirestore();
  await db.collection('working_memory').doc(`${userId}_${sessionId}`).set({
    userId,
    sessionId,
    messages: messages.slice(-20), // Keep last 20 messages in working memory
    context,
    updatedAt: new Date(),
  });
}

// ── Short-term Memory (Firestore - 24h window) ──

export async function getShortTermMemory(userId, limit = 10) {
  const db = getFirestore();
  const cutoff = new Date(Date.now() - SHORT_TERM_TTL);

  const snap = await db.collection('short_term_memory')
    .where('userId', '==', userId)
    .where('createdAt', '>=', cutoff)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(d => d.data());
}

export async function addShortTermMemory(userId, type, content, metadata = {}) {
  const db = getFirestore();
  await db.collection('short_term_memory').add({
    userId,
    type, // 'interaction', 'suggestion_clicked', 'email_read', 'calendar_event'
    content,
    metadata,
    createdAt: new Date(),
  });
}

// ── Long-term Memory (CloudSQL + pgvector) ──

export async function recallLongTermMemory(userId, query, limit = 5) {
  const embedding = await llmService.embed(query);
  if (!embedding) return [];
  return searchMemories(userId, embedding, limit);
}

export async function storeLongTermMemory(userId, content, category = 'general', metadata = {}, importance = 0.5) {
  const embedding = await llmService.embed(content);
  if (!embedding) return null;
  return saveMemory(userId, content, embedding, category, metadata, importance);
}

// ── Consolidation Job (Cloud Scheduler triggers this) ──
// Moves important short-term memories to long-term storage

export async function consolidateMemories(userId) {
  const db = getFirestore();
  const cutoff = new Date(Date.now() - SHORT_TERM_TTL);

  // Get expired short-term memories
  const snap = await db.collection('short_term_memory')
    .where('userId', '==', userId)
    .where('createdAt', '<', cutoff)
    .limit(50)
    .get();

  if (snap.empty) return { consolidated: 0 };

  let consolidated = 0;

  for (const doc of snap.docs) {
    const mem = doc.data();

    // Only consolidate meaningful interactions
    if (mem.type === 'interaction' && mem.content?.length > 20) {
      await storeLongTermMemory(
        userId,
        mem.content,
        mem.metadata?.category || 'general',
        mem.metadata || {},
        mem.metadata?.importance || 0.3
      );
      consolidated++;
    }

    // Delete from short-term
    await doc.ref.delete();
  }

  console.log(`[Memory] Consolidated ${consolidated} memories for user ${userId}`);
  return { consolidated };
}

// ── Build full memory context for LLM ──

export async function buildFullMemoryContext(userId, sessionId, currentQuery) {
  const sections = [];

  // 1. Working memory (current session)
  const working = await getWorkingMemory(userId, sessionId);
  if (Object.keys(working.context).length > 0) {
    sections.push(`## 現在のセッション\n${JSON.stringify(working.context)}`);
  }

  // 2. Short-term (recent 24h interactions)
  const shortTerm = await getShortTermMemory(userId, 5);
  if (shortTerm.length > 0) {
    const recent = shortTerm.map(m => `- [${m.type}] ${m.content?.slice(0, 100)}`).join('\n');
    sections.push(`## 最近のアクティビティ（24時間以内）\n${recent}`);
  }

  // 3. Long-term (semantic recall based on current query)
  if (currentQuery) {
    const longTerm = await recallLongTermMemory(userId, currentQuery, 3);
    if (longTerm.length > 0) {
      const memories = longTerm
        .filter(m => m.similarity > 0.3)
        .map(m => `- [${m.category}] ${m.content} (関連度: ${Math.round(m.similarity * 100)}%)`)
        .join('\n');
      if (memories) {
        sections.push(`## 関連する長期記憶\n${memories}`);
      }
    }
  }

  return sections.length > 0 ? '\n\n' + sections.join('\n\n') : '';
}
