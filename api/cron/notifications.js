import { getBotToken } from "../_lib/telegram-bot.js";
import { supabaseRequest } from "../_lib/supabase.js";
import { sendJson } from "../_lib/auth-utils.js";

function timeInKL() {
  const now = new Date();
  const kl = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  const date = `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, "0")}-${String(kl.getDate()).padStart(2, "0")}`;
  return { hour: kl.getHours(), minute: kl.getMinutes(), date };
}

async function callTelegram(method, payload) {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function sendOne(telegramId, text) {
  return callTelegram("sendMessage", {
    chat_id: telegramId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

const PROGRESS_KEY = "notify_progress";
const SESSION_KEY = "notify_session_id";

async function getProgress() {
  try {
    const rows = await supabaseRequest(`/schedule_items?select=extra&id=eq.${encodeURIComponent(PROGRESS_KEY)}&limit=1`);
    const extra = rows?.[0]?.extra;
    if (extra && typeof extra === "object") return extra;
  } catch {}
  return {};
}

async function getUsersByTier(tier) {
  const rows = await supabaseRequest(
    `/users?notify_tier=eq.${encodeURIComponent(tier)}&status=eq.active&select=telegram_id&limit=500`
  );
  return Array.isArray(rows) ? rows.map((r) => String(r.telegram_id)) : [];
}

async function getTodaySessions(dateStr) {
  const rows = await supabaseRequest(
    `/schedule_items?date=eq.${encodeURIComponent(dateStr)}&audience=not.eq.Mainboard+Only&select=id,title,venue,scheduled_start_time&order=scheduled_start_time.asc`
  );
  return Array.isArray(rows) ? rows : [];
}

function morningTriggerTime(sessions) {
  if (!sessions || sessions.length === 0) return null;
  const firstStart = sessions[0].scheduled_start_time;
  if (!firstStart) return null;
  const [h, m] = firstStart.split(":").map(Number);
  const totalMin = h * 60 + m - 30;
  return { hour: Math.floor(totalMin / 60), minute: totalMin % 60 };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const { hour, minute, date } = timeInKL();
  const sessions = await getTodaySessions(date);

  const mt = morningTriggerTime(sessions);
  console.log(`[notify-check] KL: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}, date: ${date}, sessions: ${sessions.length}, morningTrigger: ${mt ? `${mt.hour}:${mt.minute}` : "none"}, triggers: morning=${!!(mt && hour === mt.hour && minute === mt.minute)}, evening=${hour === 13 && minute === 40}`);

  if (sessions.length === 0) {
    return sendJson(res, 200, { ok: true, message: "No sessions today." });
  }

  let sent = 0;
  const results = [];

  // ── Morning: 30 min before first session (Daily + Session tiers) ──
  if (mt && hour === mt.hour && minute === mt.minute) {
    const s = sessions[0];
    const dailyIds = await getUsersByTier("daily");
    const sessionIds = await getUsersByTier("session");
    const ids = [...new Set([...dailyIds, ...sessionIds])];
    const text = `🌅 <b>Ta'aruf Week Morning!</b>\n\nFirst session today: <b>${html(s.title)}</b>\n📍 ${html(s.venue)}\n🕐 ${s.scheduled_start_time.slice(0, 5)}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
    let morningSent = 0;
    for (const id of ids) {
      try { await sendOne(id, text); morningSent++; } catch {}
    }
    sent += morningSent;
    results.push({ tier: "morning", queued: ids.length, sent: morningSent });
    console.log(`[notify-check] morning sent: ${morningSent}/${ids.length}`);
  }

  // ── Session: 1:40 PM evening reminder ──
  if (hour === 13 && minute === 40) {
    const ids = await getUsersByTier("session");
    const eveningSessions = sessions.filter((s) => {
      const h = parseInt(s.scheduled_start_time?.split(":")[0] || "0");
      return h >= 13;
    });
    const eveningList = eveningSessions.slice(0, 3).map((s) => `• ${s.scheduled_start_time?.slice(0, 5)} — ${html(s.title)} (${html(s.venue)})`).join("\n");
    const text = `🕐 <b>Evening Sessions Reminder</b>\n\nUpcoming today:\n${eveningList || "No evening sessions."}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
    let eveningSent = 0;
    for (const id of ids) {
      try { await sendOne(id, text); eveningSent++; } catch {}
    }
    if (eveningSent > 0) sent += eveningSent;
    results.push({ tier: "session", queued: ids.length, sent: eveningSent });
    console.log(`[notify-check] evening sent: ${eveningSent}/${ids.length}`);
  }

  // ── Live: sessions starting in the next 5–10 minutes ──
  const nowMin = hour * 60 + minute;
  for (const s of sessions) {
    if (!s.scheduled_start_time) continue;
    const [sh, sm] = s.scheduled_start_time.split(":").map(Number);
    const sessionMin = sh * 60 + sm;
    const diff = sessionMin - nowMin;

    if (diff < 5 || diff > 10) continue;

    const prog = await getProgress();
    if (prog[SESSION_KEY] === s.id) continue;

    const ids = await getUsersByTier("live");
    const text = `⏰ <b>Session Starting Soon!</b>\n\n<b>${html(s.title)}</b>\n📍 ${html(s.venue)}\n🕐 Starting in ${diff} min\n\n👉 Open TawePro to check in: t.me/iiumtaweprobot`;

    let batchSent = 0;
    for (const id of ids) {
      try { await sendOne(id, text); batchSent++; } catch {}
    }
    if (batchSent > 0) sent += batchSent;
    results.push({ tier: "live", session: s.title, queued: ids.length, sent: batchSent });
    console.log(`[notify-check] live "${s.title}" sent: ${batchSent}/${ids.length}`);
  }

  return sendJson(res, 200, { ok: true, sent, details: results });
}

function html(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
