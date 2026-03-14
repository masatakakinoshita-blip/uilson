export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    const authRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: "Bearer " + token },
    }).then((r) => r.json());
    if (!authRes.ok) return res.status(400).json({ error: authRes.error });
    // Try to get email via users.info (works with user tokens + users:read.email scope)
    let email = null;
    if (authRes.user_id) {
      try {
        const userRes = await fetch("https://slack.com/api/users.info?user=" + authRes.user_id, {
          headers: { Authorization: "Bearer " + token },
        }).then((r) => r.json());
        if (userRes.ok && userRes.user?.profile?.email) {
          email = userRes.user.profile.email;
        }
      } catch {}
    }
    return res.status(200).json({
      ok: true,
      email: email,
      user: authRes.user || null,
      team: authRes.team || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
