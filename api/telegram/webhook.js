import { readJson, sendJson } from "../_lib/auth-utils.js";

function html(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function appBaseUrl() {
  if (process.env.TELEGRAM_WEB_APP_URL) return process.env.TELEGRAM_WEB_APP_URL.replace(/\/$/, "");
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://iium-tawe-pro.vercel.app";
}

function supportUrl() {
  return process.env.WELLBEING_SUPPORT_URL || `${appBaseUrl()}/wellbeing`;
}

function commaSet(name) {
  return new Set(
    String(process.env[name] || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function resolveAccess(from) {
  const committeeIds = commaSet("COMMITTEE_TELEGRAM_IDS");
  const bureauById = Object.fromEntries(
    String(process.env.COMMITTEE_BUREAU_BY_TELEGRAM_ID || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [id, bureau] = item.split(":");
        return [id?.trim(), bureau?.trim()];
      })
      .filter(([id, bureau]) => id && bureau)
  );

  const telegramId = from?.id ? String(from.id) : "";
  if (telegramId && committeeIds.has(telegramId)) {
    return { role: "committee", bureau: bureauById[telegramId] || process.env.DEFAULT_COMMITTEE_BUREAU || "" };
  }

  return { role: "student", bureau: "" };
}

function startText(from) {
  const firstName = from?.first_name || "there";
  const telegramId = from?.id ? String(from.id) : "unknown";
  const username = from?.username ? `• <b>Username:</b> @${html(from.username)}` : null;
  const access = resolveAccess(from);
  const bureau = access.bureau ? `• <b>Bureau:</b> ${html(access.bureau)}` : null;

  return [
    `✨ <b>TawePro One-Stop Centre</b> — welcome, ${html(firstName)}!`,
    "",
    "Your ultimate hub for event coordination.",
    "",
    "👤 <b>Account Details</b>",
    `• <b>ID:</b> <code>${html(telegramId)}</code>`,
    username,
    `• <b>Name:</b> ${html(firstName)}`,
    "",
    "🏷 <b>Access Level</b>",
    `• <b>Role:</b> ${html(access.role)}`,
    bureau,
    "",
    "Pick an option below to begin."
  ]
    .filter((line) => line !== null)
    .join("\n");
}

async function callTelegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} failed.`);
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, { ok: true, endpoint: "telegram-webhook" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret && req.headers?.["x-telegram-bot-api-secret-token"] !== webhookSecret) {
    return sendJson(res, 401, { error: "Invalid webhook secret." });
  }

  const update = await readJson(req);
  const message = update.message;
  const text = message?.text || "";
  const chatId = message?.chat?.id;

  if (!chatId || !text.startsWith("/start")) {
    return sendJson(res, 200, { ok: true, ignored: true });
  }

  const base = appBaseUrl();
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: startText(message.from),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧭 Open Dashboard", web_app: { url: base } }],
        [{ text: "Wellbeing Support", url: supportUrl() }],
        [{ text: "Quick Schedule PDF", web_app: { url: `${base}/official-schedule` } }]
      ]
    }
  });

  return sendJson(res, 200, { ok: true, handled: "start" });
}
