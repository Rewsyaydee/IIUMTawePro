import crypto from "node:crypto";

export const BUREAUS = [
  "Catering",
  "PrepTech",
  "Registration",
  "Program Coordinator",
  "Special Task",
  "Discipline",
  "Multimedia",
  "Welfare"
];

export const ROLES = ["student", "committee", "head", "mainboard"];

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function isProductionRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.VITE_APP_MODE === "production";
}

export function parseTelegramInitData(initData = "") {
  const params = new URLSearchParams(initData);
  const userText = params.get("user");
  let user;
  if (userText) {
    try {
      user = JSON.parse(userText);
    } catch {
      user = undefined;
    }
  }
  return { params, user };
}

export function verifyTelegramInitData(initData = "") {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData) {
    return {
      ok: !isProductionRuntime(),
      reason: isProductionRuntime() ? "Missing Telegram initData." : "Stub mode without initData.",
      user: undefined
    };
  }

  if (!botToken) {
    return {
      ok: !isProductionRuntime(),
      reason: isProductionRuntime() ? "Missing TELEGRAM_BOT_TOKEN." : "Stub mode without bot token.",
      user: parseTelegramInitData(initData).user
    };
  }

  const { params, user } = parseTelegramInitData(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "Missing Telegram hash.", user };
  if (!/^[a-f0-9]{64}$/i.test(hash)) return { ok: false, reason: "Invalid Telegram hash format.", user };

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"));

  return { ok, reason: ok ? "Verified." : "Invalid Telegram signature.", user };
}

export function stableUserId(seed) {
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function normaliseCode(value = "") {
  return String(value).trim().toUpperCase();
}

function envCodes(name, fallback = []) {
  const configured = String(process.env[name] || "")
    .split(",")
    .map(normaliseCode)
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return isProductionRuntime() ? [] : fallback.map(normaliseCode).filter(Boolean);
}

export function resolveAccessCode({ code, selectedRole, selectedBureau }) {
  const normalized = normaliseCode(code);
  const staffCodes = envCodes("COMMITTEE_ACCESS_CODES", ["OiAkuNakTaweNi"]);
  const headCodes = envCodes("HEAD_ACCESS_CODES", []);
  const mainboardCodes = envCodes("MAINBOARD_ACCESS_CODES", []);

  if (staffCodes.includes(normalized)) {
    const role = selectedRole === "head" ? "head" : "committee";
    return {
      ok: true,
      role,
      bureau: BUREAUS.includes(selectedBureau) ? selectedBureau : "Catering",
      reusable: true
    };
  }

  if (headCodes.includes(normalized)) {
    return {
      ok: true,
      role: "head",
      bureau: BUREAUS.includes(selectedBureau) ? selectedBureau : "Catering",
      reusable: true
    };
  }

  if (mainboardCodes.includes(normalized)) {
    return { ok: true, role: "mainboard", bureau: undefined, reusable: false };
  }

  return { ok: false, reason: "Invalid or expired access code." };
}

export function userFromTelegram({ telegramUser, role = "student", bureau, displayName }) {
  const telegramId = telegramUser?.id ? String(telegramUser.id) : "guest";
  const name =
    displayName ||
    [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ").trim() ||
    (role === "student" ? "Guest Student" : "Committee User");

  return {
    id: stableUserId(`${telegramId}:${role}:${bureau || "public"}`),
    telegramId,
    name,
    role,
    bureau: role === "student" || role === "mainboard" ? undefined : bureau,
    matricNumber: undefined,
    kulliyyah: undefined
  };
}

export function signSupabaseJwt(user) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: "authenticated",
    exp: now + 60 * 60,
    iat: now,
    sub: user.id,
    app_user_id: user.id,
    app_role: user.role,
    bureau: user.bureau || "",
    telegram_id: user.telegramId,
    name: user.name
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

export function readBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export function verifyAppSessionToken(token) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return { ok: false, reason: "Missing SUPABASE_JWT_SECRET." };
  if (!token) return { ok: false, reason: "Missing app session." };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "Invalid app session format." };

  const [encodedHeader, encodedPayload, signature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "Invalid app session payload." };
  }

  if (header.alg !== "HS256") return { ok: false, reason: "Unsupported app session algorithm." };

  const expected = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return { ok: false, reason: "Invalid app session signature." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    return { ok: false, reason: "App session expired." };
  }

  if (!payload.app_user_id || !payload.app_role) {
    return { ok: false, reason: "App session missing role claims." };
  }

  return { ok: true, claims: payload };
}

export function verifyAppSessionFromRequest(req) {
  return verifyAppSessionToken(readBearerToken(req));
}
