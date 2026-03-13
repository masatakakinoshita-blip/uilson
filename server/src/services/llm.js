// LLMService - Abstraction layer for transparent LLM switching
// Supports: Anthropic Claude (direct), Vertex AI Claude, Vertex AI Gemini
// Design: Strategy pattern - swap provider via env var without code changes

import crypto from 'crypto';

const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  VERTEX_CLAUDE: 'vertex-claude',
  VERTEX_GEMINI: 'vertex-gemini',
};

// ── Token cache for Vertex AI auth ──
let cachedToken = null;
let tokenExpiry = 0;

async function getVertexToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

  // On Cloud Run: use metadata server (no SA key needed)
  // Locally: fall back to GOOGLE_SERVICE_ACCOUNT_KEY
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!keyRaw) {
    // Cloud Run metadata server - automatic SA credentials
    const resp = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );
    if (!resp.ok) throw new Error('Failed to get token from metadata server: ' + resp.status);
    const data = await resp.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  }

  // Local dev: SA key-based JWT auth
  let key;
  try { key = JSON.parse(Buffer.from(keyRaw, 'base64').toString()); }
  catch { key = JSON.parse(keyRaw); }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const signature = sign.sign(key.private_key, 'base64url');

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${header}.${payload}.${signature}`,
  });
  const data = await resp.json();
  if (data.error) throw new Error('Vertex auth failed: ' + (data.error_description || data.error));

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

// ── Provider implementations ──

async function callAnthropic(messages, systemPrompt, tools, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = {
    model: options.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: options.maxTokens || 8192,
    system: systemPrompt,
    messages,
  };
  if (tools?.length) body.tools = tools;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function callVertexClaude(messages, systemPrompt, tools, options = {}) {
  const token = await getVertexToken();
  const project = process.env.VERTEX_PROJECT_ID || 'uilson-489209';
  const region = process.env.VERTEX_REGION || 'us-east1';
  const model = options.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

  const body = {
    anthropic_version: 'vertex-2023-10-16',
    max_tokens: options.maxTokens || 8192,
    system: systemPrompt,
    messages,
  };
  if (tools?.length) body.tools = tools;

  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/anthropic/models/${model}:rawPredict`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function callVertexGemini(messages, systemPrompt, tools, options = {}) {
  const token = await getVertexToken();
  const project = process.env.VERTEX_PROJECT_ID || 'uilson-489209';
  const region = process.env.VERTEX_REGION || 'asia-northeast1';
  const model = options.model || 'gemini-2.0-flash-001';

  // Convert Claude-format messages → Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join('') }],
  }));

  const body = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 8192,
      temperature: options.temperature || 0.7,
    },
  };

  // Convert tools to Gemini format
  if (tools?.length) {
    body.tools = [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      }))
    }];
  }

  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();

  // Normalize Gemini response → Claude response format (unified interface)
  if (data.candidates?.[0]?.content?.parts) {
    const parts = data.candidates[0].content.parts;
    const content = [];
    for (const part of parts) {
      if (part.text) content.push({ type: 'text', text: part.text });
      if (part.functionCall) {
        content.push({
          type: 'tool_use',
          id: `toolu_${crypto.randomUUID().slice(0, 8)}`,
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        });
      }
    }
    return {
      content,
      stop_reason: data.candidates[0].finishReason === 'STOP' ? 'end_turn' : 'tool_use',
      model,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount || 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }
  return data;
}

// ── Public API ──

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || PROVIDERS.ANTHROPIC;
    console.log(`[LLMService] Provider: ${this.provider}`);
  }

  async chat(messages, systemPrompt, tools = [], options = {}) {
    const maxRetries = options.maxRetries || 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result;
        switch (this.provider) {
          case PROVIDERS.VERTEX_CLAUDE:
            result = await callVertexClaude(messages, systemPrompt, tools, options);
            break;
          case PROVIDERS.VERTEX_GEMINI:
            result = await callVertexGemini(messages, systemPrompt, tools, options);
            break;
          case PROVIDERS.ANTHROPIC:
          default:
            result = await callAnthropic(messages, systemPrompt, tools, options);
            break;
        }

        // Retry on rate limit
        if (result?.error?.type === 'rate_limit_error' || result?.error?.code === 429) {
          const waitSec = Math.min(15 * (attempt + 1), 45);
          console.log(`[LLMService] Rate limited, waiting ${waitSec}s (attempt ${attempt + 1})`);
          await sleep(waitSec * 1000);
          continue;
        }

        return result;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await sleep(5000 * (attempt + 1));
      }
    }

    return { error: { message: 'LLM API制限中。しばらくお待ちください。' } };
  }

  // Embeddings for vector search
  async embed(text) {
    const token = await getVertexToken();
    const project = process.env.VERTEX_PROJECT_ID || 'uilson-489209';
    const region = process.env.VERTEX_REGION || 'asia-northeast1';

    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/text-embedding-005:predict`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ content: text }],
        parameters: { outputDimensionality: 768 },
      }),
    });
    const data = await resp.json();
    return data.predictions?.[0]?.embeddings?.values || null;
  }
}

export default new LLMService();
