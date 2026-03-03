export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    const authRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: "Bearer " + token },
    }).then((r) => r.json());
    if (!authRes.ok) return res.status(400).json({ error: authRes.error });
    const userRes = await fetch("https://slack.com/api/users.info?user=" + authRes.user_id, {
      headers: { Authorization: "Bearer " + token },
    }).then((r) => r.json());
    if (userRes.ok && userRes.user?.profile?.email) {
      return res.status(200).json({ ok: true, email: userRes.user.profile.email });
    }
    return res.status(200).json({ ok: true, email: null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
