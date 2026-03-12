// Claude API (Direct Anthropic API - temporary until Vertex AI quota is approved)
// When Vertex AI quota is approved, switch back by setting USE_VERTEX=true env var
import crypto from 'crypto';

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const USE_VERTEX = process.env.USE_VERTEX === 'true';

// Vertex AI config (for when quota is approved)
const VERTEX_PROJECT = process.env.VERTEX_PROJECT_ID || 'uilson-489209';
const VERTEX_REGION = process.env.VERTEX_REGION || 'us-east1';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Cache access token in module scope (Vercel may reuse between invocations)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (!USE_VERTEX) return null; // Not needed for direct Anthropic API

  // Option 1: Direct access token (for testing)
  if (process.env.VERTEX_ACCESS_TOKEN) return process.env.VERTEX_ACCESS_TOKEN;

  // Check cached token
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

  // Option 2: Service account key (base64-encoded JSON)
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error('No Vertex AI credentials configured. Set GOOGLE_SERVICE_ACCOUNT_KEY or VERTEX_ACCESS_TOKEN.');

  let key;
  try {
    key = JSON.parse(Buffer.from(keyRaw, 'base64').toString());
  } catch {
    key = JSON.parse(keyRaw);
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const signature = sign.sign(key.private_key, 'base64url');
  const jwt = header + '.' + payload + '.' + signature;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (data.error) throw new Error('Auth failed: ' + (data.error_description || data.error));

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function callClaude(accessToken, body, maxRetries = 2) {
  let url, headers;

  if (USE_VERTEX) {
    // Vertex AI mode
    url = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_REGION}/publishers/anthropic/models/${CLAUDE_MODEL}:rawPredict`;
    headers = {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    };
  } else {
    // Direct Anthropic API mode
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
    // Remove vertex-specific field, add model field for direct API
    delete body.anthropic_version;
    body.model = CLAUDE_MODEL;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (resp.status === 429 || resp.status === 529) {
      const waitSec = Math.min(15 * (attempt + 1), 45);
      console.log(`Claude rate limited, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitSec * 1000);
      continue;
    }

    const data = await resp.json();

    if (data.error) {
      if (data.error.code === 429 || data.error.type === 'rate_limit_error') {
        const waitSec = Math.min(15 * (attempt + 1), 45);
        console.log(`Claude rate limit error, waiting ${waitSec}s`);
        await sleep(waitSec * 1000);
        continue;
      }
      return data;
    }

    return data;
  }
  return { error: { message: 'しばらく時間をおいてからもう一度お試しください（API制限中）' } };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // === Return Google client ID (for frontend runtime config) ===
  const { action } = req.body || {};
  if (action === 'get-config') {
    return res.status(200).json({
      clientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
    });
  }

  // === Google OAuth token exchange (integrated into chat endpoint) ===
  if (action === 'google-oauth') {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    try {
      const params = new URLSearchParams({
        client_id: clientId, client_secret: clientSecret, code,
        redirect_uri: redirect_uri || 'https://uilson.vercel.app',
        grant_type: 'authorization_code',
      });
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }).then(r => r.json());
      if (resp.error) return res.status(400).json({ error: resp.error_description || resp.error });
      return res.status(200).json({
        ok: true, access_token: resp.access_token,
        refresh_token: resp.refresh_token || null, expires_in: resp.expires_in,
      });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  if (action === 'google-refresh') {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    try {
      const params = new URLSearchParams({
        client_id: clientId, client_secret: clientSecret, refresh_token,
        grant_type: 'refresh_token',
      });
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }).then(r => r.json());
      if (resp.error) return res.status(400).json({ error: resp.error_description || resp.error });
      return res.status(200).json({ ok: true, access_token: resp.access_token, expires_in: resp.expires_in });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  // === End Google OAuth handling ===

  try {
    // Get access token (only needed for Vertex AI mode)
    let accessToken = null;
    try {
      accessToken = await getAccessToken();
    } catch (authErr) {
      return res.status(500).json({ error: 'AI認証エラー: ' + authErr.message });
    }

    const { messages, system, googleToken, msToken, slackToken } = req.body;

    const tools = [
      // ===== GMAIL TOOLS =====
      {
        name: 'gmail_search',
        description: 'Search Gmail messages dynamically. Use when user asks about specific emails by date, sender, subject, etc.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Gmail search query (e.g. "from:john after:2026/03/01", "subject:meeting", "is:unread")' }, maxResults: { type: 'number', description: 'Max results (default 15)' } }, required: ['query'] }
      },
      {
        name: 'gmail_trash',
        description: 'Move a Gmail email to trash. Requires messageId.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Gmail message ID' } }, required: ['messageId'] }
      },
      {
        name: 'gmail_modify_labels',
        description: 'Add or remove labels on a Gmail email. Use for moving between folders, marking read/unread, starring. Common labels: INBOX, STARRED, IMPORTANT, SPAM, TRASH, UNREAD. To mark as read: remove UNREAD. To star: add STARRED. To move to folder: add target label and optionally remove INBOX.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Gmail message ID' }, addLabelIds: { type: 'array', items: { type: 'string' }, description: 'Label IDs to add' }, removeLabelIds: { type: 'array', items: { type: 'string' }, description: 'Label IDs to remove' } }, required: ['messageId'] }
      },
      {
        name: 'gmail_list_labels',
        description: 'List all available Gmail labels (folders). Use to find label IDs for moving emails.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'gmail_get_attachments',
        description: 'Check if a Gmail message has attachments and list their filenames and sizes.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Gmail message ID' } }, required: ['messageId'] }
      },
      {
        name: 'gmail_create_draft',
        description: 'Create a Gmail draft email. Use this when user wants to compose an email. The draft is saved but NOT sent. Tell the user: "Draft created. Would you like me to send it now, or keep it as a draft?"',
        input_schema: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email address(es), comma separated' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body (plain text)' }, cc: { type: 'string', description: 'CC recipients, comma separated' }, bcc: { type: 'string', description: 'BCC recipients, comma separated' } }, required: ['to', 'subject', 'body'] }
      },
      {
        name: 'gmail_send_draft',
        description: 'Send an existing Gmail draft. IMPORTANT: Only use this AFTER the user explicitly confirms they want to send. This is the human-in-the-loop step. First create a draft with gmail_create_draft, show it to the user, and only send after their confirmation.',
        input_schema: { type: 'object', properties: { draftId: { type: 'string', description: 'The draft ID returned from gmail_create_draft' } }, required: ['draftId'] }
      },
      {
        name: 'gmail_send_direct',
        description: 'Send a Gmail email directly without creating a draft first. IMPORTANT: Only use this when the user has EXPLICITLY said to send immediately. If there is any ambiguity, use gmail_create_draft instead and confirm with the user.',
        input_schema: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email(s), comma separated' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body (plain text)' }, cc: { type: 'string', description: 'CC recipients' }, bcc: { type: 'string', description: 'BCC recipients' } }, required: ['to', 'subject', 'body'] }
      },
      // ===== GOOGLE CALENDAR TOOLS =====
      {
        name: 'calendar_list_events',
        description: 'List/search Google Calendar events in a date range. Use this to check what meetings are scheduled, find specific events, or check availability before scheduling. ALWAYS use this tool when user asks about their schedule, calendar, meetings, or availability.',
        input_schema: { type: 'object', properties: { startDate: { type: 'string', description: 'Start of range in ISO 8601 (e.g. 2026-03-15T00:00:00+09:00)' }, endDate: { type: 'string', description: 'End of range in ISO 8601 (e.g. 2026-03-21T23:59:59+09:00)' }, query: { type: 'string', description: 'Optional search keyword to filter events by title/description' }, maxResults: { type: 'number', description: 'Max results (default 30)' } }, required: ['startDate', 'endDate'] }
      },
      {
        name: 'calendar_find_free_time',
        description: 'Find free time slots in a date range by analyzing Google Calendar events. Use when user asks "when am I free?", "空いてる時間は？", "いつ空いてる？", or wants to schedule a meeting and needs available time suggestions. Returns a list of free time slots during business hours (9:00-18:00 JST by default).',
        input_schema: { type: 'object', properties: { startDate: { type: 'string', description: 'Start date in ISO 8601 (e.g. 2026-03-17T00:00:00+09:00)' }, endDate: { type: 'string', description: 'End date in ISO 8601 (e.g. 2026-03-21T23:59:59+09:00)' }, durationMinutes: { type: 'number', description: 'Minimum free slot duration in minutes (default 30)' }, startHour: { type: 'number', description: 'Business hours start (0-23, default 9)' }, endHour: { type: 'number', description: 'Business hours end (0-23, default 18)' } }, required: ['startDate', 'endDate'] }
      },
      {
        name: 'calendar_check_conflicts',
        description: 'Check if a proposed time slot conflicts with any existing Google Calendar events. Use before creating events to warn user about double-bookings. Also checks for nearby events and travel time considerations.',
        input_schema: { type: 'object', properties: { startDateTime: { type: 'string', description: 'Proposed start time in ISO 8601' }, endDateTime: { type: 'string', description: 'Proposed end time in ISO 8601' } }, required: ['startDateTime', 'endDateTime'] }
      },
      {
        name: 'calendar_create_event',
        description: 'Create a new Google Calendar event. For meetings with attendees, include their email addresses. IMPORTANT: Before creating, use calendar_check_conflicts to verify no double-booking.',
        input_schema: { type: 'object', properties: { summary: { type: 'string', description: 'Event title' }, description: { type: 'string', description: 'Event description' }, startDateTime: { type: 'string', description: 'Start in ISO 8601 (e.g. 2026-03-15T10:00:00+09:00)' }, endDateTime: { type: 'string', description: 'End in ISO 8601' }, location: { type: 'string', description: 'Location' }, attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee email addresses for meeting invites' } }, required: ['summary', 'startDateTime', 'endDateTime'] }
      },
      {
        name: 'calendar_update_event',
        description: 'Update an existing Google Calendar event.',
        input_schema: { type: 'object', properties: { eventId: { type: 'string', description: 'The calendar event ID' }, summary: { type: 'string' }, description: { type: 'string' }, startDateTime: { type: 'string' }, endDateTime: { type: 'string' }, location: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' }, description: 'Updated attendee emails' } }, required: ['eventId'] }
      },
      {
        name: 'calendar_delete_event',
        description: 'Delete a Google Calendar event.',
        input_schema: { type: 'object', properties: { eventId: { type: 'string', description: 'The calendar event ID to delete' } }, required: ['eventId'] }
      },
      // ===== OUTLOOK MAIL TOOLS =====
      {
        name: 'outlook_search_mail',
        description: 'Search Outlook emails via Microsoft Graph API. Use whenever user asks about Outlook emails.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword (subject, body, sender)' }, fromAddress: { type: 'string', description: 'Filter by sender email' }, startDate: { type: 'string', description: 'Emails on/after this date (ISO 8601)' }, endDate: { type: 'string', description: 'Emails before this date (ISO 8601)' }, folder: { type: 'string', description: 'Mail folder: inbox, sentitems, drafts, junkemail, deleteditems' }, top: { type: 'number', description: 'Max results (default 20)' } } }
      },
      {
        name: 'outlook_delete_mail',
        description: 'Delete an Outlook email (moves to Deleted Items).',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Outlook message ID' } }, required: ['messageId'] }
      },
      {
        name: 'outlook_move_mail',
        description: 'Move an Outlook email to a different folder. Common folder IDs: inbox, drafts, sentitems, deleteditems, junkemail, archive. You can also use folder display names.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Outlook message ID' }, destinationFolder: { type: 'string', description: 'Target folder ID or well-known name (inbox, archive, deleteditems, etc.)' } }, required: ['messageId', 'destinationFolder'] }
      },
      {
        name: 'outlook_mark_read',
        description: 'Mark an Outlook email as read or unread.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Outlook message ID' }, isRead: { type: 'boolean', description: 'true = mark as read, false = mark as unread' } }, required: ['messageId', 'isRead'] }
      },
      {
        name: 'outlook_flag_mail',
        description: 'Set or clear a follow-up flag on an Outlook email. Flagged emails appear in the To-Do list.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Outlook message ID' }, flagStatus: { type: 'string', description: 'flagged, complete, or notFlagged' } }, required: ['messageId', 'flagStatus'] }
      },
      {
        name: 'outlook_get_attachments',
        description: 'Check if an Outlook email has attachments and list their names and sizes.',
        input_schema: { type: 'object', properties: { messageId: { type: 'string', description: 'The Outlook message ID' } }, required: ['messageId'] }
      },
      {
        name: 'outlook_create_draft',
        description: 'Create an Outlook email draft. The draft is saved but NOT sent.',
        input_schema: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email(s), comma separated' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body' }, cc: { type: 'string', description: 'CC recipients' }, bodyType: { type: 'string', description: 'Text or HTML (default Text)' } }, required: ['to', 'subject', 'body'] }
      },
      {
        name: 'outlook_list_folders',
        description: 'List all Outlook mail folders with their IDs and unread counts.',
        input_schema: { type: 'object', properties: {} }
      },
      // ===== OUTLOOK CALENDAR TOOLS =====
      {
        name: 'outlook_list_events',
        description: 'List Outlook calendar events in a date range.',
        input_schema: { type: 'object', properties: { startDate: { type: 'string', description: 'Start (ISO 8601)' }, endDate: { type: 'string', description: 'End (ISO 8601)' }, top: { type: 'number', description: 'Max results (default 20)' } }, required: ['startDate', 'endDate'] }
      },
      {
        name: 'outlook_calendar_create',
        description: 'Create an Outlook calendar event. For meeting invites, include attendee emails.',
        input_schema: { type: 'object', properties: { subject: { type: 'string', description: 'Event title' }, body: { type: 'string', description: 'Event description' }, startDateTime: { type: 'string', description: 'Start (ISO 8601)' }, endDateTime: { type: 'string', description: 'End (ISO 8601)' }, timeZone: { type: 'string', description: 'Time zone (default Asia/Tokyo)' }, location: { type: 'string', description: 'Location' }, attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses for meeting invites' } }, required: ['subject', 'startDateTime', 'endDateTime'] }
      },
      {
        name: 'outlook_calendar_update',
        description: 'Update an existing Outlook calendar event.',
        input_schema: { type: 'object', properties: { eventId: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, startDateTime: { type: 'string' }, endDateTime: { type: 'string' }, timeZone: { type: 'string' }, location: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } } }, required: ['eventId'] }
      },
      {
        name: 'outlook_calendar_delete',
        description: 'Delete an Outlook calendar event.',
        input_schema: { type: 'object', properties: { eventId: { type: 'string', description: 'The Outlook event ID' } }, required: ['eventId'] }
      },
      {
        name: 'sharepoint_search_sites',
        description: 'Search SharePoint sites accessible to the user.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword' } }, required: ['query'] }
      },
      {
        name: 'sharepoint_list_files',
        description: 'List files in a SharePoint site document library.',
        input_schema: { type: 'object', properties: { siteId: { type: 'string', description: 'SharePoint site ID' }, path: { type: 'string', description: 'Folder path (default: root)' } }, required: ['siteId'] }
      },
      {
        name: 'sharepoint_search_files',
        description: 'Search files across SharePoint by keyword.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword for files' } }, required: ['query'] }
      },
      {
        name: 'sharepoint_get_file_content',
        description: 'Get the text content or metadata of a SharePoint file.',
        input_schema: { type: 'object', properties: { siteId: { type: 'string', description: 'SharePoint site ID' }, itemId: { type: 'string', description: 'File/item ID' } }, required: ['siteId', 'itemId'] }
      },
      // ===== SLACK DM TOOLS =====
      {
        name: 'slack_search_users',
        description: 'Search Slack workspace users by name, display_name, email, etc. Returns matching users with their IDs. Use this first to find a DM target. IMPORTANT: If searching with Japanese kanji/hiragana returns no results, retry with romaji (e.g. if 木下 fails, try kinoshita). Also try partial matches and English names.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Name or partial name to search (e.g. "田中", "Tanaka", "john")' } }, required: ['query'] }
      },
      {
        name: 'slack_read_dm',
        description: 'Read DM (direct message) history with a specific Slack user. Requires the user ID from slack_search_users.',
        input_schema: { type: 'object', properties: { userId: { type: 'string', description: 'Slack user ID (e.g. U01ABC123)' }, limit: { type: 'number', description: 'Number of messages to fetch (default 20, max 50)' } }, required: ['userId'] }
      },
      {
        name: 'slack_send_dm',
        description: 'Send a DM (direct message) to a Slack user. IMPORTANT: Only use after user explicitly confirms the message content. First show the draft message and ask for confirmation.',
        input_schema: { type: 'object', properties: { userId: { type: 'string', description: 'Slack user ID' }, text: { type: 'string', description: 'Message text to send' } }, required: ['userId', 'text'] }
      },
      // ===== TEAMS TOOLS =====
      {
        name: 'teams_list_chats',
        description: "List user's recent Teams chats with last message preview",
        input_schema: { type: 'object', properties: { top: { type: 'number', description: 'Number of chats (max 50)' } } }
      },
      {
        name: 'teams_get_chat_messages',
        description: 'Get messages from a specific Teams chat',
        input_schema: { type: 'object', properties: { chatId: { type: 'string', description: 'Chat ID' } }, required: ['chatId'] }
      },
      {
        name: 'teams_list_teams_channels',
        description: 'List joined teams and their channels',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'teams_get_channel_messages',
        description: 'Get recent messages from a Teams channel',
        input_schema: { type: 'object', properties: { teamId: { type: 'string', description: 'Team ID' }, channelId: { type: 'string', description: 'Channel ID' } }, required: ['teamId', 'channelId'] }
      },
      // ===== GOOGLE DRIVE TOOLS =====
      {
        name: 'google_drive_search',
        description: 'Search files in Google Drive',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] }
      },
      {
        name: 'google_drive_list',
        description: 'List recent files in Google Drive',
        input_schema: { type: 'object', properties: { pageSize: { type: 'number', description: 'Number of files (max 100)' }, folderId: { type: 'string', description: 'Folder ID (optional)' } } }
      },
      {
        name: 'google_drive_get_content',
        description: 'Get text content of a Google Drive document',
        input_schema: { type: 'object', properties: { fileId: { type: 'string', description: 'File ID' } }, required: ['fileId'] }
      },
      {
        name: 'google_drive_create_doc',
        description: 'Create a new Google Doc in Google Drive with specified content. Use when user asks to create a document, report, meeting notes, summary, etc. Returns a link to the created document. The content supports basic text formatting.',
        input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Document title' }, content: { type: 'string', description: 'Document content (plain text, will be inserted into Google Doc)' }, folderId: { type: 'string', description: 'Optional: Google Drive folder ID to create the doc in' } }, required: ['title', 'content'] }
      },
      // ===== WEATHER & WEB SEARCH TOOLS (always available) =====
      {
        name: 'weather_forecast',
        description: 'Get current weather and forecast for any city/location. Returns temperature, humidity, wind, conditions, and 7-day forecast. Use this whenever user asks about weather, temperature, rain, or forecasts for any location.',
        input_schema: { type: 'object', properties: { city: { type: 'string', description: 'City name (e.g. "Tokyo", "大阪", "New York")' }, days: { type: 'number', description: 'Forecast days (1-7, default 3)' } }, required: ['city'] }
      },
      {
        name: 'web_search',
        description: 'Search the web for current information. For stock/financial queries, returns REAL-TIME stock prices from Yahoo Finance in the "stockPrices" array (ticker, price, change, changePercent, currency). ALWAYS report the exact prices from stockPrices. Also returns Google Search context. For any query, check "answer" field first — it contains pre-formatted data to report directly. NEVER add disclaimers about data sources.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search query in the most relevant language (use Japanese for Japanese topics)' } }, required: ['query'] }
      }
    ];

    // ===== TOOL EXECUTION =====
    async function executeTool(name, input, gToken, msTk) {
      const gh = { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' };
      const mh = { 'Authorization': 'Bearer ' + msTk, 'Content-Type': 'application/json' };

      try {
        switch (name) {

          // ----- Gmail -----
          case 'gmail_search': {
            const q = encodeURIComponent(input.query || '');
            const max = input.maxResults || 15;
            const listR = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + q + '&maxResults=' + max, { headers: gh });
            const listD = await listR.json();
            if (!listR.ok) return { error: listD.error?.message || 'Gmail search failed' };
            if (!listD.messages || listD.messages.length === 0) return { results: [], message: 'No emails found matching: ' + input.query };
            const results = [];
            for (const msg of listD.messages.slice(0, max)) {
              const detR = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + msg.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To', { headers: gh });
              const detD = await detR.json();
              if (detR.ok) {
                const hdrs = {};
                (detD.payload?.headers || []).forEach(h => { hdrs[h.name] = h.value; });
                results.push({ id: detD.id, threadId: detD.threadId, from: hdrs.From || '', to: hdrs.To || '', subject: hdrs.Subject || '', date: hdrs.Date || '', snippet: detD.snippet || '', labelIds: detD.labelIds || [] });
              }
            }
            return { results, totalFound: listD.resultSizeEstimate || results.length };
          }

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

          case 'gmail_get_attachments': {
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + input.messageId + '?format=full', { headers: gh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Failed' };
            const attachments = [];
            function findParts(parts) {
              for (const p of (parts || [])) {
                if (p.filename && p.filename.length > 0) {
                  attachments.push({ filename: p.filename, mimeType: p.mimeType, size: p.body?.size || 0 });
                }
                if (p.parts) findParts(p.parts);
              }
            }
            findParts(d.payload?.parts);
            if (d.payload?.filename && d.payload.filename.length > 0) {
              attachments.push({ filename: d.payload.filename, mimeType: d.payload.mimeType, size: d.payload.body?.size || 0 });
            }
            return { hasAttachments: attachments.length > 0, count: attachments.length, attachments };
          }

          case 'gmail_create_draft': {
            const toLine = input.to;
            const subj = input.subject;
            const bodyText = input.body;
            const encSubj = /[^\x20-\x7E]/.test(subj) ? '=?UTF-8?B?' + Buffer.from(subj, 'utf8').toString('base64') + '?=' : subj;
            let rawEmail = 'To: ' + toLine + '\nSubject: ' + encSubj + '\nMIME-Version: 1.0\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: base64\n';
            if (input.cc) rawEmail += 'Cc: ' + input.cc + '\n';
            if (input.bcc) rawEmail += 'Bcc: ' + input.bcc + '\n';
            rawEmail += '\n' + Buffer.from(bodyText, 'utf8').toString('base64');
            const encoded = Buffer.from(rawEmail, 'utf8').toString('base64url');
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
              method: 'POST', headers: gh,
              body: JSON.stringify({ message: { raw: encoded } })
            });
            const d = await r.json();
            return r.ok ? { success: true, draftId: d.id, message: 'Draft created. Ask user: send now or keep as draft?' } : { error: d.error?.message || 'Failed to create draft' };
          }

          case 'gmail_send_draft': {
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts/send', {
              method: 'POST', headers: gh,
              body: JSON.stringify({ id: input.draftId })
            });
            const d = await r.json();
            return r.ok ? { success: true, messageId: d.id, message: 'Email sent successfully' } : { error: d.error?.message || 'Failed to send' };
          }

          case 'gmail_send_direct': {
            const toLine = input.to;
            const subj = input.subject;
            const bodyText = input.body;
            const encSubj2 = /[^\x20-\x7E]/.test(subj) ? '=?UTF-8?B?' + Buffer.from(subj, 'utf8').toString('base64') + '?=' : subj;
            let rawEmail = 'To: ' + toLine + '\nSubject: ' + encSubj2 + '\nMIME-Version: 1.0\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: base64\n';
            if (input.cc) rawEmail += 'Cc: ' + input.cc + '\n';
            if (input.bcc) rawEmail += 'Bcc: ' + input.bcc + '\n';
            rawEmail += '\n' + Buffer.from(bodyText, 'utf8').toString('base64');
            const encoded = Buffer.from(rawEmail, 'utf8').toString('base64url');
            const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST', headers: gh,
              body: JSON.stringify({ raw: encoded })
            });
            const d = await r.json();
            return r.ok ? { success: true, messageId: d.id, message: 'Email sent' } : { error: d.error?.message || 'Failed to send' };
          }

          // ----- Google Calendar -----
          case 'calendar_list_events': {
            const start = encodeURIComponent(input.startDate);
            const end = encodeURIComponent(input.endDate);
            const max = input.maxResults || 30;
            let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + start + '&timeMax=' + end + '&maxResults=' + max + '&singleEvents=true&orderBy=startTime';
            if (input.query) url += '&q=' + encodeURIComponent(input.query);
            const r = await fetch(url, { headers: gh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Calendar list failed' };
            const events = (d.items || []).map(e => ({
              id: e.id,
              summary: e.summary || '(no title)',
              start: e.start?.dateTime || e.start?.date || '',
              end: e.end?.dateTime || e.end?.date || '',
              location: e.location || '',
              description: (e.description || '').substring(0, 200),
              attendees: (e.attendees || []).map(a => ({ email: a.email, name: a.displayName || '', status: a.responseStatus })),
              isAllDay: !!e.start?.date,
              status: e.status
            }));
            return { results: events, count: events.length };
          }

          case 'calendar_find_free_time': {
            const start = encodeURIComponent(input.startDate);
            const end = encodeURIComponent(input.endDate);
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + start + '&timeMax=' + end + '&maxResults=100&singleEvents=true&orderBy=startTime', { headers: gh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Calendar fetch failed' };
            const events = (d.items || []).filter(e => e.start?.dateTime).map(e => ({
              start: new Date(e.start.dateTime),
              end: new Date(e.end.dateTime),
              summary: e.summary || '(no title)'
            }));
            const minDuration = (input.durationMinutes || 30) * 60 * 1000;
            const bStart = input.startHour ?? 9;
            const bEnd = input.endHour ?? 18;
            const rangeStart = new Date(input.startDate);
            const rangeEnd = new Date(input.endDate);
            const freeSlots = [];
            const current = new Date(rangeStart);
            current.setHours(0, 0, 0, 0);
            while (current < rangeEnd && freeSlots.length < 20) {
              const dow = current.getDay();
              if (dow === 0 || dow === 6) { current.setDate(current.getDate() + 1); continue; }
              const dayStart = new Date(current); dayStart.setHours(bStart, 0, 0, 0);
              const dayEnd = new Date(current); dayEnd.setHours(bEnd, 0, 0, 0);
              const dayEvents = events.filter(e => e.start < dayEnd && e.end > dayStart).sort((a, b) => a.start - b.start);
              let cursor = new Date(Math.max(dayStart, rangeStart));
              for (const ev of dayEvents) {
                const evStart = new Date(Math.max(ev.start, dayStart));
                if (evStart > cursor && (evStart - cursor) >= minDuration) {
                  freeSlots.push({ start: cursor.toISOString(), end: evStart.toISOString(), durationMin: Math.round((evStart - cursor) / 60000) });
                }
                cursor = new Date(Math.max(cursor, ev.end));
              }
              const effectiveDayEnd = new Date(Math.min(dayEnd, rangeEnd));
              if (effectiveDayEnd > cursor && (effectiveDayEnd - cursor) >= minDuration) {
                freeSlots.push({ start: cursor.toISOString(), end: effectiveDayEnd.toISOString(), durationMin: Math.round((effectiveDayEnd - cursor) / 60000) });
              }
              current.setDate(current.getDate() + 1);
            }
            return { freeSlots, count: freeSlots.length, businessHours: bStart + ':00-' + bEnd + ':00', minDuration: (input.durationMinutes || 30) + 'min' };
          }

          case 'calendar_check_conflicts': {
            const bufferMs = 15 * 60 * 1000;
            const checkStart = new Date(new Date(input.startDateTime).getTime() - bufferMs);
            const checkEnd = new Date(new Date(input.endDateTime).getTime() + bufferMs);
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + encodeURIComponent(checkStart.toISOString()) + '&timeMax=' + encodeURIComponent(checkEnd.toISOString()) + '&maxResults=20&singleEvents=true&orderBy=startTime', { headers: gh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Calendar fetch failed' };
            const proposedStart = new Date(input.startDateTime);
            const proposedEnd = new Date(input.endDateTime);
            const conflicts = [];
            const nearby = [];
            for (const e of (d.items || [])) {
              const eStart = new Date(e.start?.dateTime || e.start?.date);
              const eEnd = new Date(e.end?.dateTime || e.end?.date);
              if (eStart < proposedEnd && eEnd > proposedStart) {
                conflicts.push({ id: e.id, summary: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date });
              } else {
                nearby.push({ summary: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date });
              }
            }
            return { hasConflict: conflicts.length > 0, conflicts, nearbyEvents: nearby, message: conflicts.length > 0 ? 'Warning: ' + conflicts.length + ' conflicting event(s) found!' : 'No conflicts. Time slot is available.' };
          }

          case 'calendar_create_event': {
            const ev = { summary: input.summary, start: { dateTime: input.startDateTime }, end: { dateTime: input.endDateTime } };
            if (input.description) ev.description = input.description;
            if (input.location) ev.location = input.location;
            if (input.attendees && input.attendees.length > 0) {
              ev.attendees = input.attendees.map(e => ({ email: e }));
            }
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', { method: 'POST', headers: gh, body: JSON.stringify(ev) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, summary: d.summary, start: d.start, end: d.end, attendees: d.attendees?.map(a => a.email) } : { error: d.error?.message || 'Failed' };
          }

          case 'calendar_update_event': {
            const patch = {};
            if (input.summary) patch.summary = input.summary;
            if (input.description) patch.description = input.description;
            if (input.startDateTime) patch.start = { dateTime: input.startDateTime };
            if (input.endDateTime) patch.end = { dateTime: input.endDateTime };
            if (input.location) patch.location = input.location;
            if (input.attendees && input.attendees.length > 0) {
              patch.attendees = input.attendees.map(e => ({ email: e }));
            }
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + input.eventId + '?sendUpdates=all', { method: 'PATCH', headers: gh, body: JSON.stringify(patch) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, summary: d.summary } : { error: d.error?.message || 'Failed' };
          }

          case 'calendar_delete_event': {
            const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + input.eventId + '?sendUpdates=all', { method: 'DELETE', headers: gh });
            return (r.ok || r.status === 204) ? { success: true, message: 'Event deleted' } : { error: 'Failed to delete' };
          }

          // ----- Outlook Mail -----
          case 'outlook_search_mail': {
            if (!msTk) return { error: 'Outlook not connected. Please connect Outlook first in Settings.' };
            const top = input.top || 20;
            const sel = '$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,flag,hasAttachments';
            const order = '$orderby=receivedDateTime desc';
            const filters = [];
            if (input.startDate) filters.push("receivedDateTime ge " + input.startDate);
            if (input.endDate) filters.push("receivedDateTime lt " + input.endDate);
            if (input.fromAddress) filters.push("from/emailAddress/address eq '" + input.fromAddress + "'");
            const base = input.folder ? 'https://graph.microsoft.com/v1.0/me/mailFolders/' + input.folder + '/messages' : 'https://graph.microsoft.com/v1.0/me/messages';
            let url = base + '?$top=' + top + '&' + sel + '&' + order;
            if (filters.length > 0) url += '&$filter=' + encodeURIComponent(filters.join(' and '));
            if (input.query) url += '&$search=' + encodeURIComponent('"' + input.query + '"');
            const r = await fetch(url, { headers: mh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Outlook search failed' };
            const emails = (d.value || []).map(m => ({
              id: m.id, subject: m.subject,
              from: (m.from?.emailAddress?.name || '') + ' <' + (m.from?.emailAddress?.address || '') + '>',
              date: m.receivedDateTime, preview: (m.bodyPreview || '').substring(0, 200),
              isRead: m.isRead, flagStatus: m.flag?.flagStatus || 'notFlagged', hasAttachments: m.hasAttachments
            }));
            return { results: emails, count: emails.length };
          }

          case 'outlook_delete_mail': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + input.messageId, { method: 'DELETE', headers: mh });
            return (r.ok || r.status === 204) ? { success: true, message: 'Email deleted' } : { error: 'Failed to delete email' };
          }

          case 'outlook_move_mail': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + input.messageId + '/move', {
              method: 'POST', headers: mh,
              body: JSON.stringify({ destinationId: input.destinationFolder })
            });
            const d = await r.json();
            return r.ok ? { success: true, message: 'Email moved', newId: d.id } : { error: d.error?.message || 'Failed to move email' };
          }

          case 'outlook_mark_read': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + input.messageId, {
              method: 'PATCH', headers: mh,
              body: JSON.stringify({ isRead: input.isRead })
            });
            return r.ok ? { success: true, message: input.isRead ? 'Marked as read' : 'Marked as unread' } : { error: 'Failed to update read status' };
          }

          case 'outlook_flag_mail': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + input.messageId, {
              method: 'PATCH', headers: mh,
              body: JSON.stringify({ flag: { flagStatus: input.flagStatus } })
            });
            return r.ok ? { success: true, message: 'Flag updated to: ' + input.flagStatus } : { error: 'Failed to update flag' };
          }

          case 'outlook_get_attachments': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages/' + input.messageId + '/attachments?$select=name,size,contentType,isInline', { headers: mh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Failed to get attachments' };
            const atts = (d.value || []).map(a => ({ name: a.name, size: a.size, contentType: a.contentType, isInline: a.isInline }));
            return { hasAttachments: atts.length > 0, count: atts.length, attachments: atts };
          }

          case 'outlook_create_draft': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const toRecipients = input.to.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
            const draft = { subject: input.subject, body: { contentType: input.bodyType || 'Text', content: input.body }, toRecipients };
            if (input.cc) {
              draft.ccRecipients = input.cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
            }
            const r = await fetch('https://graph.microsoft.com/v1.0/me/messages', { method: 'POST', headers: mh, body: JSON.stringify(draft) });
            const d = await r.json();
            return r.ok ? { success: true, draftId: d.id, subject: d.subject, message: 'Outlook draft created' } : { error: d.error?.message || 'Failed to create draft' };
          }

          case 'outlook_list_folders': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const r = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders?$top=50&$select=id,displayName,totalItemCount,unreadItemCount', { headers: mh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Failed to list folders' };
            return { folders: (d.value || []).map(f => ({ id: f.id, name: f.displayName, total: f.totalItemCount, unread: f.unreadItemCount })) };
          }

          // ----- Outlook Calendar -----
          case 'outlook_list_events': {
            if (!msTk) return { error: 'Outlook not connected.' };
            const start = encodeURIComponent(input.startDate);
            const end = encodeURIComponent(input.endDate);
            const top = input.top || 20;
            const url = 'https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=' + start + '&endDateTime=' + end + '&$top=' + top + '&$select=id,subject,start,end,location,organizer,isAllDay,bodyPreview,attendees&$orderby=start/dateTime';
            const r = await fetch(url, { headers: mh });
            const d = await r.json();
            if (!r.ok) return { error: d.error?.message || 'Outlook calendar fetch failed' };
            const events = (d.value || []).map(e => ({
              id: e.id, subject: e.subject, start: e.start, end: e.end,
              location: e.location?.displayName || '',
              organizer: e.organizer?.emailAddress?.name || '',
              isAllDay: e.isAllDay,
              attendees: (e.attendees || []).map(a => ({ name: a.emailAddress?.name, email: a.emailAddress?.address, status: a.status?.response })),
              preview: (e.bodyPreview || '').substring(0, 150)
            }));
            return { results: events, count: events.length };
          }

          case 'outlook_calendar_create': {
            const tz = input.timeZone || 'Asia/Tokyo';
            const ev = { subject: input.subject, start: { dateTime: input.startDateTime, timeZone: tz }, end: { dateTime: input.endDateTime, timeZone: tz } };
            if (input.body) ev.body = { contentType: 'Text', content: input.body };
            if (input.location) ev.location = { displayName: input.location };
            if (input.attendees && input.attendees.length > 0) {
              ev.attendees = input.attendees.map(e => ({ emailAddress: { address: e }, type: 'required' }));
            }
            const r = await fetch('https://graph.microsoft.com/v1.0/me/events', { method: 'POST', headers: mh, body: JSON.stringify(ev) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, subject: d.subject, start: d.start, end: d.end } : { error: d.error?.message || 'Failed' };
          }

          case 'outlook_calendar_update': {
            const patch = {};
            if (input.subject) patch.subject = input.subject;
            if (input.body) patch.body = { contentType: 'Text', content: input.body };
            const tz = input.timeZone || 'Asia/Tokyo';
            if (input.startDateTime) patch.start = { dateTime: input.startDateTime, timeZone: tz };
            if (input.endDateTime) patch.end = { dateTime: input.endDateTime, timeZone: tz };
            if (input.location) patch.location = { displayName: input.location };
            if (input.attendees && input.attendees.length > 0) {
              patch.attendees = input.attendees.map(e => ({ emailAddress: { address: e }, type: 'required' }));
            }
            const r = await fetch('https://graph.microsoft.com/v1.0/me/events/' + input.eventId, { method: 'PATCH', headers: mh, body: JSON.stringify(patch) });
            const d = await r.json();
            return r.ok ? { success: true, eventId: d.id, subject: d.subject } : { error: d.error?.message || 'Failed' };
          }

          case 'outlook_calendar_delete': {
            const r = await fetch('https://graph.microsoft.com/v1.0/me/events/' + input.eventId, { method: 'DELETE', headers: mh });
            return (r.ok || r.status === 204) ? { success: true, message: 'Outlook event deleted' } : { error: 'Failed to delete' };
          }

          case 'sharepoint_search_sites': {
            const q = input.query || '*';
            const sr = await fetch('https://graph.microsoft.com/v1.0/sites?search=' + encodeURIComponent(q) + '&$top=10&$select=id,displayName,webUrl,description', { headers: mh });
            if (sr.ok) { const sd = await sr.json(); return (sd.value || []).map(s => ({ id: s.id, name: s.displayName, url: s.webUrl, desc: s.description })); }
            return { error: 'Failed to search sites' };
          }
          case 'sharepoint_list_files': {
            const sid = input.siteId;
            const fp = input.path ? ':/' + input.path + ':/children' : '/children';
            const fr = await fetch('https://graph.microsoft.com/v1.0/sites/' + sid + '/drive/root' + fp + '?$top=50&$select=id,name,webUrl,size,lastModifiedDateTime,file,folder', { headers: mh });
            if (fr.ok) { const fd = await fr.json(); return (fd.value || []).map(f => ({ id: f.id, name: f.name, url: f.webUrl, size: f.size, modified: f.lastModifiedDateTime, isFolder: !!f.folder })); }
            return { error: 'Failed to list files' };
          }
          case 'sharepoint_search_files': {
            const sq = input.query;
            const sfr = await fetch('https://graph.microsoft.com/v1.0/search/query', { method: 'POST', headers: mh, body: JSON.stringify({ requests: [{ entityTypes: ['driveItem'], query: { queryString: sq }, from: 0, size: 20 }] }) });
            if (sfr.ok) { const sfd = await sfr.json(); const hits = sfd.value?.[0]?.hitsContainers?.[0]?.hits || []; return hits.map(h => ({ name: h.resource?.name, url: h.resource?.webUrl, size: h.resource?.size, modified: h.resource?.lastModifiedDateTime })); }
            return { error: 'Failed to search files' };
          }
          case 'sharepoint_get_file_content': {
            const gsid = input.siteId;
            const gid = input.itemId;
            const gm = await fetch('https://graph.microsoft.com/v1.0/sites/' + gsid + '/drive/items/' + gid + '?$select=id,name,webUrl,size,file,lastModifiedDateTime', { headers: mh });
            if (gm.ok) { const gmd = await gm.json(); const preview = await fetch('https://graph.microsoft.com/v1.0/sites/' + gsid + '/drive/items/' + gid + '/content', { headers: mh }).then(r => r.text()).then(t => t.substring(0, 3000)).catch(() => '(binary file)'); return { name: gmd.name, url: gmd.webUrl, size: gmd.size, modified: gmd.lastModifiedDateTime, contentPreview: preview }; }
            return { error: 'Failed to get file' };
          }

          case 'teams_list_chats': {
            const top = input.top || 20;
            const r = await fetch('https://graph.microsoft.com/v1.0/me/chats?$top='+top+'&$expand=lastMessagePreview&$orderby=lastMessagePreview/createdDateTime desc', {headers: mh});
            if(!r.ok){const e=await r.text();return {error:e};}
            const d = await r.json();
            return {chats:(d.value||[]).map(ch=>({id:ch.id,topic:ch.topic||'(no topic)',type:ch.chatType,lastMsg:ch.lastMessagePreview?{from:ch.lastMessagePreview.from?.user?.displayName||'',body:(ch.lastMessagePreview.body?.content||'').replace(/<[^>]*>/g,'').substring(0,300),date:ch.lastMessagePreview.createdDateTime}:null}))};
          }

          case 'teams_get_chat_messages': {
            const r = await fetch('https://graph.microsoft.com/v1.0/me/chats/'+input.chatId+'/messages?$top=20', {headers: mh});
            if(!r.ok){const e=await r.text();return {error:e};}
            const d = await r.json();
            return {messages:(d.value||[]).map(m=>({from:m.from?.user?.displayName||'',body:(m.body?.content||'').replace(/<[^>]*>/g,'').substring(0,500),date:m.createdDateTime}))};
          }

          case 'teams_list_teams_channels': {
            const tr = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {headers: mh});
            if(!tr.ok){const e=await tr.text();return {error:e};}
            const td = await tr.json();
            const results = [];
            for(const team of (td.value||[])){
              const cr = await fetch('https://graph.microsoft.com/v1.0/teams/'+team.id+'/channels', {headers: mh});
              if(!cr.ok) continue;
              const cd = await cr.json();
              results.push({teamId:team.id,teamName:team.displayName,channels:(cd.value||[]).map(ch=>({id:ch.id,name:ch.displayName}))});
            }
            return {teams:results};
          }

          case 'teams_get_channel_messages': {
            const r = await fetch('https://graph.microsoft.com/v1.0/teams/'+input.teamId+'/channels/'+input.channelId+'/messages?$top=20', {headers: mh});
            if(!r.ok){const e=await r.text();return {error:e};}
            const d = await r.json();
            return {messages:(d.value||[]).map(m=>({from:m.from?.user?.displayName||'',body:(m.body?.content||'').replace(/<[^>]*>/g,'').substring(0,500),date:m.createdDateTime}))};
          }

          case 'google_drive_search': {
            // Try fullText search first (searches inside documents), fall back to name-only
            const escapedQ = input.query.replace(/'/g, "\\'");
            const fullQ = encodeURIComponent("fullText contains '" + escapedQ + "' and trashed=false");
            let r = await fetch('https://www.googleapis.com/drive/v3/files?q=' + fullQ + '&pageSize=20&orderBy=modifiedTime%20desc&fields=files%28id%2Cname%2CmimeType%2CmodifiedTime%2Cowners%2CwebViewLink%29', {headers: gh});
            if (!r.ok) {
              // Fallback to name-only search
              const nameQ = encodeURIComponent("name contains '" + escapedQ + "' and trashed=false");
              r = await fetch('https://www.googleapis.com/drive/v3/files?q=' + nameQ + '&pageSize=20&orderBy=modifiedTime%20desc&fields=files%28id%2Cname%2CmimeType%2CmodifiedTime%2Cowners%2CwebViewLink%29', {headers: gh});
              if (!r.ok) { const e = await r.text(); return { error: e }; }
            }
            const d = await r.json();
            return {files:(d.files||[]).map(f=>({id:f.id,name:f.name,type:f.mimeType,modified:f.modifiedTime,link:f.webViewLink||''}))};
          }

          case 'google_drive_list': {
            const ps = input.pageSize || 30;
            let q = 'trashed=false';
            if(input.folderId) q += " and '"+input.folderId+"' in parents";
            const r = await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&pageSize='+ps+'&orderBy=modifiedTime%20desc&fields=files%28id%2Cname%2CmimeType%2CmodifiedTime%2Cowners%2CwebViewLink%29', {headers: gh});
            if(!r.ok){const e=await r.text();return {error:e};}
            const d = await r.json();
            return {files:(d.files||[]).map(f=>({id:f.id,name:f.name,type:f.mimeType,modified:f.modifiedTime,link:f.webViewLink||''}))};
          }

          case 'google_drive_create_doc': {
            const docMeta = { name: input.title, mimeType: 'application/vnd.google-apps.document' };
            if (input.folderId) docMeta.parents = [input.folderId];
            const createR = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST', headers: gh, body: JSON.stringify(docMeta)
            });
            const createD = await createR.json();
            if (!createR.ok) return { error: createD.error?.message || 'Failed to create document' };
            const docId = createD.id;
            const insertR = await fetch('https://docs.googleapis.com/v1/documents/' + docId + ':batchUpdate', {
              method: 'POST', headers: gh,
              body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: input.content } }] })
            });
            const link = 'https://docs.google.com/document/d/' + docId + '/edit';
            return insertR.ok
              ? { success: true, docId, title: input.title, link, message: 'Document created: ' + link }
              : { success: true, docId, title: input.title, link, message: 'Document created but content insert may have partially failed. Link: ' + link };
          }

          case 'google_drive_get_content': {
            const mr = await fetch('https://www.googleapis.com/drive/v3/files/'+input.fileId+'?fields=id%2Cname%2CmimeType%2CmodifiedTime', {headers: gh});
            if(!mr.ok){const e=await mr.text();return {error:e};}
            const meta = await mr.json();
            let content = '';
            if(meta.mimeType && meta.mimeType.startsWith('application/vnd.google-apps.')){
              const er = await fetch('https://www.googleapis.com/drive/v3/files/'+input.fileId+'/export?mimeType=text%2Fplain', {headers: gh});
              if(er.ok) content = (await er.text()).substring(0,5000);
            } else {
              const dr = await fetch('https://www.googleapis.com/drive/v3/files/'+input.fileId+'?alt=media', {headers: gh});
              if(dr.ok) content = (await dr.text()).substring(0,5000);
            }
            return {file:meta, content};
          }

          // ----- Slack DM -----
          case 'slack_search_users': {
            if (!slackToken) return { error: 'Slack not connected. Please connect Slack first in Settings.' };
            const sh = { Authorization: 'Bearer ' + slackToken };
            let allMembers = [];
            let cursor = '';
            for (let page = 0; page < 3; page++) {
              const url = 'https://slack.com/api/users.list?limit=200' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
              const r = await fetch(url, { headers: sh });
              const d = await r.json();
              if (!d.ok) return { error: 'Slack API error: ' + (d.error || 'unknown') };
              allMembers = allMembers.concat(d.members || []);
              cursor = d.response_metadata?.next_cursor || '';
              if (!cursor) break;
            }
            const q = (input.query || '').toLowerCase();
            const matches = allMembers
              .filter(u => !u.deleted && !u.is_bot && u.id !== 'USLACKBOT')
              .filter(u => {
                const rn = (u.real_name || '').toLowerCase();
                const dn = (u.profile?.display_name || '').toLowerCase();
                const nm = (u.name || '').toLowerCase();
                const em = (u.profile?.email || '').toLowerCase();
                const fn = (u.profile?.first_name || '').toLowerCase();
                const ln = (u.profile?.last_name || '').toLowerCase();
                return rn.includes(q) || dn.includes(q) || nm.includes(q) || em.includes(q) || fn.includes(q) || ln.includes(q);
              })
              .slice(0, 10)
              .map(u => ({
                id: u.id,
                real_name: u.real_name || u.name,
                display_name: u.profile?.display_name || '',
                email: u.profile?.email || '',
                title: u.profile?.title || '',
                status: u.profile?.status_text || ''
              }));
            return { results: matches, count: matches.length, message: matches.length === 0 ? 'No users found matching: ' + input.query : null };
          }

          case 'slack_read_dm': {
            if (!slackToken) return { error: 'Slack not connected.' };
            const sh = { Authorization: 'Bearer ' + slackToken, 'Content-Type': 'application/json' };
            const openR = await fetch('https://slack.com/api/conversations.open', {
              method: 'POST', headers: sh,
              body: JSON.stringify({ users: input.userId })
            });
            const openD = await openR.json();
            if (!openD.ok) return { error: 'Cannot open DM: ' + (openD.error || 'unknown') };
            const channelId = openD.channel.id;
            const limit = Math.min(input.limit || 20, 50);
            const histR = await fetch('https://slack.com/api/conversations.history?channel=' + channelId + '&limit=' + limit, { headers: sh });
            const histD = await histR.json();
            if (!histD.ok) return { error: 'Cannot read DM: ' + (histD.error || 'unknown') };
            const uids = [...new Set((histD.messages || []).map(m => m.user).filter(Boolean))];
            const userMap = {};
            for (const uid of uids.slice(0, 10)) {
              try {
                const ur = await fetch('https://slack.com/api/users.info?user=' + uid, { headers: sh });
                const ud = await ur.json();
                if (ud.ok) userMap[uid] = ud.user.real_name || ud.user.name;
              } catch {}
            }
            const msgList = (histD.messages || []).reverse().map(m => ({
              from: userMap[m.user] || m.user || 'bot',
              text: (m.text || '').substring(0, 500),
              date: new Date(parseFloat(m.ts) * 1000).toLocaleString('ja-JP'),
              ts: m.ts
            }));
            return { channelId, messages: msgList, count: msgList.length };
          }

          case 'slack_send_dm': {
            if (!slackToken) return { error: 'Slack not connected.' };
            const sh = { Authorization: 'Bearer ' + slackToken, 'Content-Type': 'application/json' };
            const openR = await fetch('https://slack.com/api/conversations.open', {
              method: 'POST', headers: sh,
              body: JSON.stringify({ users: input.userId })
            });
            const openD = await openR.json();
            if (!openD.ok) return { error: 'Cannot open DM: ' + (openD.error || 'unknown') };
            const sendR = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST', headers: sh,
              body: JSON.stringify({ channel: openD.channel.id, text: input.text })
            });
            const sendD = await sendR.json();
            return sendD.ok
              ? { success: true, message: 'DM sent successfully', channel: openD.channel.id, ts: sendD.ts }
              : { error: 'Failed to send DM: ' + (sendD.error || 'unknown') };
          }

          // ----- Weather (Open-Meteo, no API key needed) -----
          case 'weather_forecast': {
            const city = input.city || 'Tokyo';
            const days = Math.min(input.days || 3, 7);
            const cityMap = {'東京':'Tokyo','大阪':'Osaka','名古屋':'Nagoya','京都':'Kyoto','福岡':'Fukuoka','札幌':'Sapporo','仙台':'Sendai','広島':'Hiroshima','横浜':'Yokohama','神戸':'Kobe','北九州':'Kitakyushu','千葉':'Chiba','さいたま':'Saitama','新潟':'Niigata','浜松':'Hamamatsu','静岡':'Shizuoka','岡山':'Okayama','熊本':'Kumamoto','鹿児島':'Kagoshima','那覇':'Naha','金沢':'Kanazawa','長崎':'Nagasaki','松山':'Matsuyama','高松':'Takamatsu','大分':'Oita','宮崎':'Miyazaki','富山':'Toyama','長野':'Nagano','岐阜':'Gifu','奈良':'Nara','和歌山':'Wakayama','滋賀':'Shiga','盛岡':'Morioka','秋田':'Akita','山形':'Yamagata','福島':'Fukushima','水戸':'Mito','宇都宮':'Utsunomiya','前橋':'Maebashi','甲府':'Kofu','福井':'Fukui','津':'Tsu','徳島':'Tokushima','高知':'Kochi','佐賀':'Saga','青森':'Aomori','山口':'Yamaguchi','松江':'Matsue','鳥取':'Tottori'};
            const searchCity = cityMap[city] || city;
            let geoR = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(searchCity) + '&count=3&language=ja');
            let geoD = await geoR.json();
            if ((!geoD.results || geoD.results.length === 0) && searchCity === city) {
              geoR = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=3&language=en');
              geoD = await geoR.json();
            }
            if (!geoD.results || geoD.results.length === 0) return { error: '都市が見つかりません: ' + city };
            const loc = geoD.results[0];
            const lat = loc.latitude, lon = loc.longitude;
            const locName = loc.name + (loc.admin1 ? ', ' + loc.admin1 : '') + (loc.country ? ', ' + loc.country : '');
            const wxR = await fetch(
              'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
              '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m' +
              '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset' +
              '&timezone=Asia%2FTokyo&forecast_days=' + days
            );
            const wxD = await wxR.json();
            if (wxD.error) return { error: wxD.reason || 'Weather API error' };
            const wmoCodes = {0:'快晴',1:'晴れ',2:'一部曇り',3:'曇り',45:'霧',48:'着氷性の霧',51:'弱い霧雨',53:'霧雨',55:'強い霧雨',61:'小雨',63:'雨',65:'大雨',66:'着氷性小雨',67:'着氷性雨',71:'小雪',73:'雪',75:'大雪',77:'霧雪',80:'にわか雨(弱)',81:'にわか雨',82:'にわか雨(激)',85:'にわか雪(弱)',86:'にわか雪(強)',95:'雷雨',96:'雷雨(雹あり)',99:'雷雨(大粒の雹)'};
            const cur = wxD.current;
            const daily = wxD.daily;
            const result = {
              location: locName,
              current: {
                temperature: cur.temperature_2m + '°C',
                feelsLike: cur.apparent_temperature + '°C',
                humidity: cur.relative_humidity_2m + '%',
                weather: wmoCodes[cur.weather_code] || 'コード' + cur.weather_code,
                wind: cur.wind_speed_10m + 'km/h',
                precipitation: cur.precipitation + 'mm'
              },
              forecast: []
            };
            for (let i = 0; i < (daily.time || []).length; i++) {
              result.forecast.push({
                date: daily.time[i],
                weather: wmoCodes[daily.weather_code[i]] || 'コード' + daily.weather_code[i],
                maxTemp: daily.temperature_2m_max[i] + '°C',
                minTemp: daily.temperature_2m_min[i] + '°C',
                precipitation: daily.precipitation_sum[i] + 'mm',
                precipProbability: daily.precipitation_probability_max[i] + '%',
                sunrise: daily.sunrise[i],
                sunset: daily.sunset[i]
              });
            }
            return result;
          }

          // ----- Web Search (Yahoo Finance for stocks + Gemini Grounding + fallbacks) -----
          case 'web_search': {
            const query = input.query || '';

            // Detect query type
            const ql = query.toLowerCase();
            const isFinancial = /株価|stock|price|為替|exchange rate|ドル|円|usd|jpy|eur|市場|market|時価総額|配当|nasdaq|nyse|日経|topix|s&p|ダウ|ticker/.test(ql);
            const isStats = /統計|数値|データ|率|%|成長率|gdp|人口|売上|収益|利益/.test(ql);

            // ===== YAHOO FINANCE: Get actual stock prices for financial queries =====
            let stockData = null;
            if (isFinancial) {
              try {
                // Extract ticker symbols from query (e.g., NVDA, 7203.T, AAPL)
                const tickerPatterns = query.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,2})?\b/g) || [];
                // Map common Japanese company names to tickers
                const jpCompanyMap = {
                  'トヨタ': '7203.T', 'ソニー': '6758.T', 'ソフトバンク': '9984.T',
                  'ホンダ': '7267.T', '任天堂': '7974.T', 'パナソニック': '6752.T',
                  'キーエンス': '6861.T', 'ファーストリテイリング': '9983.T', 'ユニクロ': '9983.T',
                  '日立': '6501.T', '三菱UFJ': '8306.T', '三井住友': '8316.T',
                  'みずほ': '8411.T', 'NTT': '9432.T', 'KDDI': '9433.T',
                  'ドコモ': '9432.T', '東京エレクトロン': '8035.T', 'リクルート': '6098.T',
                  'ダイキン': '6367.T', '信越化学': '4063.T', 'デンソー': '6902.T',
                  '村田製作所': '6981.T', 'SMC': '6273.T', 'HOYA': '7741.T',
                  'テルモ': '4543.T', '中外製薬': '4519.T', '第一三共': '4568.T',
                  'エーザイ': '4523.T', 'オリエンタルランド': '4661.T',
                  'メルカリ': '4385.T', 'ZOZO': '3092.T', 'サイバーエージェント': '4751.T',
                  '楽天': '4755.T', 'LINE': '4689.T', 'シャープ': '6753.T',
                  '日産': '7201.T', 'スズキ': '7269.T', 'マツダ': '7261.T',
                  '富士通': '6702.T', 'NEC': '6701.T', '東芝': '6502.T',
                  'アップル': 'AAPL', 'アマゾン': 'AMZN', 'グーグル': 'GOOGL',
                  'マイクロソフト': 'MSFT', 'テスラ': 'TSLA', 'メタ': 'META',
                  'エヌビディア': 'NVDA', 'NVIDIA': 'NVDA', 'TSM': 'TSM', 'TSMC': 'TSM',
                  'AMD': 'AMD', 'インテル': 'INTC'
                };
                const tickers = [...tickerPatterns];
                for (const [name, ticker] of Object.entries(jpCompanyMap)) {
                  if (query.includes(name)) tickers.push(ticker);
                }
                // Also handle US tickers without dots
                const usTickerMap = {
                  'NVDA': 'NVDA', 'AAPL': 'AAPL', 'GOOGL': 'GOOGL', 'GOOG': 'GOOG',
                  'MSFT': 'MSFT', 'AMZN': 'AMZN', 'META': 'META', 'TSLA': 'TSLA',
                  'TSM': 'TSM', 'AMD': 'AMD', 'INTC': 'INTC', 'NFLX': 'NFLX',
                  'AVGO': 'AVGO', 'COST': 'COST', 'CRM': 'CRM', 'ORCL': 'ORCL',
                  'ADBE': 'ADBE', 'QCOM': 'QCOM', 'TXN': 'TXN', 'PLTR': 'PLTR',
                  'ARM': 'ARM', 'SMCI': 'SMCI', 'MRVL': 'MRVL', 'MU': 'MU',
                  'SNOW': 'SNOW', 'UBER': 'UBER', 'COIN': 'COIN',
                };
                // Deduplicate tickers
                const uniqueTickers = [...new Set(tickers)].filter(t => t.length >= 1 && t.length <= 7);

                if (uniqueTickers.length > 0) {
                  console.log('[web_search] Yahoo Finance tickers:', uniqueTickers);
                  const stockResults = [];
                  for (const ticker of uniqueTickers.slice(0, 5)) {
                    try {
                      const yahooUrl = 'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?interval=1d&range=5d';
                      const abortY = new AbortController();
                      const timeoutY = setTimeout(() => abortY.abort(), 8000);
                      const yR = await fetch(yahooUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UILSON/1.0)' },
                        signal: abortY.signal
                      });
                      clearTimeout(timeoutY);
                      if (yR.ok) {
                        const yD = await yR.json();
                        const result = yD.chart?.result?.[0];
                        if (result) {
                          const meta = result.meta;
                          const price = meta.regularMarketPrice;
                          const prevClose = meta.chartPreviousClose || meta.previousClose;
                          const currency = meta.currency || 'USD';
                          const name = meta.shortName || meta.longName || ticker;
                          const exchange = meta.exchangeName || '';
                          const change = prevClose ? (price - prevClose) : null;
                          const changePercent = prevClose ? ((price - prevClose) / prevClose * 100) : null;
                          const marketTime = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '';

                          stockResults.push({
                            ticker,
                            name,
                            price,
                            currency,
                            change: change !== null ? change.toFixed(2) : null,
                            changePercent: changePercent !== null ? changePercent.toFixed(2) : null,
                            exchange,
                            marketTime,
                            previousClose: prevClose,
                            dayHigh: meta.regularMarketDayHigh,
                            dayLow: meta.regularMarketDayLow,
                            volume: meta.regularMarketVolume,
                            marketCap: meta.marketCap
                          });
                          console.log('[web_search] Yahoo Finance OK:', ticker, price, currency);
                        }
                      }
                    } catch (e) {
                      console.log('[web_search] Yahoo Finance error for', ticker, ':', e.message);
                    }
                  }
                  if (stockResults.length > 0) {
                    stockData = stockResults;
                  }
                }
              } catch (e) {
                console.log('[web_search] Yahoo Finance overall error:', e.message);
              }
            }

            // ===== GEMINI GROUNDING: Get web context/analysis =====
            const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
            if (geminiKey) {
              try {
                const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + geminiKey;

                let geminiPrompt;
                if (isFinancial) {
                  geminiPrompt = query + '\n\n上記について検索し、具体的な数値（株価、為替レート、時価総額、前日比など）を含めて回答してください。「〇〇円」「〇〇ドル」「前日比+〇%」のように、必ず具体的な数字を含めてください。';
                } else if (isStats) {
                  geminiPrompt = query + '\n\n上記について検索し、具体的な数値データを含めて回答してください。数字、パーセンテージ、金額など、定量的な情報を必ず含めてください。';
                } else {
                  geminiPrompt = 'Search the web for: ' + query + '\n\nReturn the most relevant and recent information with source URLs.';
                }

                const geminiBody = {
                  contents: [{ parts: [{ text: geminiPrompt }] }],
                  tools: [{ google_search: {} }],
                  generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
                };
                const abortCtrl = new AbortController();
                const timeout = setTimeout(() => abortCtrl.abort(), 15000);
                const geminiR = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(geminiBody),
                  signal: abortCtrl.signal
                });
                clearTimeout(timeout);
                const geminiD = await geminiR.json();

                if (geminiD.candidates && geminiD.candidates[0]) {
                  const candidate = geminiD.candidates[0];
                  const results = [];

                  // Extract grounding chunks (actual search result sources)
                  const grounding = candidate.groundingMetadata;
                  if (grounding && grounding.groundingChunks) {
                    for (const chunk of grounding.groundingChunks.slice(0, 8)) {
                      if (chunk.web) {
                        results.push({
                          title: chunk.web.title || '',
                          snippet: '',
                          link: chunk.web.uri || ''
                        });
                      }
                    }
                  }

                  // Extract grounding supports (text with source attribution)
                  // Accumulate ALL support text per source for richer data
                  if (grounding && grounding.groundingSupports) {
                    for (const support of grounding.groundingSupports) {
                      const text = support.segment ? support.segment.text : '';
                      if (text && support.groundingChunkIndices) {
                        for (const idx of support.groundingChunkIndices) {
                          if (results[idx]) {
                            results[idx].snippet = results[idx].snippet
                              ? results[idx].snippet + ' ' + text
                              : text;
                          }
                        }
                      }
                    }
                  }

                  // Also get Gemini's synthesized answer as context
                  const geminiText = candidate.content && candidate.content.parts
                    ? candidate.content.parts.map(p => p.text || '').join('')
                    : '';

                  // Fill empty snippets from Gemini's answer
                  for (const r of results) {
                    if (!r.snippet && geminiText) {
                      r.snippet = geminiText.substring(0, 200);
                    }
                  }

                  if (results.length > 0 || geminiText) {
                    console.log('[web_search] Gemini Grounding results:', results.length, 'financial:', isFinancial, 'hasStockData:', !!stockData);
                    const resp = { results: results.length > 0 ? results : [{ title: 'Google Search Results', snippet: geminiText, link: '' }], query, summary: geminiText };

                    // Inject Yahoo Finance stock data into the response
                    if (stockData) {
                      resp.stockPrices = stockData;
                      let stockSummary = '【リアルタイム株価データ（Yahoo Finance）】\n';
                      for (const s of stockData) {
                        const sign = parseFloat(s.change) >= 0 ? '+' : '';
                        const currSymbol = s.currency === 'JPY' ? '¥' : (s.currency === 'USD' ? '$' : s.currency + ' ');
                        stockSummary += `${s.name} (${s.ticker}): ${currSymbol}${s.price?.toLocaleString()} `;
                        if (s.change !== null) stockSummary += `前日比 ${sign}${s.change} (${sign}${s.changePercent}%) `;
                        if (s.exchange) stockSummary += `[${s.exchange}] `;
                        if (s.marketTime) stockSummary += `(${s.marketTime}時点)`;
                        stockSummary += '\n';
                        if (s.dayHigh && s.dayLow) stockSummary += `  高値: ${currSymbol}${s.dayHigh?.toLocaleString()} / 安値: ${currSymbol}${s.dayLow?.toLocaleString()}\n`;
                        if (s.previousClose) stockSummary += `  前日終値: ${currSymbol}${s.previousClose?.toLocaleString()}\n`;
                      }
                      resp.answer = stockSummary + '\n' + (geminiText || '');
                      resp.instruction = 'CRITICAL: The "stockPrices" array contains REAL-TIME stock price data from Yahoo Finance. You MUST report these exact prices to the user. Format: "銘柄名 (ティッカー): ○○ドル/円 (前日比 +/-○○%)". The "answer" field has a pre-formatted summary — use it. Do NOT add any disclaimers.';
                    } else if (isFinancial || isStats) {
                      resp.answer = geminiText;
                      resp.instruction = 'IMPORTANT: The "answer" field above contains real-time data from Google Search. Report these numbers directly to the user. Do NOT add disclaimers or suggest checking other sources.';
                    }
                    return resp;
                  }
                }
              } catch (e) {
                console.log('[web_search] Gemini Grounding error:', e.message);
              }
            }

            // If we have stock data but Gemini failed, still return stock data
            if (stockData) {
              let stockSummary = '【リアルタイム株価データ（Yahoo Finance）】\n';
              for (const s of stockData) {
                const sign = parseFloat(s.change) >= 0 ? '+' : '';
                const currSymbol = s.currency === 'JPY' ? '¥' : (s.currency === 'USD' ? '$' : s.currency + ' ');
                stockSummary += `${s.name} (${s.ticker}): ${currSymbol}${s.price?.toLocaleString()} 前日比 ${sign}${s.change} (${sign}${s.changePercent}%)\n`;
              }
              return {
                results: [{ title: 'Yahoo Finance Stock Data', snippet: stockSummary, link: 'https://finance.yahoo.com' }],
                query,
                stockPrices: stockData,
                answer: stockSummary,
                instruction: 'CRITICAL: Report these exact stock prices from Yahoo Finance to the user. Do NOT add disclaimers.'
              };
            }

            // Fallback: Google News RSS (reliable, no API key)
            try {
              const newsUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=ja&gl=JP&ceid=JP:ja';
              const newsR = await fetch(newsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UILSON/1.0)' }
              });
              if (newsR.ok) {
                const rssXml = await newsR.text();
                const newsResults = [];
                const items = rssXml.split('<item>').slice(1);
                for (const item of items.slice(0, 8)) {
                  const titleM = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>|<title>([\s\S]*?)<\/title>/);
                  const linkM = item.match(/<link>([\s\S]*?)<\/link>|<link[^>]*href="([^"]*)"/);
                  const descM = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/);
                  const sourceM = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);
                  const title = (titleM ? (titleM[1] || titleM[2] || '') : '').replace(/<[^>]+>/g, '').trim();
                  let link = linkM ? (linkM[1] || linkM[2] || '') : '';
                  link = link.trim();
                  const desc = (descM ? (descM[1] || descM[2] || '') : '').replace(/<[^>]+>/g, '').trim();
                  const source = sourceM ? sourceM[1].trim() : '';
                  if (title && link) {
                    newsResults.push({
                      title: title,
                      snippet: desc || (source ? source + ' - ' + title : title),
                      link: link
                    });
                  }
                }
                console.log('[web_search] Google News RSS fallback results:', newsResults.length);
                if (newsResults.length > 0) return { results: newsResults, query };
              }
            } catch (e) {
              console.log('[web_search] Google News RSS error:', e.message);
            }

            // Last resort: Wikipedia API
            try {
              const wikiUrl = 'https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
                encodeURIComponent(query) + '&srnamespace=0&srlimit=5&format=json&origin=*';
              const wikiR = await fetch(wikiUrl);
              if (wikiR.ok) {
                const wikiD = await wikiR.json();
                if (wikiD.query && wikiD.query.search && wikiD.query.search.length > 0) {
                  const wikiResults = wikiD.query.search.map(r => ({
                    title: r.title,
                    snippet: (r.snippet || '').replace(/<[^>]+>/g, '').trim(),
                    link: 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(r.title.replace(/ /g, '_'))
                  }));
                  console.log('[web_search] Wikipedia fallback results:', wikiResults.length);
                  if (wikiResults.length > 0) return { results: wikiResults, query };
                }
              }
            } catch (e) {
              console.log('[web_search] Wikipedia error:', e.message);
            }

            return { results: [], message: 'Web search returned no results for: ' + query + '. Please answer based on your training knowledge and note the information may not be fully current.' };
          }

          default: return { error: 'Unknown tool: ' + name };
        }
      } catch (e) { return { error: e.message }; }
    }

    // ===== AI CONVERSATION LOOP (Claude via Vertex AI) =====
    const activeTools = tools.filter(t => {
      if (t.name === 'weather_forecast' || t.name === 'web_search') return true;
      if (t.name.startsWith('gmail_') || t.name.startsWith('calendar_') || t.name.startsWith('google_drive_')) return !!googleToken;
      if (t.name.startsWith('outlook_') || t.name.startsWith('sharepoint_') || t.name.startsWith('teams_')) return !!msToken;
      if (t.name.startsWith('slack_')) return !!slackToken;
      return !!(googleToken || msToken || slackToken);
    });

    // Convert message history to Claude format
    const claudeMessages = messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role === 'model' ? 'assistant' : m.role, content: m.content };
      }
      if (Array.isArray(m.content)) {
        const textParts = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        return { role: m.role === 'model' ? 'assistant' : m.role, content: textParts || JSON.stringify(m.content) };
      }
      return { role: m.role === 'model' ? 'assistant' : m.role, content: String(m.content || '') };
    });

    // Claude tool format (already compatible with input_schema)
    const claudeTools = activeTools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    // Orchestration loop: up to 8 iterations for complex tool chains
    for (let i = 0; i < 8; i++) {
      const reqBody = {
        anthropic_version: 'vertex-2023-10-16',
        max_tokens: 8192,
        messages: claudeMessages,
      };
      if (system) reqBody.system = system;
      if (claudeTools.length > 0) reqBody.tools = claudeTools;

      const data = await callClaude(accessToken, reqBody);

      if (data.error) {
        const errMsg = data.error.message || JSON.stringify(data.error);
        return res.status(200).json({ content: [{ type: 'text', text: errMsg }] });
      }

      const content = data.content || [];
      const toolUses = content.filter(c => c.type === 'tool_use');

      if (toolUses.length > 0 && claudeTools.length > 0) {
        // Add assistant message with tool_use blocks
        claudeMessages.push({ role: 'assistant', content });

        // Execute all tool calls and build tool_result
        const toolResults = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input, googleToken, msToken);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
        }
        claudeMessages.push({ role: 'user', content: toolResults });
      } else {
        // Final response — extract text
        const txt = content.filter(c => c.type === 'text').map(c => c.text).join('');
        return res.status(200).json({ content: [{ type: 'text', text: txt || '' }] });
      }
    }
    return res.status(200).json({ content: [{ type: 'text', text: 'Tool execution limit reached. Please try a simpler request.' }] });

  } catch (e) {
    console.error('Chat handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
