// Self-Editing Memory Pattern (Letta/MemGPT inspired)
// LLM autonomously manages its own memory via Function Calling tools
// These tools are injected into every chat request so the LLM can decide
// when to save preferences, update context, or log work patterns.

import { saveUserPreference, getUserPreferences, logWorkPattern, saveMemory, searchMemories } from '../services/db.js';
import llmService from '../services/llm.js';

// ── Memory tools injected into LLM ──
// The LLM sees these as available tools and calls them when it detects
// information worth remembering (preferences, patterns, facts)

export const MEMORY_TOOLS = [
  {
    name: 'save_user_preference',
    description: 'ユーザーの好み・設定・スタイルを記憶する。例: 報告書のフォーマット好み、連絡手段の優先度、言語スタイルなど。ユーザーが明示的に述べた場合、または会話から推測できる場合に使う。',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: '好みのカテゴリ。例: "report_format", "communication_style", "meeting_preference"' },
        value: { description: '好みの内容（文字列、オブジェクト、配列いずれも可）' },
        confidence: { type: 'number', description: '確信度 0.0-1.0。明示=1.0、推測=0.3-0.7', default: 0.5 },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'update_user_context',
    description: 'ユーザーに関する重要な事実・文脈を長期記憶に保存する。例: プロジェクト名、チームメンバー、会社の規則、重要な日付など。後の会話で参照できるようにする。',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '記憶する内容。具体的に書く。' },
        category: {
          type: 'string',
          enum: ['project', 'team', 'company', 'personal', 'workflow', 'general'],
          description: 'カテゴリ',
          default: 'general',
        },
        importance: { type: 'number', description: '重要度 0.0-1.0', default: 0.5 },
      },
      required: ['content'],
    },
  },
  {
    name: 'log_work_pattern',
    description: 'ユーザーの仕事パターンを記録する。例: 「毎週月曜にチームミーティング」「午前中にメール処理」「金曜に週報作成」。繰り返し行動を検出した際に使う。',
    input_schema: {
      type: 'object',
      properties: {
        pattern_type: {
          type: 'string',
          enum: ['routine', 'habit', 'schedule', 'communication', 'decision'],
          description: 'パターンの種類',
        },
        description: { type: 'string', description: 'パターンの説明' },
        frequency: { type: 'string', description: '頻度。例: "毎週月曜", "毎日午前", "月末"' },
      },
      required: ['pattern_type', 'description'],
    },
  },
  {
    name: 'recall_memories',
    description: '過去に保存した記憶を検索する。ユーザーの好みや文脈を思い出したいときに使う。',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索クエリ（自然言語）' },
        category: { type: 'string', description: 'カテゴリでフィルタ（任意）' },
      },
      required: ['query'],
    },
  },
];

// ── Execute memory tool calls ──

export async function executeMemoryTool(userId, toolName, toolInput) {
  switch (toolName) {
    case 'save_user_preference': {
      await saveUserPreference(
        userId,
        toolInput.key,
        toolInput.value,
        'llm_inferred',
        toolInput.confidence || 0.5
      );
      return { success: true, message: `好み「${toolInput.key}」を記憶しました。` };
    }

    case 'update_user_context': {
      const embedding = await llmService.embed(toolInput.content);
      if (embedding) {
        await saveMemory(
          userId,
          toolInput.content,
          embedding,
          toolInput.category || 'general',
          {},
          toolInput.importance || 0.5
        );
      }
      return { success: true, message: `文脈「${toolInput.content.slice(0, 30)}...」を記憶しました。` };
    }

    case 'log_work_pattern': {
      await logWorkPattern(
        userId,
        toolInput.pattern_type,
        toolInput.description,
        { frequency: toolInput.frequency }
      );
      return { success: true, message: `パターン「${toolInput.description.slice(0, 30)}...」を記録しました。` };
    }

    case 'recall_memories': {
      const embedding = await llmService.embed(toolInput.query);
      if (!embedding) return { memories: [], message: 'エンベディング生成に失敗しました。' };

      const results = await searchMemories(userId, embedding, 5, toolInput.category || null);
      return {
        memories: results.map(r => ({
          content: r.content,
          category: r.category,
          similarity: Math.round(r.similarity * 100) / 100,
          importance: r.importance,
        })),
        message: `${results.length}件の記憶が見つかりました。`,
      };
    }

    default:
      return { error: `Unknown memory tool: ${toolName}` };
  }
}

// ── Build memory context for system prompt ──

export async function buildMemoryContext(userId) {
  const prefs = await getUserPreferences(userId);

  if (prefs.length === 0) return '';

  const prefLines = prefs
    .filter(p => p.confidence >= 0.3)
    .slice(0, 20)
    .map(p => `- ${p.key}: ${JSON.stringify(p.value)} (確信度: ${Math.round(p.confidence * 100)}%)`)
    .join('\n');

  return `\n\n## ユーザーの記憶（自動学習済み）\n${prefLines}\n\nこの情報を参考に、パーソナライズされた応答を心がけてください。新しい好みや事実を検出したら、memory toolsで記憶してください。`;
}
