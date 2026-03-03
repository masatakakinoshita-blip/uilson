export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const { messages, system, googleToken } = req.body;

    const tools = [
      {
        name: "gmail_trash",
        description: "Move an email to trash (delete). Requires the messageId from context data.",
        input_schema: {
          type: "object",
          properties: {
            messageId: { type: "string", description: "The Gmail message ID to delete" }
          },
          required: ["messageId"]
        }
      },
      {
        name: "gmail_modify_labels",
        description: "Add or remove labels on an email (move between folders). Common labels: INBOX, STARRED, IMPORTANT, SPAM, TRASH, UNREAD. Use gmail_list_labels to discover custom labels.",
        input_schema: {
          type: "object",
          properties: {
            messageId: { type: "string", description: "The Gmail message ID" },
            addLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to add" },
            removeLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to remove" }
          },
          required: ["messageId"]
        }
      },
      {
        name: "gmail_list_labels",
        description: "List all available Gmail labels (folders).",
        input_schema: { type: "object", properties: {} }
      },
      {
        name: "calendar_create_event",
        description: "Create a new Google Calendar event.",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Event title" },
            description: { type: "string", description: "Event description" },
            startDateTime: { type: "string", description: "Start in ISO 8601 (e.g. 2026-03-15T10:00:00+09:00)" },
            endDateTime: { type: "string", description: "End in ISO 8601" },
            location: { type: "string", description: "Location" }
          },
          required: ["summary", "startDateTime", "endDateTime"]
        }
      },
      {
        name: "calendar_update_event",
        description: "Update an existing calendar event (change time, title, etc). Requires the eventId from context data.",
        input_schema: {
          type: "object",
          properties: {
            eventId: { type: "string", description: "The calendar event ID" },
            summary: { type: "string", description: "New title" },
            description: { type: "string", description: "New description" },
            startDateTime: { type: "string", description: "New start time in ISO 8601" },
            endDateTime: { type: "string", description: "New end time in ISO 8601" },
            location: { type: "string", description: "New location" }
          },
          required: ["eventId"]
        }
      },
      {
        name: "calendar_delete_event",
        description: "Delete a calendar event. Requires the eventId from context data.",
        input_schema: {
          type: "object",
          properties: {
            eventId: { type: "string", description: "The calendar event ID to delete" }
          },
          required: ["eventId"]
        }
      }
    ];

    async function executeTool(name, input, gToken) {
      const gh = { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' };
      try {
        switch (name) {
          case 'gmail_trash': {
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + input.messageId + '/trash', { method: 'POST', headers: gh });
            return r.ok ? { success: true, message: 'Email moved to trash' } : { error: (await r.json()).error?.message || 'Failed' };
          }
          case 'gmail_modify_labels': {
            const body = {};
            if (input.addLabelIds) body.addLabelIds = input.addLabelIds;
            if (input.removeLabelIds) body.removeLabelIds = input.removeLabelIds;
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + input.messageId + '/modify', { method: 'POST', headers: gh, body: JSON.stringify(body) });
            return r.ok ? { success: true, message: 'Labels updated' } : { error: (await r.json()).error?.message || 'Failed' };
          }
          case 'gmail_list_labels': {
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', { headers: gh });
            const d = await r.json();
            return r.ok ? { labels: (d.labels || []).map(l => ({ id: l.id, name: l.name, type: l.type })) } : { error: d.error?.message || 'Failed' };
          }
          case 'calendar_create_event': {
            const ev = { summary: input.summary, start: { dateTime: input.startDateTime }, end: { dateTime: input.endDateTime } };
            if (input.description) ev.description = input.description;
            if (input.location) ev.location = input.location;
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers: gh, body: JSON.stringify(ev) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, summary: d.summary, start: d.start, end: d.end } : { error: d.error?.message || 'Failed' };
          }
          case 'calendar_update_event': {
            const patch = {};
            if (input.summary) patch.summary = input.summary;
            if (input.description) patch.description = input.description;
            if (input.startDateTime) patch.start = { dateTime: input.startDateTime };
            if (input.endDateTime) patch.end = { dateTime: input.endDateTime };
            if (input.location) patch.location = input.location;
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + input.eventId, { method: 'PATCH', headers: gh, body: JSON.stringify(patch) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, summary: d.summary } : { error: d.error?.message || 'Failed' };
          }
          case 'calendar_delete_event': {
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + input.eventId, { method: 'DELETE', headers: gh });
            return (r.ok || r.status === 204) ? { success: true, message: 'Event deleted' } : { error: 'Failed to delete' };
          }
          default: return { error: 'Unknown tool' };
        }
      } catch (e) { return { error: e.message }; }
    }

    let currentMessages = [...messages];
    for (let i = 0; i < 5; i++) {
      const body = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: system || '',
        messages: currentMessages
      };
      if (googleToken) body.tools = tools;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.stop_reason === 'tool_use' && googleToken) {
        currentMessages.push({ role: 'assistant', content: data.content });
        const toolResults = [];
        for (const block of data.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input, googleToken);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          }
        }
        currentMessages.push({ role: 'user', content: toolResults });
      } else {
        return res.status(200).json(data);
      }
    }
    return res.status(200).json({ content: [{ type: 'text', text: 'Tool execution limit reached.' }] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
