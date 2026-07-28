import { readJson, sendJson } from "./_lib/auth-utils.js";
import { getBotToken } from "./_lib/telegram-bot.js";

async function callTelegram(method, payload) {
  const token = getBotToken();
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
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const { imageUrl, userId, caption } = await readJson(req);

    if (!imageUrl || !userId) {
      return sendJson(res, 400, { error: "imageUrl and userId are required." });
    }

    if (typeof userId !== "number" || userId <= 0) {
      return sendJson(res, 400, { error: "userId must be a positive number." });
    }

    const result = await callTelegram("savePreparedInlineMessage", {
      user_id: userId,
      result: {
        type: "photo",
        id: `tawe_${Date.now()}`,
        photo_url: imageUrl,
        thumb_url: imageUrl,
        caption: caption || "#TaweAuTaraweh",
        parse_mode: "HTML"
      },
      allow_user_chats: true,
      allow_bot_chats: false,
      allow_group_chats: true,
      allow_channel_chats: true
    });

    const messageId = result?.result?.id;
    if (!messageId) {
      return sendJson(res, 500, { error: "Failed to prepare inline message." });
    }

    return sendJson(res, 200, { messageId });
  } catch (err) {
    console.error("prepare-share error:", err?.message || err);
    return sendJson(res, 500, { error: err?.message || "Internal server error." });
  }
}
