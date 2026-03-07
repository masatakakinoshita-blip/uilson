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
      "layout": "cover|content|chart|bullets|comparison|closing",
      "layoutLabel": "レイアウト種別（例：表紙, 箇条書き, グラフ, 比較表, まとめ）",
      "heading": "スライドの見出し",
      "sub": "サブタイトルや補足テキスト",
      "body": "本文テキスト（箇条書きの場合は改行区切り）",
      "note": "備考やフッターテキスト（省略可）",
      "bg": "背景色（CSS色コード。coverは#1E2D50等の暗い色、contentは#FFFFFF等）",
      "light": "true or false（背景が暗い場合はtrue）",
      "dataSrc": ["データソース名の配列（例：売上DB、顧客リスト）空配列可"]
    }
  ],
  "summary": "プレゼン全体の概要（1文）"
}

ルール:
- スライド数はユーザー指定があればそれに従う。なければ6〜10枚程度
- 最初のスライドはlayout:"cover"にする
- 最後のスライドはlayout:"closing"にする
- coverとclosingのbgは暗い色（#1E2D50, #2B4070等）でlight:true
- contentスライドのbgは明るい色（#FFFFFF, #F5F6FA等）でlight:false
- chartスライドのbgも明るい色
- 日本語で作成する
- 具体的で実用的な内容にする
- 各スライドのsub、body、noteに充実した内容を入れる
- lightフィールドはJSON booleanのtrue/falseで返す（文字列ではない）`;

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
