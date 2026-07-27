import { normaliseCode, sendJson } from "./_lib/auth-utils.js";
import { getSupabaseServerConfig, supabaseRequest } from "./_lib/supabase.js";

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function codeCount(name) {
  return String(process.env[name] || "")
    .split(",")
    .map(normaliseCode)
    .filter(Boolean).length;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  // Check if caller has the health secret for full response
  const healthSecret = process.env.HEALTH_SECRET;
  const authorized = !healthSecret || req.headers["x-health-secret"] === healthSecret;

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

  // Unauthorized callers get minimal response only
  if (!authorized) {
    return sendJson(res, 200, {
      ok: missing.length === 0,
      timestamp: new Date().toISOString()
    });
  }

  // Database connectivity check
  let dbStatus = "untested";
  let dbLatencyMs = null;
  let userCount = null;
  try {
    const start = Date.now();
    const rows = await supabaseRequest("/users?select=id&limit=1");
    dbLatencyMs = Date.now() - start;
    dbStatus = "connected";

    // Count active users (lightweight)
    const countRows = await supabaseRequest("/users?select=id&status=eq.active&limit=1&head=true");
    userCount = countRows?.[0]?.count || "unknown";
  } catch (e) {
    dbStatus = "error: " + (e.message || "unknown");
  }

  return sendJson(res, 200, {
    ok: missing.length === 0,
    environment: process.env.VERCEL_ENV || process.env.VITE_APP_MODE || "local",
    checks,
    missing,
    db: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      activeUsers: userCount,
    },
    vercel: {
      region: process.env.VERCEL_REGION || "unknown",
      functionName: "health",
    },
    timestamp: new Date().toISOString()
  });
}
