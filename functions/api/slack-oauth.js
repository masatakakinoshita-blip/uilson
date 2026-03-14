export default async function handler(req, res) {
  const { code, redirect_uri, diag } = req.query;

  const clientId = process.env.VITE_SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  // Diagnostic mode: show env var status without exposing secrets
  if (diag === "1") {
    return res.status(200).json({
      diag: true,
      clientId_set: !!clientId,
      clientId_prefix: clientId ? clientId.substring(0, 8) + "..." : "NOT SET",
      clientSecret_set: !!clientSecret,
      clientSecret_length: clientSecret ? clientSecret.length : 0,
      clientSecret_prefix: clientSecret ? clientSecret.substring(0, 6) + "..." : "NOT SET",
      redirect_uri_received: redirect_uri || "none",
    });
  }

  if (!code) return res.status(400).json({ error: "code required" });

  if (!clientId || !clientSecret) {
    console.error("[Slack OAuth] Missing env vars:", { clientId: !!clientId, clientSecret: !!clientSecret });
    return res.status(500).json({ error: "Slack OAuth not configured (missing client credentials)" });
  }

  try {
    // Always include redirect_uri if provided (must match authorize request)
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (redirect_uri) {
      params.append("redirect_uri", redirect_uri);
    }

    console.log("[Slack OAuth] Exchanging code (length:", code.length, ") redirect_uri:", redirect_uri || "none");

    let resp = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }).then((r) => r.json());

    console.log("[Slack OAuth] Slack response:", JSON.stringify({
      ok: resp.ok,
      error: resp.error,
      has_authed_user: !!resp.authed_user,
      has_access_token: !!resp.access_token,
      authed_user_keys: resp.authed_user ? Object.keys(resp.authed_user) : [],
    }));

    // If failed with redirect_uri, retry WITHOUT it (in case of mismatch)
    if (!resp.ok && resp.error === "invalid_code" && redirect_uri) {
      console.log("[Slack OAuth] Retrying WITHOUT redirect_uri");
      const params2 = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
      });
      resp = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params2.toString(),
      }).then((r) => r.json());
      console.log("[Slack OAuth] Retry response:", JSON.stringify({
        ok: resp.ok,
        error: resp.error,
      }));
    }

    if (!resp.ok) return res.status(400).json({ error: resp.error });

    // user_scope flow: user token is in authed_user.access_token
    const userToken = resp.authed_user?.access_token || resp.access_token;

    if (!userToken) {
      console.error("[Slack OAuth] No token found. authed_user:", JSON.stringify(resp.authed_user));
      return res.status(400).json({
        error: "no_token",
        message: "Slack returned ok but no access_token found",
        has_authed_user: !!resp.authed_user,
        has_bot_token: !!resp.access_token,
      });
    }

    return res.status(200).json({
      ok: true,
      access_token: userToken,
      team: resp.team,
      scope: resp.authed_user?.scope || resp.scope,
    });
  } catch (e) {
    console.error("[Slack OAuth] Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
