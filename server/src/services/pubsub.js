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
// Two modes: (1) Fast template-based for simple events, (2) LLM-powered for richer context

export async function handleDataChangeEvent(message, firestoreDb, llm) {
  const { userId, source, changeType, data } = message;

  console.log(`[SuggestionWorker] Processing ${source}/${changeType} for ${userId}`);

  let suggestions = [];

  // ── Step 1: Fast template suggestions (immediate) ──
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

  // ── Step 2: LLM-powered smart suggestions (async, richer context) ──
  // When we have enough context, ask LLM to generate actionable suggestions
  if (llm && data && (data.snippet || data.body || data.description || data.attendees)) {
    try {
      const llmSuggestions = await generateSmartSuggestions(llm, userId, source, changeType, data, firestoreDb);
      suggestions.push(...llmSuggestions);
    } catch (err) {
      console.error('[SuggestionWorker] LLM suggestion generation failed:', err.message);
      // Template suggestions still go through
    }
  }

  // ── Step 3: Write to Firestore (frontend reads via onSnapshot) ──
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

// ── LLM-powered suggestion generation ──
// Analyzes incoming data with context and generates smart, actionable suggestions

async function generateSmartSuggestions(llm, userId, source, changeType, data, firestoreDb) {
  // Gather user preferences for personalization
  let userContext = '';
  try {
    const { getUserPreferences } = await import('./db.js');
    const prefs = await getUserPreferences(userId);
    if (prefs.length > 0) {
      userContext = '\nユーザーの特性: ' + prefs.slice(0, 5).map(p => `${p.key}=${JSON.stringify(p.value)}`).join(', ');
    }
  } catch { /* no preferences yet */ }

  // Build context string from event data
  let eventContext = '';
  switch (source) {
    case 'gmail':
      eventContext = `新着メール: From=${data.from || '不明'}, Subject="${data.subject || ''}", Snippet="${(data.snippet || data.body || '').substring(0, 300)}"`;
      break;
    case 'calendar':
      eventContext = `予定: ${data.summary || ''}, 時間=${data.startTime || '不明'}~${data.endTime || ''}, 場所=${data.location || '未設定'}, 参加者=${(data.attendees || []).join(', ') || 'なし'}, 説明="${(data.description || '').substring(0, 300)}"`;
      break;
    case 'slack':
      eventContext = `Slackメッセージ: #${data.channel || ''}, From=${data.sender || '不明'}, Text="${(data.text || '').substring(0, 300)}"`;
      break;
  }

  const prompt = `あなたはUILSON（AI業務アシスタント）のサジェスト生成エンジンです。
以下のイベントを分析して、ユーザーにとって有用なアクション提案を1〜2個生成してください。

イベント: ${eventContext}${userContext}

以下のJSON配列形式で回答してください（説明なし、JSONのみ）:
[
  {
    "type": "smart_${source}",
    "title": "短いタイトル（15文字以内）",
    "body": "簡潔な説明（30文字以内）",
    "action": "UILSONへの指示テキスト（ユーザーがクリックしたときにチャットに送信される）",
    "priority": "high または normal"
  }
]

ルール:
- 実用的で具体的なアクションのみ（「確認して」ではなく「返信を下書きして」「資料を準備して」等）
- 冗長にしない、最大2個
- タイトルには絵文字を含めない（フロントで付与）
- actionはUILSONが実行できる日本語の指示文`;

  try {
    const response = await llm.chat([
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 500,
    });

    const text = typeof response === 'string' ? response : response?.content || response?.text || '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate and sanitize
    return parsed
      .filter(s => s.title && s.action)
      .slice(0, 2)
      .map(s => ({
        type: s.type || `smart_${source}`,
        title: s.title.substring(0, 20),
        body: (s.body || '').substring(0, 50),
        action: s.action,
        priority: s.priority === 'high' ? 'high' : 'normal',
      }));
  } catch (err) {
    console.error('[SuggestionWorker] LLM parse error:', err.message);
    return [];
  }
}
