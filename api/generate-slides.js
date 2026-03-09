// Gemini model fallback chain (same pattern as chat.js)
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  try {
    const { messages } = req.body;

    const systemPrompt = `あなたはプレゼンテーション資料の構成を設計するAIアシスタントです。
ユーザーの要望に基づいて、スライド構成をJSON形式で生成してください。

必ず以下のJSON形式で応答してください。JSONのみを返し、他のテキストは含めないでください。

{
  "slides": [
    {
      "id": 1,
      "title": "スライドタイトル",
      "layout": "cover|content|bullets|stats|comparison|chart|timeline|closing",
      "layoutLabel": "レイアウト種別",
      "heading": "スライドの見出し",
      "sub": "サブタイトルや補足テキスト",
      "body": "本文テキスト（contentレイアウト用）",
      "note": "備考やフッターテキスト（省略可）",
      "bg": "背景色（CSS色コード）",
      "light": true,
      "dataSrc": [],

      "items": [
        {"icon": "▶", "label": "項目名", "desc": "説明テキスト"}
      ],
      "stats": [
        {"value": "85%", "label": "指標名", "sub": "補足"}
      ],
      "columns": [
        {"title": "列タイトル", "items": ["項目1", "項目2"]}
      ],
      "chartData": [
        {"label": "カテゴリ名", "value": 75}
      ],
      "chartType": "bar|pie|line",
      "steps": [
        {"label": "ステップ名", "desc": "説明"}
      ]
    }
  ],
  "summary": "プレゼン全体の概要（1文）"
}

レイアウト別の必須フィールド:
- cover: heading, sub（表紙）
- closing: heading, sub（まとめ）
- content: heading, sub, body（通常テキスト）
- bullets: heading, sub, items配列（各要素にicon/label/desc）。アイコンは内容に合った絵文字1文字を使う
- stats: heading, sub, stats配列（2〜4個。value/label/sub）。valueは数字+単位
- comparison: heading, sub, columns配列（2〜3列。title/items配列）
- chart: heading, sub, chartData配列（label/value）, chartType
- timeline: heading, sub, steps配列（label/desc）。3〜5ステップ

ルール:
- スライド数はユーザー指定があればそれに従う。なければ6〜10枚程度
- 最初のスライドはlayout:"cover"、最後はlayout:"closing"
- 中間スライドは必ずレイアウトを多様にする。同じlayoutを2枚以上連続させない
- bulletsやstatsを積極的に使い、単調なcontent連続を避ける
- coverとclosingのbgは暗い色（#1E2D50, #2B4070等）でlight:true
- その他スライドのbgは明るい色（#FFFFFF, #F5F6FA等）でlight:false
- 日本語で作成する
- 具体的で実用的な内容にする
- lightフィールドはJSON booleanのtrue/falseで返す
- 各レイアウトに対応するデータフィールドを必ず含める
- 不要なフィールドは省略してよい（例：bulletsにbodyは不要）`;

    // Convert chat messages to Gemini format
    const geminiContents = [];

    // Add system instruction as first user message context
    for (const m of messages) {
      geminiContents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      });
    }

    const reqBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: "application/json",
      }
    };

    const { data, model } = await callGemini(apiKey, reqBody);

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    let jsonStr = text;
    // Strip markdown code fences if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      // Normalize light field (Gemini may return string "true"/"false")
      if (parsed.slides) {
        parsed.slides = parsed.slides.map(s => ({
          ...s,
          light: s.light === true || s.light === "true"
        }));
      }
      return res.status(200).json({ ...parsed, _engine: `gemini:${model}` });
    } catch (parseErr) {
      return res.status(200).json({
        slides: [],
        summary: '',
        rawText: text
      });
    }
  } catch (err) {
    console.error('generate-slides error:', err);
    return res.status(500).json({ error: err.message });
  }
}
