import { supabaseRequest } from "../_lib/supabase.js";
import { sendJson } from "../_lib/auth-utils.js";
import { buildEveningRichMessage, buildMorningRichMessage, buildSessionStartingRichMessage, sendRichWithFallback, richButton, richButtonsRow, richHeading, richParagraph } from "../_lib/rich-messages.js";
import { composeBriefing, fetchDaySchedule, fetchUserTasksDue } from "../_lib/briefing.js";
import { getAppBaseUrl } from "../_lib/telegram-bot.js";

// Set to null in production to use real date.
const DEMO_DATE = null;

// ── KL wall-clock time (independent of server timezone) ──
function klNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10)
  };
}

function timeInKL(dateOverride, hourOverride, minuteOverride) {
  const real = klNow();
  return {
    date: dateOverride || DEMO_DATE || real.date,
    hour: hourOverride != null ? hourOverride : real.hour,
    minute: minuteOverride != null ? minuteOverride : real.minute
  };
}

// ── 7-day always-on loop (preview) vs real production programme ──
// The DB schedule now carries the REAL 10-25 Sep programme. During the
// programme window real dates are used as-is; the modulo mapping below only
// applies outside it (previews).
const LOOP_ANCHOR_UTC = Date.UTC(2026, 7, 7);
const TEMPLATE_START_UTC = Date.UTC(2026, 7, 3);
const DAY_MS = 24 * 60 * 60 * 1000;
const PROGRAMME_START = "2026-09-10";
const PROGRAMME_END = "2026-09-25";

function loopVirtualDate(realDateStr) {
  if (String(realDateStr) >= PROGRAMME_START && String(realDateStr) <= PROGRAMME_END) {
    return realDateStr;
  }
  const [y, m, d] = String(realDateStr).split("-").map(Number);
  const real = Date.UTC(y, m - 1, d);
  const days = Math.round((real - LOOP_ANCHOR_UTC) / DAY_MS);
  const index = ((days % 7) + 7) % 7;
  const template = new Date(TEMPLATE_START_UTC + index * DAY_MS);
  return `${template.getUTCFullYear()}-${String(template.getUTCMonth() + 1).padStart(2, "0")}-${String(template.getUTCDate()).padStart(2, "0")}`;
}

// ── DB-backed dedup ──
// notification_sends.send_key is unique. claimSend atomically inserts the key;
// a conflicting insert returns no rows, so only the first caller "wins".
async function claimSend(key) {
  try {
    const rows = await supabaseRequest("/notification_sends?on_conflict=send_key&select=id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: [{ send_key: key, sent_at: new Date().toISOString() }]
    });
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    // If the DB is unreachable, allow the send rather than silently dropping it.
    console.error(`[notify-check] dedup claim failed for "${key}":`, err?.message || err);
    return true;
  }
}

async function recordPing() {
  try {
    await supabaseRequest("/notification_sends?on_conflict=send_key&select=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: [{ send_key: "ping", sent_at: new Date().toISOString() }]
    });
  } catch {}
}

async function getUsersByTier(tier) {
  const rows = await supabaseRequest(
    `/users?notify_tier=eq.${encodeURIComponent(tier)}&status=eq.active&role=eq.student&select=telegram_id&limit=500`
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

function inWindow(nowMin, targetHour, targetMin, span = 15) {
  const target = targetHour * 60 + targetMin;
  return nowMin >= target && nowMin <= target + span;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const testDate = url.searchParams.get("date") || null;
  const testHour = url.searchParams.has("hour") ? parseInt(url.searchParams.get("hour"), 10) : null;
  const testMinute = url.searchParams.has("minute") ? parseInt(url.searchParams.get("minute"), 10) : null;
  const force = url.searchParams.get("force") === "1";
  // Any override means this is a dry-run/test invocation: skip DB dedup so tests can repeat.
  const testMode = Boolean(testDate || testHour != null || testMinute != null);

  const { hour, minute, date } = timeInKL(testDate, testHour, testMinute);
  const nowMin = hour * 60 + minute;
  // Session lookup happens against the loop template; a test date override is
  // used as-is (tests target template dates directly).
  const lookupDate = testDate ? testDate : loopVirtualDate(date);
  const sessions = await getTodaySessions(lookupDate);

  const mt = morningTriggerTime(sessions);
  const morningMatch = !!(mt && inWindow(nowMin, mt.hour, mt.minute));
  const eveningMatch = inWindow(nowMin, 13, 40);
  console.log(`[notify-check] KL: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}, realDate: ${date}, lookupDate: ${lookupDate}, sessions: ${sessions.length}, morningTrigger: ${mt ? `${mt.hour}:${mt.minute}` : "none"}, triggers: morning=${morningMatch}, evening=${eveningMatch}, testMode=${testMode}, force=${force}`);

  if (sessions.length === 0) {
    return sendJson(res, 200, { ok: true, message: "No sessions today." });
  }

  let sent = 0;
  const results = [];

  // ── Morning: 30 min before first session ±15 min window (Daily + Session tiers) ──
  if (mt && morningMatch) {
    const morningKey = `morning:${date}`;
    const claimed = testMode || force || await claimSend(morningKey);
    if (claimed) {
      const s = sessions[0];
      const dailyIds = await getUsersByTier("daily");
      const sessionIds = await getUsersByTier("session");
      const ids = [...new Set([...dailyIds, ...sessionIds])];
      const fallbackText = `🌅 <b>Ta'aruf Week Morning!</b>\n\nFirst session today: <b>${html(s.title)}</b>\n📍 ${html(s.venue)}\n🕐 ${s.scheduled_start_time.slice(0, 5)}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
      const richMessage = buildMorningRichMessage({ title: s.title, venue: s.venue, time: s.scheduled_start_time.slice(0, 5) });
      let morningSent = 0;
      for (const id of ids) {
        try {
          const outcome = await sendRichWithFallback(id, { richMessage, fallbackText });
          if (outcome.used !== "none") morningSent++;
        } catch {}
      }
      sent += morningSent;
      results.push({ tier: "morning", queued: ids.length, sent: morningSent });
      console.log(`[notify-check] morning sent: ${morningSent}/${ids.length} (key ${morningKey})`);
    } else {
      console.log(`[notify-check] morning already sent today (${morningKey})`);
    }
  }

  // ── Session: 1:40 PM ±15 min window ──
  if (eveningMatch) {
    const eveningKey = `evening:${date}`;
    const claimed = testMode || force || await claimSend(eveningKey);
    if (claimed) {
      const ids = await getUsersByTier("session");
      const eveningSessions = sessions.filter((s) => {
        const h = parseInt(s.scheduled_start_time?.split(":")[0] || "0");
        return h >= 13;
      });
      const eveningList = eveningSessions.slice(0, 3).map((s) => `• ${s.scheduled_start_time?.slice(0, 5)} — ${html(s.title)} (${html(s.venue)})`).join("\n");
      const fallbackText = `🕐 <b>Evening Sessions Reminder</b>\n\nUpcoming today:\n${eveningList || "No evening sessions."}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
      const richMessage = buildEveningRichMessage({
        lines: eveningSessions.slice(0, 3).map((s) => `• ${s.scheduled_start_time?.slice(0, 5)} — ${s.title} (${s.venue})`)
      });
      let eveningSent = 0;
      for (const id of ids) {
        try {
          const outcome = await sendRichWithFallback(id, { richMessage, fallbackText });
          if (outcome.used !== "none") eveningSent++;
        } catch {}
      }
      sent += eveningSent;
      results.push({ tier: "session", queued: ids.length, sent: eveningSent });
      console.log(`[notify-check] evening sent: ${eveningSent}/${ids.length} (key ${eveningKey})`);
    } else {
      console.log(`[notify-check] evening already sent today (${eveningKey})`);
    }
  }

  // ── Live: sessions starting in 5–15 min ──
  for (const s of sessions) {
    if (!s.scheduled_start_time) continue;
    const [sh, sm] = s.scheduled_start_time.split(":").map(Number);
    const sessionMin = sh * 60 + sm;
    const diff = sessionMin - nowMin;

    if (diff < 5 || diff > 15) continue;

    const liveKey = `live:${date}:${s.scheduled_start_time}`;
    const claimed = testMode || force || await claimSend(liveKey);
    if (!claimed) {
      console.log(`[notify-check] live "${s.title}" already sent (${liveKey})`);
      continue;
    }

    const ids = await getUsersByTier("live");
    const fallbackText = `⏰ <b>Session Starting Soon!</b>\n\n<b>${html(s.title)}</b>\n📍 ${html(s.venue)}\n🕐 Starting in ${diff} min\n\n👉 Open TawePro to check in: t.me/iiumtaweprobot`;
    const richMessage = buildSessionStartingRichMessage({
      sessionName: s.title,
      location: s.venue,
      timeRemaining: `Starting in ${diff} min`
    });

    let batchSent = 0;
    for (const id of ids) {
      try {
        const outcome = await sendRichWithFallback(id, { richMessage, fallbackText });
        if (outcome.used !== "none") batchSent++;
      } catch {}
    }
    if (batchSent > 0) sent += batchSent;
    results.push({ tier: "live", session: s.title, queued: ids.length, sent: batchSent });
    console.log(`[notify-check] live "${s.title}" sent: ${batchSent}/${ids.length} (key ${liveKey})`);
  }

  // ── Committee morning briefing: daily at 07:00 KL (30 min window so the
  //    07:00 Vercel daily cron and any pinger hit in 07:00-07:30 both land) ──
  // Targeted single-user test override: &briefing_for=<telegram_id> forces the
  // briefing for that one user (bypasses dedup + window, like testMode).
  const briefingFor = url.searchParams.get("briefing_for") || null;
  const briefingMatch = inWindow(nowMin, 7, 0, 30) || Boolean(briefingFor);
  if (briefingMatch) {
    const briefingDate = testDate || date;
    if (briefingFor) {
      const target = await supabaseRequest(`/users?telegram_id=eq.${encodeURIComponent(briefingFor)}&status=eq.active&select=id,telegram_id,name,role,committee_prefs&limit=1`);
      const targetUser = Array.isArray(target) ? target[0] : undefined;
      if (targetUser && targetUser.role && targetUser.role !== "student") {
        try {
          const dayEvents = await fetchDaySchedule(briefingDate);
          const tasks = await fetchUserTasksDue(briefingDate, targetUser);
          const composed = composeBriefing({ user: targetUser, dateIso: briefingDate, dayEvents, tasks });
          if (composed) {
            const outcome = await sendRichWithFallback(String(targetUser.telegram_id), composed);
            results.push({ tier: "briefing", target: briefingFor, sent: outcome.used !== "none" ? 1 : 0 });
            console.log(`[notify-check] briefing test sent to ${briefingFor}: ${outcome.used}`);
          } else {
            results.push({ tier: "briefing", target: briefingFor, sent: 0, skipped: "nothing today" });
          }
        } catch (err) {
          console.error("[notify-check] briefing test failed", err?.message || err);
        }
      }
    } else if (!testMode) {
      // Production: 07:00-07:15 daily, one per user, deduped per day.
      let committeeUsers = [];
      try {
        const rows = await supabaseRequest("/users?role=in.(committee,head,mainboard)&status=eq.active&select=telegram_id,id,name,committee_prefs&limit=2000");
        committeeUsers = Array.isArray(rows) ? rows : [];
      } catch {
        try {
          // Pre-migration fallback: committee_prefs column not present yet.
          const rows = await supabaseRequest("/users?role=in.(committee,head,mainboard)&status=eq.active&select=telegram_id,id,name&limit=2000");
          committeeUsers = (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, committee_prefs: {} }));
        } catch { committeeUsers = []; }
      }
      let briefingSent = 0;
      let briefingSkipped = 0;
      for (const member of committeeUsers) {
        const prefs = member.committee_prefs && typeof member.committee_prefs === "object" ? member.committee_prefs : {};
        if (prefs.briefing === "off") continue;
        const claimed = await claimSend(`briefing:${member.id}:${briefingDate}`);
        if (!claimed) continue;
        try {
          const dayEvents = await fetchDaySchedule(briefingDate);
          const tasks = await fetchUserTasksDue(briefingDate, member);
          const composed = composeBriefing({ user: member, dateIso: briefingDate, dayEvents, tasks });
          if (!composed) { briefingSkipped++; continue; }
          const outcome = await sendRichWithFallback(String(member.telegram_id), composed);
          if (outcome.used !== "none") briefingSent++;
        } catch (err) {
          console.error(`[notify-check] briefing failed for ${member.id}`, err?.message || err);
        }
      }
      if (briefingSent > 0 || briefingSkipped > 0) {
        sent += briefingSent;
        results.push({ tier: "briefing", queued: committeeUsers.length, sent: briefingSent, skipped: briefingSkipped });
        console.log(`[notify-check] briefing sent: ${briefingSent}/${committeeUsers.length} (key briefing:${briefingDate})`);
      }
    }
  }

  // ── Masterplan reminders: ping assignees shortly before a task is due ──
  if (!testMode || testDate) {
    try {
      const taskRows = await supabaseRequest(`/poa_tasks?due_date=eq.${encodeURIComponent(date)}&status=neq.done&select=id,bureau,title,due_time,notify_minutes_before,assigned_to,assigned_to_ids&limit=100`);
      const tasks = Array.isArray(taskRows) ? taskRows : [];
      for (const task of tasks) {
        if (!task.due_time || !task.notify_minutes_before) continue;
        const [th, tm] = String(task.due_time).split(":").map(Number);
        if (!Number.isFinite(th)) continue;
        const dueMin = th * 60 + (Number.isFinite(tm) ? tm : 0);
        const target = dueMin - (Number(task.notify_minutes_before) || 20);
        if (!inWindow(nowMin, Math.floor(target / 60), target % 60, 10)) continue;

        const assigneeIds = (Array.isArray(task.assigned_to_ids) ? task.assigned_to_ids : []).map(String).filter(Boolean);
        if (assigneeIds.length === 0) continue;
        let assignees = [];
        try {
          const rows = await supabaseRequest(`/users?status=eq.active&id=in.(${assigneeIds.join(",")})&select=id,telegram_id,committee_prefs&limit=50`);
          assignees = Array.isArray(rows) ? rows : [];
        } catch {
          try {
            const rows = await supabaseRequest(`/users?status=eq.active&id=in.(${assigneeIds.join(",")})&select=id,telegram_id&limit=50`);
            assignees = (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, committee_prefs: {} }));
          } catch { assignees = []; }
        }
        for (const assignee of assignees) {
          if (!assignee.telegram_id) continue;
          const prefs = assignee.committee_prefs && typeof assignee.committee_prefs === "object" ? assignee.committee_prefs : {};
          if (prefs.masterplan === "off") continue;
          const claimed = await claimSend(`masterplan:${task.id}:${assignee.id}`);
          if (!claimed) continue;
          const appUrl = getAppBaseUrl();
          const richMessage = {
            blocks: [
              richHeading("⏰ Task due soon"),
              richParagraph([{ type: "bold", text: task.title }]),
              richParagraph(`🏢 ${task.bureau} · ⏰ ${String(task.due_time).slice(0, 5)}`),
              richParagraph("Full details in /tasks."),
              richButtonsRow([richButton({ text: "📋 Open Task", webApp: `${appUrl}/tasks` })])
            ]
          };
          const fallbackText = `⏰ <b>Task due soon</b>\n\n<b>${String(task.title).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</b>\n🏢 ${task.bureau} · ⏰ ${String(task.due_time).slice(0, 5)}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
          const outcome = await sendRichWithFallback(String(assignee.telegram_id), { richMessage, fallbackText });
          if (outcome.used !== "none") {
            sent++;
            console.log(`[notify-check] masterplan ping sent (${task.id} -> ${assignee.id})`);
          }
        }
      }
    } catch (err) {
      console.error("[notify-check] masterplan scan failed", err?.message || err);
    }
  }

  // Heartbeat row so operators can verify server-driven pings are landing.
  await recordPing();

  return sendJson(res, 200, {
    ok: true,
    sent,
    details: results,
    debug: {
      klTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      date,
      lookupDate,
      sessionsFound: sessions.length,
      morningTriggerTime: mt ? `${mt.hour}:${mt.minute}` : null,
      morningMatch,
      eveningMatch,
      testMode,
      force,
      usersDaily: results.find((r) => r.tier === "morning")?.queued || 0,
      usersSession: results.find((r) => r.tier === "session")?.queued || 0,
      usersLive: results.filter((r) => r.tier === "live").reduce((sum, r) => sum + r.queued, 0)
    }
  });
}

function html(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
