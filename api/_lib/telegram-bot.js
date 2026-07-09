import { supabaseRequest } from "./supabase.js";

export function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !token.trim()) return null;
  return token.trim();
}

export async function sendTelegramMessage(telegramId, text) {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.description || "Telegram API send failed.");
  }
  return payload.result.message_id;
}

export async function getTargetTelegramIds({ targetRole, targetBureau }) {
  let path = "/users?select=telegram_id,bureau&status=eq.active";
  if (targetRole && targetRole !== "all") {
    path += `&role=eq.${encodeURIComponent(targetRole)}`;
  }
  const rows = await supabaseRequest(path);

  const filtered = Array.isArray(rows) ? rows : [];
  if (targetBureau && targetBureau !== "all") {
    return filtered
      .filter((row) => row.bureau === targetBureau)
      .map((row) => String(row.telegram_id));
  }
  return filtered.map((row) => String(row.telegram_id));
}

export async function broadcastToTargets({ targetRole, targetBureau, text, maxRetry = 2 }) {
  const ids = await getTargetTelegramIds({ targetRole, targetBureau });
  const results = { queued: ids.length, sent: 0, failed: 0, failedIds: [] };

  for (const id of ids) {
    let sent = false;
    for (let attempt = 0; attempt <= maxRetry; attempt++) {
      try {
        await sendTelegramMessage(id, text);
        results.sent++;
        sent = true;
        break;
      } catch {
        if (attempt === maxRetry) {
          results.failed++;
          results.failedIds.push(id);
        }
      }
    }
  }

  return results;
}
