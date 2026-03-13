// Chat route - main AI conversation endpoint
// Uses LLMService abstraction + self-editing memory + memory hierarchy

import { Router } from 'express';
import llmService from '../services/llm.js';
import { MEMORY_TOOLS, executeMemoryTool, buildMemoryContext } from '../memory/self-editing.js';
import { buildFullMemoryContext, setWorkingMemory, addShortTermMemory } from '../memory/hierarchy.js';
import { logConversation } from '../services/db.js';
import { publishDataChange } from '../services/pubsub.js';

const router = Router();

router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { messages, systemPrompt, tools: clientTools = [], userId, sessionId, token, action } = req.body;

    // Handle config requests (backward compat)
    if (action === 'get-config') {
      return res.json({ clientId: process.env.VITE_GOOGLE_CLIENT_ID || '' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const uid = userId || 'anonymous';
    const sid = sessionId || `session_${Date.now()}`;

    // ── Build enhanced system prompt with memory context ──
    let enhancedSystem = systemPrompt || '';

    // Add memory context (preferences + recalled memories)
    try {
      const memCtx = await buildMemoryContext(uid);
      enhancedSystem += memCtx;

      // Add memory hierarchy context (working + short-term + long-term)
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      const query = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';
      const hierarchyCtx = await buildFullMemoryContext(uid, sid, query);
      enhancedSystem += hierarchyCtx;
    } catch (e) {
      console.warn('[Chat] Memory context error (non-fatal):', e.message);
    }

    // ── Merge memory tools with client tools ──
    const allTools = [...MEMORY_TOOLS, ...clientTools];

    // ── LLM call with tool loop ──
    let currentMessages = [...messages];
    let finalResponse = null;
    let totalTokens = 0;
    const MAX_TOOL_ROUNDS = 10;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await llmService.chat(currentMessages, enhancedSystem, allTools);

      if (result.error) {
        return res.status(500).json({ error: result.error.message || result.error });
      }

      totalTokens += (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0);

      // Check if there are tool calls
      const toolUses = (result.content || []).filter(c => c.type === 'tool_use');

      if (toolUses.length === 0 || result.stop_reason === 'end_turn') {
        finalResponse = result;
        break;
      }

      // Process tool calls
      currentMessages.push({ role: 'assistant', content: result.content });

      const toolResults = [];
      for (const toolUse of toolUses) {
        let toolResult;

        // Check if it's a memory tool
        const memoryToolNames = MEMORY_TOOLS.map(t => t.name);
        if (memoryToolNames.includes(toolUse.name)) {
          toolResult = await executeMemoryTool(uid, toolUse.name, toolUse.input);
        } else {
          // Client-side tool - return to frontend for execution
          // For now, return partial response so frontend can handle
          finalResponse = result;
          break;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        });
      }

      // If we broke out for client-side tools, exit loop
      if (finalResponse) break;

      currentMessages.push({ role: 'user', content: toolResults });
    }

    if (!finalResponse) {
      return res.status(500).json({ error: 'Tool loop exceeded maximum rounds' });
    }

    // ── Post-processing: log & update memory ──
    const latencyMs = Date.now() - startTime;

    try {
      // Log conversation
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        const userContent = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg.content);
        await logConversation(uid, sid, 'user', userContent, null, 0, 0);
      }

      const assistantText = (finalResponse.content || [])
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');
      await logConversation(uid, sid, 'assistant', assistantText, null, totalTokens, latencyMs);

      // Update working memory
      await setWorkingMemory(uid, sid, currentMessages);

      // Add to short-term memory
      if (assistantText) {
        await addShortTermMemory(uid, 'interaction', assistantText.slice(0, 500));
      }
    } catch (e) {
      console.warn('[Chat] Post-processing error (non-fatal):', e.message);
    }

    return res.json(finalResponse);

  } catch (err) {
    console.error('[Chat] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
