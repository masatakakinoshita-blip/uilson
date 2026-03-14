export default async function handler(req, res) {
  const { code, redirect_uri } = req.query;
  if (!code) return res.status(400).json({ error: "code required" });

  const clientId = process.env.VITE_ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Zoom OAuth not configured" });
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirect_uri || process.env.APP_BASE_URL || "https://uilson-489209.web.app",
    });

    const resp = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    }).then((r) => r.json());

    if (resp.error) {
      return res.status(400).json({ error: resp.reason || resp.error });
    }

    return res.status(200).json({
      ok: true,
      access_token: resp.access_token,
      refresh_token: resp.refresh_token,
      expires_in: resp.expires_in,
      scope: resp.scope,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
