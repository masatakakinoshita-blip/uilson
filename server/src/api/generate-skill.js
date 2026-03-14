const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

async function callGemini(apiKey, reqBody) {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (resp.status === 404 || resp.status === 403) continue;
    const data = await resp.json();
    if (data.error && (data.error.code === 404 || data.error.status === 'NOT_FOUND')) continue;
    return { data, model };
  }
  return { data: { error: { message: 'All Gemini models unavailable' } }, model: null };
}

// Action permission ID → human-readable description
const ACTION_MAP = {
  gmail_send: 'Gmailでメール送信・ドラフト作成 (gmail_create_draft, gmail_send_draft, gmail_send_direct)',
  gmail_manage: 'Gmailの整理 (gmail_trash, gmail_modify_labels)',
  calendar_write: 'Googleカレンダー予定の作成・変更・削除 (calendar_create_event, calendar_update_event, calendar_delete_event)',
  drive_write: 'Google Docsの作成 (google_drive_create_doc)',
  outlook_send: 'Outlookでメール送信・ドラフト作成 (outlook_create_draft)',
  outlook_manage: 'Outlookの整理 (outlook_delete_mail, outlook_move_mail, outlook_mark_read, outlook_flag_mail)',
  outlook_cal_write: 'Outlook予定の作成・変更・削除 (outlook_calendar_create, outlook_calendar_update, outlook_calendar_delete)',
  slack_send: 'SlackでDM送信 (slack_send_dm)',
};

const GATE_LABELS = {
  send_email: 'メール送信前に必ずユーザーに確認を取る',
  send_message: 'Slack/Teamsメッセージ送信前にユーザーに確認を取る',
  create_event: 'カレンダー予定作成前にユーザーに確認を取る',
  delete_anything: 'メール・予定・ファイルの削除前にユーザーに確認を取る',
  create_document: 'ドキュメント作成前にユーザーに確認を取る',
  final_output: '最終結果をユーザーに提示して確認を取る',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return generateFallback(req, res);

  const { name, goal, actionPermissions, constraints, approvalGates, context } = req.body;
  if (!name || !goal) {
    return res.status(400).json({ error: 'name and goal are required' });
  }

  const actionList = (actionPermissions || []).map(ap => ACTION_MAP[ap] || ap).join('\n') || 'なし（読み取り専用モード）';
  const constraintList = (constraints || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'なし';
  const gateList = (approvalGates || []).map(g => GATE_LABELS[g] || g).join('\n') || 'なし（全て自動実行可）';

  const systemPrompt = `You are an AI orchestration plan generator for UILSON, an enterprise AI business assistant.

CRITICAL ARCHITECTURE RULE:
- INFORMATION GATHERING (search/read) is ALWAYS unrestricted. The AI can freely use ALL search/read tools:
  gmail_search, calendar_list_events, calendar_find_free_time, google_drive_search, google_drive_list, google_drive_get_content,
  outlook_search_mail, outlook_list_events, outlook_list_folders, outlook_get_attachments,
  teams_list_chats, teams_get_chat_messages, teams_list_teams_channels, teams_get_channel_messages,
  sharepoint_search_sites, sharepoint_list_files, sharepoint_search_files, sharepoint_get_file_content,
  slack_search_users, slack_read_dm, web_search, weather_forecast, gmail_list_labels, gmail_get_attachments
- Only WRITE/SEND/CREATE/DELETE actions are restricted by permissions.

Given a skill definition, generate:
1. A detailed orchestration plan in Japanese
2. Trigger keywords that should activate this skill

The plan MUST:
- Clearly separate information gathering (unrestricted) from actions (restricted)
- Use the Plan→Execute→Observe pattern
- Include specific tool names for each step
- Include decision points and error handling
- Include approval gates at specified points

Output MUST be valid JSON:
{
  "orchestration": "full orchestration plan string in Japanese with markdown formatting",
  "triggers": ["keyword1", "keyword2", ...]
}

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or extra text.`;

  const userContent = `スキル名: ${name}
ゴール: ${goal}
補足情報: ${context || 'なし'}

許可されたアクション（書き込み系）:
${actionList}

制約条件:
${constraintList}

承認ゲート:
${gateList}

情報収集（検索・閲覧）は全サービスで常に許可。Web検索、天気APIも自由に使える。
上記の情報から、AIが自律的にこのタスクを実行できるオーケストレーション計画を生成してください。`;

  try {
    const { data } = await callGemini(apiKey, {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContent }] }
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    });

    if (data.error) return generateFallback(req, res);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try {
      const cleaned = text.replace(/\`\`\`json\s*/g, '').replace(/\`\`\`\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) { return generateFallback(req, res); }
      } else {
        return generateFallback(req, res);
      }
    }

    return res.status(200).json({
      orchestration: parsed.orchestration || '',
      triggers: parsed.triggers || [name],
    });
  } catch (err) {
    console.error('Generate skill error:', err);
    return generateFallback(req, res);
  }
}

function generateFallback(req, res) {
  const { name, goal, actionPermissions, constraints, approvalGates, context } = req.body;

  const actionNames = (actionPermissions || []).map(ap => {
    const names = { gmail_send: 'Gmailで送信', gmail_manage: 'Gmail整理', calendar_write: 'カレンダー操作', drive_write: 'ドキュメント作成', outlook_send: 'Outlookで送信', outlook_manage: 'Outlook整理', outlook_cal_write: 'Outlook予定操作', slack_send: 'Slack DM送信' };
    return names[ap] || ap;
  });

  const orchestration = `## オーケストレーション計画: ${name}

### ゴール
${goal}
${context ? `\n### 補足\n${context}` : ''}

### Phase 1: 情報収集（全サービス自由にアクセス可能）
1. ゴールに関連する情報を特定する
2. 全接続サービスを横断的に検索する:
   - Gmail/Outlook → メールを検索 (gmail_search, outlook_search_mail)
   - カレンダー → 予定を確認 (calendar_list_events, outlook_list_events)
   - Google Drive/SharePoint → ドキュメントを検索 (google_drive_search, sharepoint_search_files)
   - Slack/Teams → メッセージを確認 (slack_read_dm, teams_get_chat_messages)
   - Web検索 → 外部情報を取得 (web_search)
   - 天気API → 天気情報を取得 (weather_forecast)
3. エラー発生時: そのサービスをスキップし、他のサービスから取得を継続する

### Phase 2: 分析・判断
1. 収集した情報をゴールに照らし合わせて分析する
2. 不足している情報があれば追加で取得する
3. 結果を整理・構造化する

### Phase 3: アクション実行
${actionNames.length > 0
  ? `許可されたアクション:\n${actionNames.map(n => `- ✅ ${n}`).join('\n')}`
  : '- このスキルは読み取り専用です。情報の収集・分析・提示のみ行います。'}
${(approvalGates || []).length > 0 ? '\n\n承認ゲート:\n' + approvalGates.map(g => `- ⚠️ ${GATE_LABELS[g] || g}`).join('\n') : ''}

### 制約条件
${(constraints || []).length > 0 ? constraints.map(c => `- 🚫 ${c}`).join('\n') : '- 特になし'}

### エラーハンドリング
- ツールがエラーを返した場合、別の方法で情報取得を試みる
- 認証エラーの場合、ユーザーにサービスの再接続を案内する
- 情報が見つからない場合、その旨をユーザーに報告する`;

  const triggers = [name];
  if (goal) {
    const words = goal.split(/[、。\s,.\n]+/).filter(w => w.length >= 2).slice(0, 5);
    triggers.push(...words);
  }

  return res.status(200).json({
    orchestration,
    triggers: [...new Set(triggers)],
  });
}
