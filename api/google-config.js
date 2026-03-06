// Returns the Google OAuth client ID from runtime environment
// This bypasses Vite's build-time env var caching issue
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.json({
    clientId: process.env.VITE_GOOGLE_CLIENT_ID || "",
  });
}
