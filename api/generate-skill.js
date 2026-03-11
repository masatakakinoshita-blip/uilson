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

// Tool category ID → human-readable tool list
const TOOL_MAP = {
  gmail: 'gmail_search, gmail_create_draft, gmail_send_draft, gmail_send_direct, gmail_trash, gmail_modify_labels, gmail_list_labels, gmail_get_attachments',
  calendar: 'calendar_list_events, calendar_find_free_time, calendar_check_conflicts, calendar_create_event, calendar_update_event, calendar_delete_event',
  drive: 'google_drive_search, google_drive_list, google_drive_get_content, google_drive_create_doc',
  outlook: 'outlook_search_mail, outlook_create_draft, outlook_delete_mail, outlook_move_mail, outlook_mark_read, outlook_flag_mail, outlook_get_attachments, outlook_list_folders',
  outlook_cal: 'outlook_list_events, outlook_calendar_create, outlook_calendar_update, outlook_calendar_delete',
  teams: 'teams_list_chats, teams_get_chat_messages, teams_list_teams_channels, teams_get_channel_messages',
  sharepoint: 'sharepoint_search_sites, sharepoint_list_files, sharepoint_search_files, sharepoint_get_file_content',
  slack: 'slack_search_users, slack_read_dm, slack_send_dm',
  web: 'web_search',
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

  const { name, goal, toolCategories, constraints, approvalGates, context } = req.body;
  if (!name || !goal) {
    return res.status(400).json({ error: 'name and goal are required' });
  }

  const toolList = (toolCategories || []).map(tc => TOOL_MAP[tc] || tc).join('\n');
  const constraintList = (constraints || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'なし';
  const gateList = (approvalGates || []).map(g => GATE_LABELS[g] || g).join('\n') || 'なし（全て自動実行可）';

  const systemPrompt = `You are an AI orchestration plan generator for UILSON, an enterprise AI business assistant.

Given a skill definition (goal, tools, constraints, approval gates), generate:
1. A detailed orchestration plan in Japanese that another AI can follow autonomously
2. Trigger keywords that should activate this skill

The orchestration plan MUST follow the Plan→Execute→Observe pattern:
- Break the goal into concrete sequential/parallel steps
- For each step, specify which tool(s) to call and what to do with the results
- Include decision points (if X then Y, else Z)
- Include approval gates at the specified points
- Include error handling (what to do if a tool fails)
- End with a summary/output step

Output MUST be valid JSON:
{
  "orchestration": "full orchestration plan string in Japanese with markdown formatting",
  "triggers": ["keyword1", "keyword2", ...]
}

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or extra text.`;

  const userContent = `スキル名: ${name}
ゴール: ${goal}
補足情報: ${context || 'なし'}

使用可能ツール:
${toolList}

制約条件:
${constraintList}

承認ゲート:
${gateList}

上記の情報から、AIが自律的にこのタスクを実行できるオーケストレーション計画を生成してください。
計画は具体的なツール名を使い、条件分岐とエラーハンドリングを含めてください。`;

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
  const { name, goal, toolCategories, constraints, approvalGates, context } = req.body;

  const toolNames = (toolCategories || []).map(tc => {
    const names = { gmail: 'Gmail', calendar: 'カレンダー', drive: 'Google Drive', outlook: 'Outlook', outlook_cal: 'Outlookカレンダー', teams: 'Teams', sharepoint: 'SharePoint', slack: 'Slack', web: 'Web検索' };
    return names[tc] || tc;
  });

  const orchestration = `## オーケストレーション計画: ${name}

### ゴール
${goal}
${context ? `\n### 補足\n${context}` : ''}

### 実行フロー

**Phase 1: 情報収集**
${toolNames.map((tn, i) => `${i + 1}. ${tn}から関連情報を取得する`).join('\n')}
- エラー発生時: そのサービスをスキップし、他のサービスから取得を継続する

**Phase 2: 分析・判断**
1. 収集した情報をゴールに照らし合わせて分析する
2. 不足している情報があれば追加で取得する
3. 結果を整理・構造化する

**Phase 3: アクション実行**
${(approvalGates || []).length > 0 ? (approvalGates || []).map(g => `- ⚠️ ${GATE_LABELS[g] || g}`).join('\n') : '- 結果をユーザーに提示する'}

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
