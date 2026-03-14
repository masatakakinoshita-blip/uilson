// Zoom Meetings API proxy - handles meeting CRUD operations
// This proxy is needed because Zoom API doesn't support CORS for browser requests

export default async function handler(req, res) {
  const zoomToken = req.headers["x-zoom-token"] || req.query.token;
  if (!zoomToken) return res.status(401).json({ error: "Zoom token required" });

  const action = req.query.action || req.body?.action;
  const headers = {
    Authorization: `Bearer ${zoomToken}`,
    "Content-Type": "application/json",
  };

  try {
    switch (action) {
      // Get current user info
      case "me": {
        const resp = await fetch("https://api.zoom.us/v2/users/me", { headers });
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        return res.status(200).json(data);
      }

      // List upcoming meetings
      case "list": {
        const type = req.query.type || "upcoming"; // scheduled, live, upcoming
        const resp = await fetch(
          `https://api.zoom.us/v2/users/me/meetings?type=${type}&page_size=50`,
          { headers }
        );
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        return res.status(200).json(data);
      }

      // Get meeting details
      case "get": {
        const meetingId = req.query.meetingId;
        if (!meetingId) return res.status(400).json({ error: "meetingId required" });
        const resp = await fetch(
          `https://api.zoom.us/v2/meetings/${meetingId}`,
          { headers }
        );
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        return res.status(200).json(data);
      }

      // Create a new meeting
      case "create": {
        const body = req.body?.meeting;
        if (!body) return res.status(400).json({ error: "meeting body required" });
        const resp = await fetch("https://api.zoom.us/v2/users/me/meetings", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        return res.status(201).json(data);
      }

      // Update a meeting
      case "update": {
        const meetingId = req.query.meetingId || req.body?.meetingId;
        if (!meetingId) return res.status(400).json({ error: "meetingId required" });
        const body = req.body?.meeting;
        const resp = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        });
        if (resp.status === 204) return res.status(200).json({ ok: true });
        const data = await resp.json();
        return res.status(resp.status).json(data);
      }

      // Delete a meeting
      case "delete": {
        const meetingId = req.query.meetingId || req.body?.meetingId;
        if (!meetingId) return res.status(400).json({ error: "meetingId required" });
        const resp = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
          method: "DELETE",
          headers,
        });
        if (resp.status === 204) return res.status(200).json({ ok: true });
        const data = await resp.json();
        return res.status(resp.status).json(data);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
