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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return generateFallback(req, res);

  const { name, description, examples } = req.body;
  if (!name || !examples || examples.length === 0) {
    return res.status(400).json({ error: 'name and examples are required' });
  }

  const systemPrompt = `You are a skill definition generator for UILSON, an AI business assistant.
Given a skill name, description, and examples from the user, generate:
1. A clear, actionable instruction set (in Japanese) that another AI can follow to replicate this skill
2. A list of trigger keywords that should activate this skill

The instructions should be specific, step-by-step, and reference the patterns found in the examples.
Output MUST be valid JSON with this structure:
{
  "instructions": "string with the full skill instructions in Japanese",
  "triggers": ["keyword1", "keyword2", ...]
}

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or extra text.`;

  const userContent = `ã¹ã­ã«å: ${name}
èª¬æ: ${description || "ãªã"}

ã¦ã¼ã¶ã¼ãæããä¾:
${examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}

ä¸è¨ã®ä¾ãããã¿ã¼ã³ãåæããAIãåæ§ã®ã¿ã¹ã¯ãå®è¡ã§ããã¹ã­ã«å®ç¾©ãæ¥æ¬èªã§çæãã¦ãã ããã`;

  try {
    const { data } = await callGemini(apiKey, {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContent }] }
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
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
      instructions: parsed.instructions || '',
      triggers: parsed.triggers || [name],
    });
  } catch (err) {
    console.error('Generate skill error:', err);
    return generateFallback(req, res);
  }
}

function generateFallback(req, res) {
  const { name, description, examples } = req.body;
  const instructions = `ãã¹ã­ã«: ${name}ã

ç®ç: ${description || name + 'ãèªååãã'}

## ã«ã¼ã«ã»ãã¿ã¼ã³:
${(examples || []).map((e, i) => `${i + 1}. ${e}`).join('\n')}

## å®è¡æ¹æ³:
- ä¸è¨ã®ã«ã¼ã«ã¨ãã¿ã¼ã³ã«åºã¥ãã¦å¤æ­ã»å®è¡ãã¦ãã ãã
- ã«ã¼ã«ã«è©²å½ããªãã±ã¼ã¹ã¯ãæãè¿ããã¿ã¼ã³ãåèã«ãã¦ãã ãã
- ä¸æãªå ´åã¯ã¦ã¼ã¶ã¼ã«ç¢ºèªãã¦ãã ãã`;

  const triggers = [name];
  if (description) {
    const words = description.split(/[ãã\s,.\n]+/).filter(w => w.length >= 2);
    triggers.push(...words.slice(0, 3));
  }

  return res.status(200).json({
    instructions,
    triggers: [...new Set(triggers)],
  });
}
