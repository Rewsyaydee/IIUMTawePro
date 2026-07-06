import { normaliseCode, sendJson } from "./_lib/auth-utils.js";

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function codeCount(name) {
  return String(process.env[name] || "")
    .split(",")
    .map(normaliseCode)
    .filter(Boolean).length;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const checks = {
    telegramBotToken: present(process.env.TELEGRAM_BOT_TOKEN),
    supabaseUrl: present(process.env.VITE_SUPABASE_URL) || present(process.env.SUPABASE_URL),
    supabaseServerKey: present(process.env.SUPABASE_SERVICE_ROLE_KEY) || present(process.env.SUPABASE_SECRET_KEY),
    supabaseJwksUrl: present(process.env.SUPABASE_JWKS_URL),
    supabaseJwtSecret: present(process.env.SUPABASE_JWT_SECRET),
    committeeAccessCodes: codeCount("COMMITTEE_ACCESS_CODES"),
    headAccessCodes: codeCount("HEAD_ACCESS_CODES"),
    mainboardAccessCodes: codeCount("MAINBOARD_ACCESS_CODES")
  };

  const missing = Object.entries(checks)
    .filter(([, value]) => value === false || value === 0)
    .map(([key]) => key);

  return sendJson(res, 200, {
    ok: missing.length === 0,
    environment: process.env.VERCEL_ENV || process.env.VITE_APP_MODE || "local",
    checks,
    missing,
    timestamp: new Date().toISOString()
  });
}
