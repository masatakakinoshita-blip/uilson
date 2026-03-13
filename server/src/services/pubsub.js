// Pub/Sub service for event-driven suggestion pre-computation
// When data changes (Gmail, Calendar), publish events → trigger suggestion workers

import { PubSub } from '@google-cloud/pubsub';

let pubsub = null;
const TOPIC_NAMES = {
  DATA_CHANGE: 'uilson-data-change',
  SUGGESTION_COMPUTE: 'uilson-suggestion-compute',
  MEMORY_CONSOLIDATE: 'uilson-memory-consolidate',
};

export function initPubSub() {
  if (pubsub) return pubsub;

  pubsub = new PubSub({
    projectId: process.env.GCLOUD_PROJECT || 'uilson-489209',
  });

  console.log('[PubSub] Initialized');
  return pubsub;
}

// ── Publish events ──

export async function publishDataChange(userId, source, changeType, data = {}) {
  if (!pubsub) return;

  const message = {
    userId,
    source,      // 'gmail', 'calendar', 'slack'
    changeType,  // 'new_email', 'event_upcoming', 'new_message'
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    const topic = pubsub.topic(TOPIC_NAMES.DATA_CHANGE);
    await topic.publishMessage({ json: message });
    console.log(`[PubSub] Published data-change: ${source}/${changeType} for ${userId}`);
  } catch (err) {
    // Topic might not exist yet - create it
    if (err.code === 5) {
      await pubsub.createTopic(TOPIC_NAMES.DATA_CHANGE);
      const topic = pubsub.topic(TOPIC_NAMES.DATA_CHANGE);
      await topic.publishMessage({ json: message });
    } else {
      console.error('[PubSub] Publish error:', err.message);
    }
  }
}

export async function requestSuggestionCompute(userId, context = {}) {
  if (!pubsub) return;

  const message = {
    userId,
    context,
    timestamp: new Date().toISOString(),
  };

  try {
    const topic = pubsub.topic(TOPIC_NAMES.SUGGESTION_COMPUTE);
    await topic.publishMessage({ json: message });
  } catch (err) {
    if (err.code === 5) {
      await pubsub.createTopic(TOPIC_NAMES.SUGGESTION_COMPUTE);
      const topic = pubsub.topic(TOPIC_NAMES.SUGGESTION_COMPUTE);
      await topic.publishMessage({ json: message });
    } else {
      console.error('[PubSub] Suggestion compute error:', err.message);
    }
  }
}

export async function requestMemoryConsolidate(userId) {
  if (!pubsub) return;

  try {
    const topic = pubsub.topic(TOPIC_NAMES.MEMORY_CONSOLIDATE);
    await topic.publishMessage({ json: { userId, timestamp: new Date().toISOString() } });
  } catch (err) {
    console.error('[PubSub] Memory consolidate error:', err.message);
  }
}

// ── Suggestion pre-computation worker ──
// Called by Eventarc when data-change events arrive

export async function handleDataChangeEvent(message, firestoreDb, llm) {
  const { userId, source, changeType, data } = message;

  console.log(`[SuggestionWorker] Processing ${source}/${changeType} for ${userId}`);

  let suggestions = [];

  switch (source) {
    case 'gmail': {
      if (changeType === 'new_email' && data.subject) {
        suggestions.push({
          type: 'email_action',
          title: `📧 ${data.from || '新着メール'}`,
          body: data.subject,
          action: `このメールについて教えて: ${data.subject}`,
          priority: data.isImportant ? 'high' : 'normal',
        });
      }
      break;
    }

    case 'calendar': {
      if (changeType === 'event_upcoming' && data.summary) {
        suggestions.push({
          type: 'calendar_prep',
          title: `📅 ${data.summary}`,
          body: `${data.startTime || 'まもなく'} - 準備はOK？`,
          action: `「${data.summary}」の準備を手伝って`,
          priority: 'high',
        });
      }
      break;
    }

    case 'slack': {
      if (changeType === 'new_message' && data.channel) {
        suggestions.push({
          type: 'slack_update',
          title: `💬 #${data.channel}`,
          body: '新しいメッセージがあります',
          action: `Slackの#${data.channel}の最新メッセージを見せて`,
          priority: 'normal',
        });
      }
      break;
    }
  }

  // Write pre-computed suggestions to Firestore (frontend reads via onSnapshot)
  if (suggestions.length > 0 && firestoreDb) {
    const batch = firestoreDb.batch();
    for (const sug of suggestions) {
      const ref = firestoreDb.collection('suggestions').doc();
      batch.set(ref, {
        ...sug,
        userId,
        source,
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h TTL
      });
    }
    await batch.commit();
    console.log(`[SuggestionWorker] Wrote ${suggestions.length} suggestions for ${userId}`);
  }

  return suggestions;
}
