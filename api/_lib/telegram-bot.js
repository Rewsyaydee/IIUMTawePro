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

  // Process in concurrent batches to respect Telegram rate limits (~30 msg/sec)
  // while staying within Vercel's 10s timeout (Hobby) or 60s (Pro)
  const BATCH_SIZE = 25;
  const BATCH_DELAY_MS = 1000; // 1s between batches
  const CONCURRENCY = 8;       // Send 8 messages concurrently per batch

  async function sendWithRetry(id, attempt = 0) {
    try {
      await sendTelegramMessage(id, text);
      return { success: true, id };
    } catch (err) {
      if (attempt < maxRetry) {
        await new Promise(r => setTimeout(r, 200));
        return sendWithRetry(id, attempt + 1);
      }
      return { success: false, id };
    }
  }

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);

    // Send concurrently within the batch
    const concurrentBatches = [];
    for (let j = 0; j < batch.length; j += CONCURRENCY) {
      concurrentBatches.push(batch.slice(j, j + CONCURRENCY));
    }

    for (const subBatch of concurrentBatches) {
      const promises = subBatch.map(id => sendWithRetry(id));
      const outcomes = await Promise.all(promises);

      for (const outcome of outcomes) {
        if (outcome.success) {
          results.sent++;
        } else {
          results.failed++;
          results.failedIds.push(outcome.id);
        }
      }
    }

    // Wait between batches to respect rate limit
    if (i + BATCH_SIZE < ids.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}
