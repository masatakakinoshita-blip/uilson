// Gemini model fallback chain (same pattern as chat.js)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(apiKey, reqBody, maxRetries = 3) {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      if (resp.status === 404 || resp.status === 403) break; // try next model

      if (resp.status === 429) {
        // Rate limited — wait and retry
        const waitSec = Math.min(20 * (attempt + 1), 60);
        console.log(`Rate limited on ${model}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(waitSec * 1000);
        continue;
      }

      const data = await resp.json();

      if (data.error) {
        if (data.error.code === 404 || data.error.status === 'NOT_FOUND') break; // try next model
        if (data.error.code === 429 || (data.error.message && data.error.message.includes('Quota exceeded'))) {
          const waitSec = Math.min(20 * (attempt + 1), 60);
          console.log(`Quota exceeded on ${model}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(waitSec * 1000);
          continue;
        }
      }

      return { data, model };
    }
  }
  return { data: { error: { message: 'しばらく時間をおいてからもう一度お試しください（API制限中）' } }, model: null };
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
    const { messages, mode } = req.body;

    // ─── System prompt for single-slide editing ───
    const editSystemPrompt = `あなたはプレゼンテーション資料のスライドを編集するAIアシスタントです。
ユーザーが指定したスライドに対して、臨機応変に修正・加筆を行います。

あなたは2つの応答モードを持ちます:

■ モード1: スライド修正（JSONで返す）
スライドのデータを修正する依頼の場合、以下のJSON形式で返してください:
{
  "slides": [ { ...修正後のスライドデータ（1枚分）... } ],
  "reply": "修正内容の説明（ユーザーへのメッセージ）"
}

■ モード2: 質問・会話（テキストで返す）
スライド修正ではない質問やアドバイスを求められた場合、普通のテキストで返してください。
JSONではなく、自然な日本語で回答します。

スライドが持てるフィールド一覧:
- id: スライド番号
- title: タイトル（表示用）
- layout: レイアウト種別（cover/content/bullets/stats/comparison/chart/timeline/closing）
- heading: 見出し
- sub: サブタイトル・補足
- body: 本文テキスト（改行可、長文OK、マークダウン的な記法も可）
- note: 備考・出典・注釈（スライド下部に小さく表示される）
- dataSrc: データ出典の配列（例: ["総務省統計局 2024", "○○白書"]）
- bg: 背景色
- light: 明るい文字にするか（暗い背景の時true）
- items: 箇条書き配列 [{icon, label, desc}]
- stats: 数値配列 [{value, label, sub}]
- columns: 比較カラム配列 [{title, items}]
- chartData: グラフデータ [{label, value}]
- chartType: グラフ種別（bar/pie/line）
- steps: プロセス手順 [{label, desc}]

重要ルール:
- ユーザーの指示に柔軟に対応する。「出典を入れて」→ noteやdataSrcに追加。「もっと詳しく」→ bodyやdescを拡充。「トーンを変えて」→ 文言を調整
- layoutを変えることも可能。例: "箇条書きにして" → layout:"bullets"に変更しitemsを生成
- 既存データは極力保持しつつ、指示された部分のみ変更する
- bodyフィールドは自由テキスト。箇条書き的な記法（・や-で始まる行）も使える
- 具体的・実用的な内容にする。テンプレ的な「ここに入力」は避け、文脈に合った内容を生成する
- noteフィールドは出典、注釈、補足情報に使う。出典は具体的に書く
- dataSrcは参考文献リスト。noteより形式的な出典表記に使う
- 日本語で作成する`;

    // ─── System prompt for full generation ───
    const fullSystemPrompt = `あなたはプレゼンテーション資料の構成を設計するAIアシスタントです。
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
      "body": "本文テキスト（contentレイアウト用。長文OK、改行可）",
      "note": "出典・注釈・補足（スライド下部に小さく表示。省略可）",
      "bg": "背景色（CSS色コード）",
      "light": true,
      "dataSrc": ["出典1", "出典2"],

      "items": [
        {"icon": "▶", "label": "項目名", "desc": "説明テキスト（2〜3文で具体的に）"}
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
        {"label": "ステップ名", "desc": "説明（具体的に）"}
      ]
    }
  ],
  "summary": "プレゼン全体の概要（1文）"
}

レイアウト別の必須フィールド:
- cover: heading, sub（表紙）
- closing: heading, sub（まとめ）
- content: heading, sub, body（通常テキスト。bodyは具体的に3〜5文で書く）
- bullets: heading, sub, items配列（各要素にicon/label/desc）。アイコンは内容に合った絵文字1文字を使う。descは2〜3文
- stats: heading, sub, stats配列（2〜4個。value/label/sub）。valueは具体的な数字+単位
- comparison: heading, sub, columns配列（2〜3列。title/items配列）
- chart: heading, sub, chartData配列（label/value）, chartType
- timeline: heading, sub, steps配列（label/desc）。3〜5ステップ

内容のルール:
- スライド数はユーザー指定があればそれに従う。なければ6〜10枚程度
- 最初のスライドはlayout:"cover"、最後はlayout:"closing"
- 中間スライドは必ずレイアウトを多様にする。同じlayoutを2枚以上連続させない
- bulletsやstatsを積極的に使い、単調なcontent連続を避ける
- coverとclosingのbgは暗い色（#1E2D50, #2B4070等）でlight:true
- その他スライドのbgは明るい色（#FFFFFF, #F5F6FA等）でlight:false
- 日本語で作成する
- lightフィールドはJSON booleanのtrue/falseで返す
- 各レイアウトに対応するデータフィールドを必ず含める
- 不要なフィールドは省略してよい（例：bulletsにbodyは不要）

コンテンツ品質ルール:
- テンプレ的な「ここに入力」「説明テキスト」のような空文言は使わない
- 各項目のdescは具体的な内容を2〜3文で書く（一般論でなく、テーマに即した具体例・根拠・数値を含める）
- bodyは3〜5文で具体的に書く。概要だけでなく、根拠・事例・データを含める
- statsのvalueは可能な限りリアリスティックな数値を使う
- 必要に応じてnoteに出典・注釈を入れる
- ユーザーのテーマに沿った独自の洞察・分析を加える`;

    // Convert chat messages to Gemini format
    const geminiContents = [];
    for (const m of messages) {
      geminiContents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      });
    }

    const isEditMode = mode === 'single';
    const systemPrompt = isEditMode ? editSystemPrompt : fullSystemPrompt;

    const reqBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: isEditMode ? 0.8 : 0.7,
        // Only force JSON for full generation mode; edit mode needs flexibility
        ...(isEditMode ? {} : { responseMimeType: "application/json" })
      }
    };

    const { data, model } = await callGemini(apiKey, reqBody);

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if present
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to parse as JSON first
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
      // For edit mode, also try to extract JSON from mixed text+JSON response
      if (isEditMode) {
        // Try to find a JSON object in the text
        const jsonInText = text.match(/\{[\s\S]*"slides"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
        if (jsonInText) {
          try {
            const extracted = JSON.parse(jsonInText[0]);
            if (extracted.slides) {
              extracted.slides = extracted.slides.map(s => ({
                ...s,
                light: s.light === true || s.light === "true"
              }));
            }
            return res.status(200).json({ ...extracted, _engine: `gemini:${model}` });
          } catch (_) { /* fall through */ }
        }
      }
      // Return as raw text (conversational response)
      return res.status(200).json({
        slides: [],
        summary: '',
        rawText: text,
        _engine: `gemini:${model}`
      });
    }
  } catch (err) {
    console.error('generate-slides error:', err);
    return res.status(500).json({ error: err.message });
  }
}
