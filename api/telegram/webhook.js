import { readJson, sendJson, resolveAccessCode } from "../_lib/auth-utils.js";
import { createAuditLog, getUserRecordByTelegramId, supabaseRequest } from "../_lib/supabase.js";
import {
  richBlockquote,
  richButton,
  richButtonsRow,
  richDetails,
  richFooter,
  richHeading,
  richList,
  richParagraph,
  richPre,
  richTable,
  sendRichWithFallback
} from "../_lib/rich-messages.js";

function html(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function appBaseUrl() {
  if (process.env.TELEGRAM_WEB_APP_URL) return process.env.TELEGRAM_WEB_APP_URL.replace(/\/$/, "");
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://iium-tawe-pro.vercel.app";
}

function escapeName(name) {
  return html(name || "there");
}

function roleLabel(role, bureau) {
  if (role === "student") return "Student";
  if (role === "mainboard") return "Mainboard";
  if (role === "head" && bureau) return `Head of ${bureau}`;
  if (role === "committee" && bureau) return `Committee of ${bureau}`;
  return role || "Student";
}

const BUREAUS = ["Catering", "PrepTech", "Registration", "Program Coordinator", "Special Task", "Discipline", "Multimedia", "Welfare"];

// ── Legacy inline keyboards (kept as automatic fallback if sendRichMessage fails) ──

function bureauKeyboard() {
  const rows = [];
  for (let i = 0; i < BUREAUS.length; i += 2) {
    rows.push(BUREAUS.slice(i, i + 2).map((b) => ({ text: b, callback_data: `pick_bureau:${b}` })));
  }
  return { inline_keyboard: rows };
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

const kulliyyahs = ["KICT", "KOE", "KENMS", "KOED", "AIKOL", "KAED", "AHAS KIRKHS"];

const maleMahallahs = ["Uthman", "Faruq", "Siddiq", "Bilal", "Ali", "Zubair"];
const femaleMahallahs = ["Safiyyah", "Aminah", "Asiah", "Asma", "Hafsah", "Halimah", "Maryam", "Nusaibah", "Sumayyah", "Ruqayyah", "Salahuddin"];

function kulliyyahKeyboard() {
  const rows = [];
  for (let i = 0; i < kulliyyahs.length; i += 2) {
    rows.push(kulliyyahs.slice(i, i + 2).map((k) => ({ text: k, callback_data: `pick_kulliyyah:${k}` })));
  }
  return { inline_keyboard: rows };
}

function mahallahKeyboard() {
  const all = [...maleMahallahs, ...femaleMahallahs];
  const rows = [];
  for (let i = 0; i < all.length; i += 3) {
    rows.push(all.slice(i, i + 3).map((m) => ({ text: m, callback_data: `pick_mahallah:${m}` })));
  }
  return { inline_keyboard: rows };
}

function changeKeyboard(role) {
  if (role && role !== "student") {
    return {
      inline_keyboard: [
        [{ text: "🧭 Open Dashboard", web_app: { url: appBaseUrl() } }],
        [{ text: "📅 View Schedule", web_app: { url: `${appBaseUrl()}/official-schedule` } }],
        [{ text: "🤲 Wellbeing Support", web_app: { url: `${appBaseUrl()}/wellbeing` } }]
      ]
    };
  }
  return {
    inline_keyboard: [
      [{ text: "✏️ Change Matric", callback_data: "change_matric" }],
      [{ text: "🏛️ Change Kulliyyah", callback_data: "change_kulliyyah" }],
      [{ text: "🏠 Change Mahallah", callback_data: "change_mahallah" }],
      [{ text: "🔓 Unlock Committee Access", callback_data: "unlock_prompt" }],
      [{ text: "🧭 Open Dashboard", web_app: { url: appBaseUrl() } }],
      [{ text: "📅 View Schedule", web_app: { url: `${appBaseUrl()}/official-schedule` } }]
    ]
  };
}

function dashboardKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🧭 Open Dashboard", web_app: { url: appBaseUrl() } }],
      [{ text: "📅 View Schedule", web_app: { url: `${appBaseUrl()}/official-schedule` } }],
      [{ text: "🤲 Wellbeing Support", web_app: { url: `${appBaseUrl()}/wellbeing` } }]
    ]
  };
}

function notifyKeyboard(currentTier) {
  const tiers = [
    { value: "daily",   label: "🌅 Daily — One notification every morning" },
    { value: "session", label: "🕘 Session — Morning + 1:40 PM reminders" },
    { value: "live",    label: "🔔 Live — Every programme as it begins" },
    { value: "off",     label: "🔕 Off — No notifications" }
  ];
  const rows = tiers.map((t) => [{
    text: `${t.value === currentTier ? "✅ " : ""}${t.label}`,
    callback_data: `set_notify:${t.value}`
  }]);
  return { inline_keyboard: rows };
}

// ── /review flow ──

function reviewNameKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🧑 Use My Telegram Name", callback_data: "review_name:use" }],
      [{ text: "🙈 Submit Anonymously", callback_data: "review_name:anon" }],
      [{ text: "❌ Cancel", callback_data: "review_cancel" }]
    ]
  };
}

function reviewStarsKeyboard() {
  const rows = [1, 2, 3, 4, 5].map((n) => [
    { text: `${"⭐".repeat(n)} ${n}`, callback_data: `review_rating:${n}` }
  ]);
  rows.push([{ text: "⏭️ Skip rating", callback_data: "review_rating:skip" }]);
  return { inline_keyboard: rows };
}

// ── Rich message send helper ──
// Sends the rich message; on total failure (rich + legacy fallback both failed)
// it throws so callers keep today's error-handling semantics.
async function richSend(chatId, blocks, { fallbackText, fallbackReplyMarkup } = {}) {
  const outcome = await sendRichWithFallback(chatId, { richMessage: { blocks }, fallbackText, fallbackReplyMarkup });
  if (outcome.used === "none") throw new Error("Rich message and legacy fallback both failed.");
  return outcome;
}

// ── Shared rich button rows ──

function studentChangeRows() {
  return [
    richButtonsRow([
      richButton({ text: "✏️ Change Matric", callbackData: "change_matric" }),
      richButton({ text: "🏛️ Change Kulliyyah", callbackData: "change_kulliyyah" }),
      richButton({ text: "🏠 Change Mahallah", callbackData: "change_mahallah" })
    ]),
    richButtonsRow([richButton({ text: "🔓 Unlock Committee Access", callbackData: "unlock_prompt", style: "link" })]),
    richButtonsRow([
      richButton({ text: "🧭 Open Dashboard", webApp: appBaseUrl() }),
      richButton({ text: "📅 View Schedule", webApp: `${appBaseUrl()}/official-schedule` })
    ])
  ];
}

function adminAppRows() {
  return [
    richButtonsRow([richButton({ text: "🧭 Open Dashboard", webApp: appBaseUrl() })]),
    richButtonsRow([
      richButton({ text: "📅 View Schedule", webApp: `${appBaseUrl()}/official-schedule` }),
      richButton({ text: "🤲 Wellbeing Support", webApp: `${appBaseUrl()}/wellbeing` })
    ])
  ];
}

function changeRowsForRole(role) {
  return role && role !== "student" ? adminAppRows() : studentChangeRows();
}

function profileTable(userRecord, rLabel, attendance, totalRequired) {
  return richTable([
    [{ text: "🎭 Role", is_header: true }, { text: rLabel }],
    [{ text: "📝 Matric", is_header: true }, { text: html(userRecord?.matric_number || "") }],
    [{ text: "🏛️ Kulliyyah", is_header: true }, { text: html(userRecord?.kulliyyah || "") }],
    [{ text: "🏠 Mahallah", is_header: true }, { text: html(userRecord?.mahallah || "") }],
    [{ text: "📊 Attendance", is_header: true }, { text: `${attendance}/${totalRequired} sessions complete` }]
  ]);
}

// Number of attendance-required programme sessions (10 in the real 2026 week).
async function countRequiredSessions() {
  try {
    const rows = await supabaseRequest("/schedule_items?is_attendance_required=eq.true&select=block_group,block&limit=50");
    const seen = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row.block_group && row.block) seen.add(`${row.block_group}|${row.block}`);
    }
    return seen.size || 10;
  } catch {
    return 10;
  }
}

function kulliyyahPickerBlocks(heading, subline) {
  const blocks = [];
  if (heading) blocks.push(richHeading(heading));
  if (subline) blocks.push(richParagraph(subline));
  for (let i = 0; i < kulliyyahs.length; i += 3) {
    blocks.push(richButtonsRow(kulliyyahs.slice(i, i + 3).map((k) => richButton({ text: k, callbackData: `pick_kulliyyah:${k}` }))));
  }
  return blocks;
}

function mahallahPickerBlocks(heading, subline) {
  const blocks = [];
  if (heading) blocks.push(richHeading(heading));
  if (subline) blocks.push(richParagraph(subline));
  const rowsFor = (list) => {
    const rows = [];
    for (let i = 0; i < list.length; i += 3) rows.push(list.slice(i, i + 3));
    return rows;
  };
  blocks.push(richHeading("Male Mahallahs", 4));
  rowsFor(maleMahallahs).forEach((row) => blocks.push(richButtonsRow(row.map((m) => richButton({ text: m, callbackData: `pick_mahallah:${m}` })))));
  blocks.push(richHeading("Female Mahallahs", 4));
  rowsFor(femaleMahallahs).forEach((row) => blocks.push(richButtonsRow(row.map((m) => richButton({ text: m, callbackData: `pick_mahallah:${m}` })))));
  return blocks;
}

function bureauPickerBlocks() {
  const blocks = [];
  for (let i = 0; i < BUREAUS.length; i += 2) {
    blocks.push(richButtonsRow(BUREAUS.slice(i, i + 2).map((b) => richButton({ text: b, callbackData: `pick_bureau:${b}` }))));
  }
  return blocks;
}

// ── Review session helpers ──

async function getReviewSession(telegramId) {
  const rows = await supabaseRequest(
    `/review_sessions?telegram_id=eq.${encodeURIComponent(telegramId)}&select=telegram_id,display_name,content&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : undefined;
}

async function upsertReviewSession(telegramId, fields) {
  await supabaseRequest("/review_sessions?on_conflict=telegram_id&select=telegram_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: [{ telegram_id: telegramId, updated_at: new Date().toISOString(), ...fields }]
  });
}

async function updateReviewSession(telegramId, fields) {
  await supabaseRequest(`/review_sessions?telegram_id=eq.${encodeURIComponent(telegramId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: { updated_at: new Date().toISOString(), ...fields }
  });
}

async function deleteReviewSession(telegramId) {
  await supabaseRequest(`/review_sessions?telegram_id=eq.${encodeURIComponent(telegramId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}

async function handleReviewStart(chatId, userRecord) {
  const name = escapeName(userRecord?.name || "");
  const fallbackText = `⭐ <b>Rate your Ta'aruf Week experience!</b>\n\nHow would you like your name displayed?`;
  await richSend(chatId, [
    richHeading("⭐ Rate your Ta'aruf Week experience!"),
    richParagraph("How would you like your name displayed?"),
    richButtonsRow([
      richButton({ text: "🧑 Use My Name", callbackData: "review_name:use", style: "primary" }),
      richButton({ text: "🙈 Anonymously", callbackData: "review_name:anon" }),
      richButton({ text: "❌ Cancel", callbackData: "review_cancel", style: "link" })
    ])
  ], { fallbackText, fallbackReplyMarkup: reviewNameKeyboard() });
}

async function handleReviewText(chatId, session, text) {
  const content = String(text || "").trim().slice(0, 1500);
  if (!content) {
    await richSend(chatId, [
      richHeading("Hmm, that was empty! 😅"),
      richParagraph("Send your review text — what did you love, and what could be better?")
    ], { fallbackText: "That message was empty. Send your review text:" });
    return;
  }
  await updateReviewSession(session.telegram_id, { content });
  const fallbackText = "Got it! How many stars would you give your Ta'aruf Week experience? ⭐";
  await richSend(chatId, [
    richHeading("Got it! 🙏"),
    richParagraph("How many stars would you give your Ta'aruf Week experience?"),
    richButtonsRow([1, 2, 3, 4, 5].map((n) => richButton({ text: `⭐${n}`, callbackData: `review_rating:${n}` }))),
    richButtonsRow([richButton({ text: "⏭️ Skip rating", callbackData: "review_rating:skip", style: "link" })])
  ], { fallbackText, fallbackReplyMarkup: reviewStarsKeyboard() });
}

async function completeReview(chatId, session, rating) {
  const content = String(session.content || "").trim().slice(0, 1500);
  const rows = await supabaseRequest("/reviews?select=id,display_name,content,rating,is_approved,created_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [{
      display_name: session.display_name || "Anonymous",
      content,
      rating: rating || null,
      is_approved: false
    }]
  });
  const review = Array.isArray(rows) ? rows[0] : undefined;
  await deleteReviewSession(session.telegram_id);
  if (!review) {
    await richSend(chatId, [
      richHeading("😓 Something went wrong"),
      richParagraph("Your review couldn't be saved. Please try again with /review.")
    ], { fallbackText: "😓 Sorry, something went wrong saving your review. Please try again with /review." });
    return;
  }

  const stars = review.rating ? `${"⭐".repeat(review.rating)} (${review.rating}/5)` : "None";
  const blocks = [
    richHeading("✅ Review received!"),
    ...(stars !== "None" ? [richParagraph(`🏅 ${stars}`)] : []),
    richBlockquote(review.content),
    richFooter("Thank you for your feedback! 🙏")
  ];
  const fallbackText = `✅ <b>Review received!</b>\n\n${stars !== "None" ? `🏅 ${stars}\n` : ""}${html(review.content)}\n\nThank you for your feedback!`;
  await richSend(chatId, blocks, { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });

  // Step D: admin moderation alert (isolated — must never fail the user's flow)
  const adminId = process.env.REVIEW_ADMIN_TELEGRAM_ID;
  if (!adminId) {
    console.error("[review] REVIEW_ADMIN_TELEGRAM_ID is not configured — admin alert skipped.");
    return;
  }
  try {
    const adminFallback = `⭐ <b>New Review</b>\n\n👤 ${html(review.display_name)}\n🏅 ${stars}\n\n📝 ${html(review.content)}\n\nTap below to moderate:`;
    await richSend(adminId, [
      richHeading("⭐ New Review"),
      richParagraph(`👤 ${html(review.display_name)}`),
      ...(stars !== "None" ? [richParagraph(`🏅 ${stars}`)] : []),
      richBlockquote(review.content),
      richButtonsRow([
        richButton({ text: "✅ Approve", callbackData: `review_approve:${review.id}`, style: "success" }),
        richButton({ text: "❌ Reject", callbackData: `review_reject:${review.id}`, style: "danger" })
      ])
    ], {
      fallbackText: adminFallback,
      fallbackReplyMarkup: {
        inline_keyboard: [
          [{ text: "✅ Approve", callback_data: `review_approve:${review.id}` }],
          [{ text: "❌ Reject", callback_data: `review_reject:${review.id}` }]
        ]
      }
    });
  } catch (err) {
    console.error("[review] admin alert failed", err?.message || err);
  }
}

function committeePrefs(record) {
  const raw = record?.committee_prefs;
  const prefs = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    briefing: prefs.briefing === "off" ? "off" : "on",
    masterplan: prefs.masterplan === "off" ? "off" : "on"
  };
}

// Committee settings main menu: Session Notifications vs Masterplan Reminders.
async function sendCommitteeMenuMain(chatId, userRecord) {
  const prefs = committeePrefs(userRecord);
  const fallbackText = `🔔 <b>Committee Notification Settings</b>\n\nWhat would you like to manage?\n\n• <b>Session Notifications</b> — daily morning briefing (${prefs.briefing === "on" ? "ON" : "OFF"})\n• <b>Masterplan Reminders</b> — alerts before your assigned tasks are due (${prefs.masterplan === "on" ? "ON" : "OFF"})`;
  const fallbackReplyMarkup = {
    inline_keyboard: [
      [{ text: "📅 Session Notifications", callback_data: "notify_menu:session" }],
      [{ text: "📋 Masterplan Reminders", callback_data: "notify_menu:masterplan" }]
    ]
  };
  await richSend(chatId, [
    richHeading("🔔 Committee Notification Settings"),
    richParagraph("Committees get a calm setup — no per-session spam. Pick what to manage:"),
    richParagraph(`📅 Session Notifications — ${prefs.briefing === "on" ? "🌅 Morning briefing ON" : "Morning briefing OFF"}`),
    richParagraph(`📋 Masterplan Reminders — ${prefs.masterplan === "on" ? "🔔 ON" : "OFF"}`),
    richButtonsRow([
      richButton({ text: "📅 Session Notifications", callbackData: "notify_menu:session", style: "primary" }),
      richButton({ text: "📋 Masterplan Reminders", callbackData: "notify_menu:masterplan" })
    ])
  ], { fallbackText, fallbackReplyMarkup });
}

async function sendCommitteeCategoryMenu(chatId, userRecord, category) {
  const prefs = committeePrefs(userRecord);
  const isSession = category === "session";
  const stateOn = isSession ? prefs.briefing === "on" : prefs.masterplan === "on";
  const onData = isSession ? "set_briefing:on" : "set_masterplan:on";
  const offData = isSession ? "set_briefing:off" : "set_masterplan:off";

  if (isSession) {
    const fallbackText = `📅 <b>Session Notifications</b>\n\nCurrent: <b>Daily morning briefing ${stateOn ? "ON" : "OFF"}</b>\n\nOne short summary every morning at 07:00 with the day's sessions and your tasks. No per-session spam.`;
    const fallbackReplyMarkup = {
      inline_keyboard: [
        [{ text: `${stateOn ? "✅ " : ""}🌅 Daily Morning Briefing — ON`, callback_data: onData }],
        [{ text: `${!stateOn ? "✅ " : ""}🔕 OFF`, callback_data: offData }],
        [{ text: "← Back", callback_data: "notify_menu:main" }]
      ]
    };
    await richSend(chatId, [
      richHeading("📅 Session Notifications"),
      richParagraph(`Current: Daily morning briefing ${stateOn ? "ON" : "OFF"}`),
      richParagraph("One short summary every morning at 07:00 with the day's sessions and your tasks. No per-session spam."),
      richButtonsRow([richButton({ text: `${stateOn ? "✅ " : ""}🌅 Daily Morning Briefing`, callbackData: onData, style: "success" })]),
      richButtonsRow([richButton({ text: "🔕 Turn OFF", callbackData: offData, style: stateOn ? "link" : undefined })]),
      richButtonsRow([richButton({ text: "← Back", callbackData: "notify_menu:main", style: "link" })])
    ], { fallbackText, fallbackReplyMarkup });
    return;
  }

  const fallbackText = `📋 <b>Masterplan Reminders</b>\n\nCurrent: <b>${stateOn ? "ON" : "OFF"}</b>\n\nA quick Telegram ping before each task assigned to you is due (lead time set per task). Full details stay in TawePro /tasks.`;
  const fallbackReplyMarkup = {
    inline_keyboard: [
      [{ text: `${stateOn ? "✅ " : ""}🔔 Remind me before tasks are due`, callback_data: onData }],
      [{ text: `${!stateOn ? "✅ " : ""}🔕 OFF`, callback_data: offData }],
      [{ text: "← Back", callback_data: "notify_menu:main" }]
    ]
  };
  await richSend(chatId, [
    richHeading("📋 Masterplan Reminders"),
    richParagraph(`Current: ${stateOn ? "ON" : "OFF"}`),
    richParagraph("A quick Telegram ping before each task assigned to you is due. Lead time is set per task — full details stay in /tasks."),
    richButtonsRow([richButton({ text: "🔔 Remind me before tasks are due", callbackData: onData, style: "success" })]),
    richButtonsRow([richButton({ text: "🔕 Turn OFF", callbackData: offData, style: stateOn ? "link" : undefined })]),
    richButtonsRow([richButton({ text: "← Back", callbackData: "notify_menu:main", style: "link" })])
  ], { fallbackText, fallbackReplyMarkup });
}

async function handleNotifications(chatId, userRecord) {
  // Committee / head / mainboard get the committee settings menu.
  if (userRecord?.role && userRecord.role !== "student") {
    await sendCommitteeMenuMain(chatId, userRecord);
    return;
  }
  const current = userRecord?.notify_tier || "off";
  const tierNames = { daily: "Daily", session: "Session", live: "Live", off: "Off" };
  const tiers = [
    { value: "daily", label: "🌅 Daily — 30 min before the first session each morning" },
    { value: "session", label: "🕘 Session — Morning + 1:40 PM reminder" },
    { value: "live", label: "🔔 Live — 5–10 min before every session starts" },
    { value: "off", label: "🔕 Off — No notifications" }
  ];
  const fallbackText = `🔔 <b>Notification Settings</b>\n\nCurrent: <b>${tierNames[current] || "Off"}</b>\n\nChoose when you want to receive session reminders:\n\n• <b>Daily</b> — 30 min before the first session each morning\n• <b>Session</b> — Morning + 1:40 PM reminder\n• <b>Live</b> — 5–10 min before every session starts\n• <b>Off</b> — No notifications\n\nTap a tier below to update: 👇`;
  await richSend(chatId, [
    richHeading("🔔 Notification Settings"),
    richParagraph(`Current: ${tierNames[current] || "Off"}`),
    richList(tiers.map((t) => ({
      blocks: [richParagraph(t.label)],
      hasCheckbox: true,
      isChecked: t.value === current
    }))),
    richParagraph("Tap a tier below to update: 👇"),
    ...tiers.map((t) => richButtonsRow([richButton({ text: t.label, callbackData: `set_notify:${t.value}` })]))
  ], { fallbackText, fallbackReplyMarkup: notifyKeyboard(current) });
}

async function upsertUser(telegramId, firstName, lastName, username) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Guest Student";
  const rows = await supabaseRequest("/users?on_conflict=telegram_id&select=id,telegram_id,name,role,bureau,matric_number,kulliyyah,registration_step", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: [{
      telegram_id: telegramId,
      name,
      telegram_username: username || null,
      role: "student",
      status: "active",
      updated_at: new Date().toISOString()
    }]
  });
  return Array.isArray(rows) ? rows[0] : undefined;
}

async function updateUserRegistration(telegramId, fields) {
  const updates = { ...fields, updated_at: new Date().toISOString() };
  await supabaseRequest(`/users?telegram_id=eq.${encodeURIComponent(telegramId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: updates
  });
}

async function getAttendanceCount(userId) {
  try {
    const rows = await supabaseRequest(`/student_attendance?user_id=eq.${encodeURIComponent(userId)}&status=in.(present,excused)&select=id`);
    return Array.isArray(rows) ? rows.length : 0;
  } catch { return 0; }
}

async function sendStart(chatId, userRecord) {
  const name = escapeName(userRecord?.name || "");
  const step = userRecord?.registration_step || null;
  const matric = userRecord?.matric_number || "";
    const kulliyyah = userRecord?.kulliyyah || "";
    const mahallah = userRecord?.mahallah || "";
    const role = userRecord?.role || "student";
  const bureau = userRecord?.bureau || "";
  const rLabel = roleLabel(role, bureau);

  // New user — no record at all
  if (!userRecord) {
    const fallbackText = `✨ <b>Salam, ${html(name)}!</b> 👋\n\nWe're so glad you're here — welcome to the <b>Ta'aruf Week</b> family! 🕌\n\nThis bot is your companion for the entire Ta'aruf Week. I'll help you register, track attendance, and stay updated throughout the programme.\n\nLet's start with your <b>matric number</b> — just type it below, e.g. 2212345 ✍️\n\nJoin our community below! 👇\nhttps://t.me/taweprohelp`;
    await richSend(chatId, [
      richHeading(`✨ Salam, ${name}! 👋`),
      richParagraph("We're so glad you're here — welcome to the Ta'aruf Week family! 🕌"),
      richParagraph("This bot is your companion for the entire Ta'aruf Week. Register, track attendance, and stay updated throughout the programme."),
      richDetails("What can this bot do? 🤖", [
        richParagraph("📝 Register your matric, kulliyyah, and mahallah"),
        richParagraph("📍 Navigate venues and find walking routes"),
        richParagraph("📊 Track your attendance toward the Ta'aruf Kit"),
        richParagraph("🔔 Get reminders before every session")
      ]),
      richParagraph("Let's start with your matric number — just type it below, e.g. 2212345 ✍️"),
      richButtonsRow([richButton({ text: "📢 Join our community", url: "https://t.me/taweprohelp" })])
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  // Registered — show welcome back
  if (!step) {
    const [attendance, totalRequired] = await Promise.all([getAttendanceCount(userRecord.id), countRequiredSessions()]);
    const fallbackLines = [
      `✨ <b>Great to see you again, ${html(name)}!</b> 🌙`,
      "",
      `📋 <b>Your Ta'aruf Week Profile:</b>`,
      `   🎭 Role:         <b>${html(rLabel)}</b>`,
      `   📝 Matric:       <code>${html(matric)}</code>`,
      `   🏛️ Kulliyyah:    <b>${html(kulliyyah)}</b>`,
      `   🏠 Mahallah:     <b>${html(mahallah)}</b>`,
      `   📊 Attendance:   <b>${attendance}/${totalRequired}</b> sessions complete`,
      ""
    ];
    if (role === "student") {
      fallbackLines.push("Need to update your details or unlock committee access? 👇");
    } else {
      fallbackLines.push("Need to update anything? Tap below 👇");
    }

    const blocks = [
      richHeading(`✨ Great to see you again, ${name}! 🌙`),
      richParagraph("Your Ta'aruf Week profile:"),
      profileTable(userRecord, rLabel, attendance, totalRequired),
      richParagraph(role === "student" ? "Need to update your details or unlock committee access? 👇" : "Need to update anything? Tap below 👇"),
      ...(role === "student" ? studentChangeRows() : adminAppRows())
    ];

    await richSend(chatId, blocks, { fallbackText: fallbackLines.join("\n"), fallbackReplyMarkup: changeKeyboard(role) });
    return;
  }

  // Mid-registration — resume flow
  if (step === "matric" || step === "change_matric") {
    const fallbackText = `👋 <b>Hey ${html(name)}, let's pick up where we left off!</b>\n\nWhat's your <b>matric number</b>? Just type it below, e.g. 2212345 ✍️`;
    await richSend(chatId, [
      richHeading(`👋 Hey ${name}, let's pick up where we left off!`),
      richParagraph("What's your matric number? Just type it below, e.g. 2212345 ✍️")
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  if (step === "kulliyyah" || step === "change_kulliyyah") {
    const fallbackText = `👋 <b>Hey ${html(name)}, we're almost there!</b>\n\nWhich <b>kulliyyah</b> are you from? Pick one below — this is where your Ihsan Madani sessions will be held: 🏛️`;
    await richSend(chatId, kulliyyahPickerBlocks(`Hey ${name}, we're almost there! 👋`, "Which kulliyyah are you from? This is where your Ihsan Madani sessions will be held: 🏛️"), {
      fallbackText,
      fallbackReplyMarkup: kulliyyahKeyboard()
    });
    return;
  }

  if (step === "mahallah" || step === "change_mahallah") {
    const fallbackText = `🏠 <b>Pick your Mahallah, ${html(name)}!</b>\n\nWhich hostel do you belong to?`;
    await richSend(chatId, mahallahPickerBlocks(`Pick your Mahallah, ${name}! 🏠`, "Which hostel do you belong to?"), {
      fallbackText,
      fallbackReplyMarkup: mahallahKeyboard()
    });
    return;
  }
}

async function handleUnlock(chatId, userRecord, codeText) {
  const name = escapeName(userRecord?.name || "");
  const code = codeText.trim();

  if (!code) {
    const fallbackText = `🔓 <b>Unlock Committee Access</b>\n\nSend your access code like this:\n<code>/unlock YOUR_CODE_HERE</code>\n\nCommittee members can switch back to the student view anytime with:\n<code>/unlock student</code>\n\nIf you don't have a code yet, please contact the Mainboard team.`;
    await richSend(chatId, [
      richHeading("🔓 Unlock Committee Access"),
      richParagraph("Send your access code like this:"),
      richPre("/unlock YOUR_CODE_HERE"),
      richParagraph("Committee members can switch back to the student view anytime with:"),
      richPre("/unlock student"),
      richParagraph("If you don't have a code yet, please contact the Mainboard team.")
    ], { fallbackText });
    return;
  }

  // ── /unlock student: non-students return to the student view ──
  if (/^student$/i.test(code)) {
    if (!userRecord || userRecord.role === "student") {
      await richSend(chatId, [
        richHeading("You're already in student view 🎓"),
        richParagraph("Type /start to see your student profile.")
      ], { fallbackText: "You're already in student view. Type /start to see your profile." });
      return;
    }
    try {
      await updateUserRegistration(userRecord.telegram_id, { registration_step: "student_downgrade" });
    } catch (err) {
      console.error("student_downgrade step failed:", err?.message || err);
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph("Please try again or contact the Mainboard team.")
      ], { fallbackText: "😓 Sorry, something went wrong. Please try again." });
      return;
    }
    const fallbackText = `🎓 <b>Switch back to Student view, ${html(name)}?</b>\n\nYour profile (matric, kulliyyah, mahallah) will be kept. You'll stop receiving committee notifications.`;
    const fallbackReplyMarkup = {
      inline_keyboard: [
        [{ text: "✅ Yes, switch to Student", callback_data: "student_downgrade:yes" }],
        [{ text: "❌ Cancel", callback_data: "student_downgrade:cancel" }]
      ]
    };
    await richSend(chatId, [
      richHeading(`🎓 Switch back to Student view, ${name}?`),
      richParagraph("Your profile (matric, kulliyyah, mahallah) will be kept. You'll stop receiving committee notifications."),
      richButtonsRow([richButton({ text: "✅ Yes, switch to Student", callbackData: "student_downgrade:yes", style: "danger" })]),
      richButtonsRow([richButton({ text: "❌ Cancel", callbackData: "student_downgrade:cancel", style: "link" })])
    ], { fallbackText, fallbackReplyMarkup });
    return;
  }

  const invite = resolveAccessCode({ code, selectedRole: "committee", selectedBureau: "Catering" });

  if (!invite.ok) {
    const fallbackText = `Hmm, that code doesn't look right 😅\n\nPlease double-check your access code and try again with:\n<code>/unlock YOUR_CODE_HERE</code>`;
    await richSend(chatId, [
      richHeading("Hmm, that code doesn't look right 😅"),
      richParagraph("Please double-check your access code and try again with:"),
      richPre("/unlock YOUR_CODE_HERE")
    ], { fallbackText });
    return;
  }

  // Mainboard — no bureau needed
  if (invite.role === "mainboard") {
    try {
      await updateUserRegistration(userRecord.telegram_id, {
        role: "mainboard",
        bureau: null,
        registration_step: null
      });
      const fallbackText = `🎉 <b>Access unlocked, ${html(name)}!</b>\n\n🎭 You are now <b>Mainboard</b>.\n\nYou now have full access to the control room, broadcast tools, and operations dashboard.\n\nTap below to open your workspace 👇`;
      await richSend(chatId, [
        richHeading(`🎉 Access unlocked, ${name}!`),
        richParagraph("🎭 You are now Mainboard."),
        richList([
          { blocks: [richParagraph("🛠️ Full access to the Control Room")] },
          { blocks: [richParagraph("📣 Broadcast tools")] },
          { blocks: [richParagraph("📊 Operations dashboard")] }
        ]),
        richParagraph("Tap below to open your workspace 👇"),
        ...adminAppRows()
      ], { fallbackText, fallbackReplyMarkup: dashboardKeyboard() });
    } catch (err) {
      console.error("Unlock mainboard failed:", err?.message || err);
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph(`Sorry ${name}, something went wrong updating your account. Please try again or contact the Mainboard team.`)
      ], { fallbackText: `😓 Sorry ${html(name)}, something went wrong updating your account. Please try again or contact the Mainboard team.` });
    }
    return;
  }

  // Committee or Head — need to ask for bureau
  try {
    await updateUserRegistration(userRecord.telegram_id, {
      role: invite.role,
      registration_step: `unlock_bureau:${invite.role}`
    });
  } catch (err) {
    console.error("Unlock committee/head DB update failed:", err?.message || err);
    await richSend(chatId, [
      richHeading("😓 Something went wrong"),
      richParagraph(`Sorry ${name}, something went wrong updating your account. Please try again or contact the Mainboard team.`)
    ], { fallbackText: `😓 Sorry ${html(name)}, something went wrong updating your account. Please try again or contact the Mainboard team.` });
    return;
  }

  const roleText = invite.role === "head" ? "Head of Bureau" : "Committee Member";
  const fallbackText = `🎉 <b>Code verified, ${html(name)}!</b>\n\nYou're unlocking access as a <b>${html(roleText)}</b>.\n\nNow, which <b>bureau</b> do you belong to? Pick one below: 🏛️`;
  await richSend(chatId, [
    richHeading(`🎉 Code verified, ${name}!`),
    richParagraph(`You're unlocking access as ${roleText}.`),
    richParagraph("Now, which bureau do you belong to? Pick one below: 🏛️"),
    ...bureauPickerBlocks()
  ], { fallbackText, fallbackReplyMarkup: bureauKeyboard() });
}

async function handleMatricInput(chatId, userRecord, text) {
  const step = userRecord?.registration_step || "";
  const name = escapeName(userRecord?.name || "");

  if (!step || !["matric", "change_matric"].includes(step)) {
    const fallbackText = `Hmm, I didn't quite catch that! 😅\n\nType <b>/start</b> to see your profile, or <b>/unlock</b> to unlock committee access.`;
    await richSend(chatId, [
      richHeading("Hmm, I didn't quite catch that! 😅"),
      richParagraph("Type /start to see your profile, or /unlock to unlock committee access.")
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  const matric = text.trim();
  if (!/^\d{5,10}$/.test(matric)) {
    const fallbackText = `Hmm, that doesn't look like a valid matric number! 😅\n\nPlease enter a valid matric number, e.g. 2212345 ✍️`;
    await richSend(chatId, [
      richHeading("Hmm, that doesn't look like a valid matric number! 😅"),
      richParagraph("Please enter a valid matric number, e.g. 2212345 ✍️")
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  await updateUserRegistration(userRecord.telegram_id, {
    matric_number: matric,
    registration_step: step === "change_matric" ? null : "kulliyyah"
  });

  if (step === "change_matric") {
    const old = userRecord.matric_number || "unknown";
    const fallbackText = `✅ <b>All updated, ${html(name)}!</b> ✨\n\n📝 Matric:       <code>${html(old)}</code> → <code>${html(matric)}</code>\n\nEverything looks good! Anything else you'd like to change?`;
    await richSend(chatId, [
      richHeading(`✅ All updated, ${name}! ✨`),
      richParagraph([{ type: "code", text: old }, " → ", { type: "code", text: matric }]),
      richParagraph("Everything looks good! Anything else you'd like to change?"),
      ...changeRowsForRole(userRecord.role)
    ], { fallbackText, fallbackReplyMarkup: changeKeyboard(userRecord.role) });
    return;
  }

  // New registration — ask for kulliyyah
  const fallbackText = `Perfect, ${html(name)}! Your matric is <code>${html(matric)}</code> 📝\n\nNow, which <b>kulliyyah</b> are you from? Pick one below — this is where your Ihsan Madani sessions will be held: 🏛️`;
  await richSend(chatId, kulliyyahPickerBlocks("Perfect! Your matric is registered 📝", `Which kulliyyah are you from? This is where your Ihsan Madani sessions will be held: 🏛️`), {
    fallbackText,
    fallbackReplyMarkup: kulliyyahKeyboard()
  });
}

async function handleCallback(chatId, userRecord, data, fromId) {
  const name = escapeName(userRecord?.name || "");
  // Single source of truth for Telegram identity: the update's from.id.
  const telegramId = fromId || userRecord?.telegram_id || "";

  // ── Baiah takeover remote (mainboard only) ──
  if (data.startsWith("baiah:")) {
    if (userRecord?.role !== "mainboard") {
      await richSend(chatId, [
        richHeading("⛔ Mainboard only"),
        richParagraph("The Baiah takeover remote is limited to the mainboard role.")
      ], { fallbackText: "⛔ The Baiah takeover remote is limited to the mainboard role." });
      return;
    }
    try {
      if (data === "baiah:on" || data === "baiah:off") {
        await setBaiahActive(userRecord, data === "baiah:on");
      }
      await sendBaiahMenu(chatId, userRecord);
    } catch (err) {
      console.error("[baiah] remote action failed", err?.message || err);
      await richSend(chatId, [
        richHeading("⚠️ Action failed"),
        richParagraph("Could not update the Baiah takeover. Try /baiah again.")
      ], { fallbackText: "⚠️ Failed to update the Baiah takeover. Try /baiah again." }).catch(() => {});
    }
    return;
  }

  // ── /review flow ──
  if (data === "review_name:use" || data === "review_name:anon") {
    const displayName = data === "review_name:anon" ? "Anonymous" : userRecord?.name || "Anonymous";
    await upsertReviewSession(telegramId, { display_name: displayName, content: null });
    const fallbackText = `📝 <b>Tell us about your Ta'aruf Week!</b>\n\nSend your review text below — what did you love, and what could be better?`;
    await richSend(chatId, [
      richHeading("📝 Tell us about your Ta'aruf Week!"),
      richParagraph("Send your review text below — what did you love, and what could be better?")
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  if (data === "review_cancel") {
    await deleteReviewSession(telegramId);
    await richSend(chatId, [
      richHeading("Review cancelled"),
      richParagraph("You can start again anytime with /review")
    ], { fallbackText: "Review cancelled. You can start again anytime with /review" });
    return;
  }

  if (data.startsWith("review_rating:")) {
    try {
      const session = await getReviewSession(telegramId);
      if (!session) {
        await richSend(chatId, [
          richHeading("No active review found"),
          richParagraph("Start one with /review")
        ], { fallbackText: "No active review found. Start one with /review" });
        return;
      }
      const value = data.split(":")[1];
      const rating = value === "skip" ? null : parseInt(value, 10);
      await completeReview(chatId, session, rating);
    } catch (err) {
      console.error("[review] rating step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph("Please try again with /review.")
      ], { fallbackText: "😓 Something went wrong saving your review. Please try again with /review." }).catch(() => {});
    }
    return;
  }

  if (data.startsWith("review_approve:") || data.startsWith("review_reject:")) {
    const adminId = process.env.REVIEW_ADMIN_TELEGRAM_ID;
    if (!adminId || String(fromId) !== String(adminId)) {
      await richSend(chatId, [
        richHeading("⛔ Not authorized"),
        richParagraph("You're not authorized to moderate reviews.")
      ], { fallbackText: "⛔ You're not authorized to moderate reviews." });
      return;
    }
    try {
      const reviewId = data.split(":")[1];
      if (data.startsWith("review_approve:")) {
        await supabaseRequest(`/reviews?id=eq.${encodeURIComponent(reviewId)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { is_approved: true }
        });
        await richSend(chatId, [
          richHeading("✅ Review approved"),
          richParagraph("The review is now public on the landing page.")
        ], { fallbackText: "✅ Review approved." });
      } else {
        await richSend(chatId, [
          richHeading("❌ Review rejected"),
          richParagraph("The review was kept unapproved.")
        ], { fallbackText: "❌ Review rejected (kept unapproved)." });
      }
    } catch (err) {
      console.error("[review] moderation step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph("Please try again.")
      ], { fallbackText: "😓 Something went wrong. Please try again." }).catch(() => {});
    }
    return;
  }

  // ── /unlock student confirmation (only while step = student_downgrade) ──
  if (data.startsWith("student_downgrade:") && userRecord?.registration_step === "student_downgrade" && userRecord?.role && userRecord.role !== "student") {
    const choice = data.split(":")[1];
    if (choice === "cancel") {
      await updateUserRegistration(userRecord.telegram_id, { registration_step: null });
      const rLabel = roleLabel(userRecord.role, userRecord.bureau);
      const fallbackText = `No problem, ${html(name)}! You're staying as <b>${html(rLabel)}</b>.`;
      await richSend(chatId, [
        richHeading(`No problem, ${name}!`),
        richParagraph(`You're staying as ${rLabel}.`),
        ...changeRowsForRole(userRecord.role)
      ], { fallbackText, fallbackReplyMarkup: changeKeyboard(userRecord.role) });
      return;
    }
    if (choice === "yes") {
      try {
        await updateUserRegistration(userRecord.telegram_id, {
          role: "student",
          bureau: null,
          registration_step: null,
          committee_prefs: { briefing: "off", masterplan: "off" }
        });
      } catch (err) {
        console.error("student downgrade failed:", err?.message || err);
        await richSend(chatId, [
          richHeading("😓 Something went wrong"),
          richParagraph("Please try again or contact the Mainboard team.")
        ], { fallbackText: "😓 Sorry, something went wrong. Please try again." });
        return;
      }
      const fallbackText = `🎓 <b>Done, ${html(name)}!</b> You're back in <b>Student view</b>.\n\nYour matric, kulliyyah and mahallah are unchanged. Committee notifications are now off.`;
      await richSend(chatId, [
        richHeading(`🎓 Done, ${name}! You're back in Student view.`),
        richParagraph("Your matric, kulliyyah and mahallah are unchanged. Committee notifications are now off."),
        ...studentChangeRows()
      ], { fallbackText, fallbackReplyMarkup: changeKeyboard("student") });
      return;
    }
    return;
  }

  // Bureau selected (from /unlock flow)
  if (data.startsWith("pick_bureau:")) {
    const b = data.split(":")[1];
    if (!BUREAUS.includes(b)) return;

    const step = userRecord?.registration_step || "";
    let unlockRole;
    if (step.startsWith("unlock_bureau:")) {
      unlockRole = step.split(":")[1];
    } else {
      unlockRole = userRecord?.role || "";
      if (unlockRole !== "committee" && unlockRole !== "head") return;
    }

    try {
      await updateUserRegistration(userRecord.telegram_id, {
        bureau: b,
        role: unlockRole,
        registration_step: null
      });
    } catch (err) {
      console.error("Bureau update failed:", err?.message || err);
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph(`Sorry ${name}, something went wrong saving your bureau. Please try again or contact the Mainboard team.`)
      ], { fallbackText: `😓 Sorry ${html(name)}, something went wrong saving your bureau. Please try again or contact the Mainboard team.` });
      return;
    }

    const rLabel = roleLabel(unlockRole, b);
    const fallbackText = `🎉 <b>Access unlocked, ${html(name)}!</b>\n\n🎭 You are now <b>${html(rLabel)}</b>.\n\nYou now have access to your bureau's tasks, operations, and attendance tools.\n\nTap below to open your workspace 👇`;
    await richSend(chatId, [
      richHeading(`🎉 Access unlocked, ${name}!`),
      richParagraph(`🎭 You are now ${rLabel}.`),
      richList([
        { blocks: [richParagraph("✅ Your bureau's tasks")] },
        { blocks: [richParagraph("🛠️ Bureau operations tools")] },
        { blocks: [richParagraph("📊 Attendance tools")] }
      ]),
      richParagraph("Tap below to open your workspace 👇"),
      ...adminAppRows()
    ], { fallbackText, fallbackReplyMarkup: dashboardKeyboard() });
    return;
  }

  // Unlock prompt
  if (data === "unlock_prompt") {
    const fallbackText = `🔓 <b>Unlock Committee Access</b>\n\nIf you have an access code, send it like this:\n<code>/unlock YOUR_CODE_HERE</code>\n\nDon't have a code? Please contact the Mainboard team.`;
    await richSend(chatId, [
      richHeading("🔓 Unlock Committee Access"),
      richParagraph("If you have an access code, send it like this:"),
      richPre("/unlock YOUR_CODE_HERE"),
      richParagraph("Don't have a code? Please contact the Mainboard team.")
    ], { fallbackText });
    return;
  }

  // Kulliyyah selected (from registration or change)
  if (data.startsWith("pick_kulliyyah:")) {
    const k = data.split(":")[1];
    if (!kulliyyahs.includes(k)) return;

    const step = userRecord?.registration_step || "";
    const isChange = step === "change_kulliyyah";

    await updateUserRegistration(userRecord.telegram_id, {
      kulliyyah: k,
      registration_step: isChange ? null : "mahallah"
    });

    if (isChange) {
      const old = userRecord.kulliyyah || "";
      const fallbackText = `✅ <b>Updated, ${html(name)}!</b> 🏛️\n\nKulliyyah:   <b>${html(old)}</b> → <b>${html(k)}</b>\n\nRemember — your Ihsan Madani sessions will now be at <b>${html(k)}</b>. Plan your route! 🗺️`;
      await richSend(chatId, [
        richHeading(`✅ Updated, ${name}! 🏛️`),
        richParagraph([{ type: "code", text: old }, " → ", { type: "code", text: k }]),
        richParagraph(`Remember — your Ihsan Madani sessions will now be at ${k}. Plan your route! 🗺️`),
        ...changeRowsForRole(userRecord.role)
      ], { fallbackText, fallbackReplyMarkup: changeKeyboard(userRecord.role) });
    } else {
      // New registration: straight to the mahallah picker (zone step removed).
      const fallbackText = `✅ <b>Got it, ${html(name)}!</b> Kulliyyah: <b>${html(k)}</b> 🏛️\n\nLast step — which <b>hostel (mahallah)</b> do you stay at?`;
      await richSend(chatId, mahallahPickerBlocks(`Got it, ${name}! Kulliyyah: ${k} 🏛️`, "Last step — which hostel (mahallah) do you stay at?"), {
        fallbackText,
        fallbackReplyMarkup: mahallahKeyboard()
      });
    }
    return;
  }

  // Change matric
  if (data === "change_matric") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_matric" });
    const fallbackText = `No worries, ${html(name)}! Mistakes happen. ✍️\n\nYour current matric: <code>${html(userRecord.matric_number || "unknown")}</code>\n\nWhat's your new matric number? Just type it below:`;
    await richSend(chatId, [
      richHeading(`No worries, ${name}! Mistakes happen. ✍️`),
      richParagraph("Your current matric:"),
      richPre(userRecord.matric_number || "unknown"),
      richParagraph("What's your new matric number? Just type it below:")
    ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
    return;
  }

  // Change kulliyyah
  if (data === "change_kulliyyah") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_kulliyyah" });
    const fallbackText = `Switching kulliyyah? No problem, ${html(name)}! 🏛️\n\nYour current: <b>${html(userRecord.kulliyyah || "unknown")}</b>\n\nPick your new kulliyyah below:`;
    await richSend(chatId, kulliyyahPickerBlocks(`Switching kulliyyah? No problem, ${name}! 🏛️`, `Your current: ${userRecord.kulliyyah || "unknown"}\nPick your new kulliyyah below:`), {
      fallbackText,
      fallbackReplyMarkup: kulliyyahKeyboard()
    });
    return;
  }

  // Mahallah selected
  if (data.startsWith("pick_mahallah:")) {
    const m = data.split(":")[1];
    const all = [...maleMahallahs, ...femaleMahallahs];
    if (!all.includes(m)) return;
    const step = userRecord?.registration_step || "";
    // Only an explicit change flow gets the "updated" confirmation; fresh
    // registration (step === "mahallah") completes with the full welcome.
    const isChange = step === "change_mahallah";
    await updateUserRegistration(userRecord.telegram_id, {
      mahallah: m,
      registration_step: null
    });
    if (isChange) {
      const old = userRecord.mahallah || "unknown";
      const fallbackText = `✅ <b>Updated, ${html(name)}!</b> 🏠\n\nMahallah:   <b>${html(old)}</b> → <b>${html(m)}</b>`;
      await richSend(chatId, [
        richHeading(`✅ Updated, ${name}! 🏠`),
        richParagraph([{ type: "code", text: old }, " → ", { type: "code", text: m }]),
        ...changeRowsForRole(userRecord.role)
      ], { fallbackText, fallbackReplyMarkup: changeKeyboard(userRecord.role) });
    } else {
      const totalRequired = await countRequiredSessions();
      const fallbackText = `✅ <b>You're all set, ${html(name)}!</b> 🎉\n\n📋 <b>Your Details:</b>\n   🎭 Role:         <b>Student</b>\n   📝 Matric:       <code>${html(userRecord.matric_number || "")}</code>\n   🏛️ Kulliyyah:    <b>${html(userRecord.kulliyyah || "")}</b>\n   🏠 Mahallah:     <b>${html(m)}</b>\n\nYou're now ready to experience Ta'aruf Week like never before. Track your attendance, navigate venues, and stay updated — all in one place!\n\nTap below to dive in 👇`;
      await richSend(chatId, [
        richHeading(`✅ You're all set, ${name}! 🎉`),
        richParagraph("Your details:"),
        profileTable({ ...userRecord, mahallah: m }, "Student", 0, totalRequired),
        richParagraph("You're now ready to experience Ta'aruf Week like never before. Track your attendance, navigate venues, and stay updated — all in one place!"),
        richParagraph("Tap below to dive in 👇"),
        ...adminAppRows()
      ], { fallbackText, fallbackReplyMarkup: dashboardKeyboard() });
    }
    return;
  }

  // Change mahallah
  if (data === "change_mahallah") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_mahallah" });
    const fallbackText = `Switching mahallah, ${html(name)}? No problem! 🏠\n\nYour current: <b>${html(userRecord.mahallah || "unknown")}</b>\n\nPick your new mahallah:`;
    await richSend(chatId, mahallahPickerBlocks(`Switching mahallah, ${name}? No problem! 🏠`, `Your current: ${userRecord.mahallah || "unknown"}\nPick your new mahallah:`), {
      fallbackText,
      fallbackReplyMarkup: mahallahKeyboard()
    });
    return;
  }

  // ── Committee notification menus (non-student only) ──
  if (data.startsWith("notify_menu:") && userRecord?.role && userRecord.role !== "student") {
    const menu = data.split(":")[1];
    if (menu === "session") {
      await sendCommitteeCategoryMenu(chatId, userRecord, "session");
    } else if (menu === "masterplan") {
      await sendCommitteeCategoryMenu(chatId, userRecord, "masterplan");
    } else {
      await sendCommitteeMenuMain(chatId, userRecord);
    }
    return;
  }

  if ((data.startsWith("set_briefing:") || data.startsWith("set_masterplan:")) && userRecord?.role && userRecord.role !== "student") {
    const [kind, value] = data.split(":");
    if (!["on", "off"].includes(value)) return;
    const isBriefing = kind === "set_briefing";
    const prefs = committeePrefs(userRecord);
    const merged = { ...prefs, [isBriefing ? "briefing" : "masterplan"]: value };
    try {
      await updateUserRegistration(userRecord.telegram_id, { committee_prefs: merged });
    } catch (err) {
      console.error("Committee prefs update failed:", err?.message || err);
      await richSend(chatId, [
        richHeading("😓 Something went wrong"),
        richParagraph("Please try again or contact the Mainboard team.")
      ], { fallbackText: "😓 Something went wrong saving your settings. Please try again." });
      return;
    }
    const label = isBriefing ? "Daily morning briefing" : "Masterplan reminders";
    const state = value === "on" ? "turned ON" : "turned OFF";
    const fallbackText = `✅ <b>${label} ${state}!</b>\n\nChange it again anytime with /notifications.`;
    await richSend(chatId, [
      richHeading(`✅ ${label} ${state}!`),
      richParagraph(isBriefing
        ? value === "on" ? "You'll get one short morning summary at 07:00." : "No morning briefing will be sent."
        : value === "on" ? "You'll be pinged shortly before each assigned task is due." : "No due-time task pings will be sent."),
      richParagraph("Change it again anytime with /notifications"),
      richButtonsRow([richButton({ text: "← Back to settings", callbackData: "notify_menu:main", style: "link" })])
    ], { fallbackText });
    return;
  }

  // Notification tier selected
  if (data.startsWith("set_notify:")) {
    const tier = data.split(":")[1];
    if (!["off", "daily", "session", "live"].includes(tier)) return;
    await updateUserRegistration(userRecord.telegram_id, { notify_tier: tier });
    const tierNames = { daily: "Daily", session: "Session", live: "Live", off: "Off" };
    const fallbackText = `✅ <b>Notification updated!</b>\n\nYou'll now receive: <b>${tierNames[tier]}</b> reminders.\n\nChange anytime with /notifications`;
    await richSend(chatId, [
      richHeading("✅ Notification updated!"),
      richParagraph(`You'll now receive: ${tierNames[tier]} reminders.`),
      richParagraph("Change anytime with /notifications")
    ], { fallbackText });
    return;
  }
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

  try {
    const update = await readJson(req);

    // Fire-and-forget: ping notification checker on every bot interaction
    const baseUrl = appBaseUrl();
    fetch(`${baseUrl}/api/cron/notifications`, { method: "GET" }).catch(() => {});

    // Handle callback queries (inline keyboard taps)
    const callback = update.callback_query;
    if (callback) {
      const chatId = callback.message?.chat?.id;
      const data = callback.data;
      const from = callback.from;
      if (!chatId || !data || !from) return sendJson(res, 200, { ok: true });

      await callTelegram("answerCallbackQuery", { callback_query_id: callback.id });

      const telegramId = String(from.id);
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      await handleCallback(chatId, userRecord, data, String(from.id));
      return sendJson(res, 200, { ok: true, handled: "callback" });
    }

    // Handle messages
    const message = update.message;
    if (!message) return sendJson(res, 200, { ok: true, ignored: true });

    const text = message.text || "";
    const chatId = message.chat?.id;
    const from = message.from;
    if (!chatId || !from) return sendJson(res, 200, { ok: true, ignored: true });

    const telegramId = String(from.id);

    // /start command
    if (text.startsWith("/start")) {
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      await sendStart(chatId, userRecord);
      return sendJson(res, 200, { ok: true, handled: "start" });
    }

    // /unlock command
    if (text.startsWith("/unlock")) {
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      const codeText = text.slice(7).trim();
      await handleUnlock(chatId, userRecord, codeText);
      return sendJson(res, 200, { ok: true, handled: "unlock" });
    }

    // /notifications command
    if (text.startsWith("/notifications")) {
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      await handleNotifications(chatId, userRecord);
      return sendJson(res, 200, { ok: true, handled: "notifications" });
    }

    // /review command
    if (text.startsWith("/review")) {
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      await handleReviewStart(chatId, userRecord);
      return sendJson(res, 200, { ok: true, handled: "review" });
    }

    // /baiah command — mainboard remote control for the celebration takeover
    if (text.startsWith("/baiah")) {
      let userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) {
        userRecord = await upsertUser(telegramId, from.first_name, from.last_name, from.username);
      }
      await sendBaiahMenu(chatId, userRecord);
      return sendJson(res, 200, { ok: true, handled: "baiah" });
    }

    // /help command
    if (text.startsWith("/help")) {
      const fallbackText = `🤖 <b>Bot Commands</b>\n\n<b>/start</b> — View your profile & dashboard\n<b>/unlock CODE</b> — Unlock committee access\n<b>/unlock student</b> — Switch back to student view (committee)\n<b>/notifications</b> — Subscribe to session reminders\n<b>/review</b> — Rate your Ta'aruf Week experience\n\nYou can also:\n• Tap the buttons below any message to open the app\n• Update your matric number or kulliyyah anytime\n• Check your attendance progress\n\n📢 Join our community: https://t.me/taweprohelp`;
      await richSend(chatId, [
        richHeading("🤖 Bot Commands"),
        richList([
          { blocks: [richParagraph([{ type: "code", text: "/start" }, " — View your profile & dashboard"])] },
          { blocks: [richParagraph([{ type: "code", text: "/unlock CODE" }, " — Unlock committee access"])] },
          { blocks: [richParagraph([{ type: "code", text: "/unlock student" }, " — Switch back to student view (committee)"])] },
          { blocks: [richParagraph([{ type: "code", text: "/notifications" }, " — Subscribe to session reminders"])] },
          { blocks: [richParagraph([{ type: "code", text: "/review" }, " — Rate your Ta'aruf Week experience"])] }
        ]),
        richParagraph("You can also: tap the buttons below any message to open the app, update your matric / kulliyyah / mahallah anytime, and check your attendance progress."),
        richButtonsRow([richButton({ text: "📢 Join our community", url: "https://t.me/taweprohelp" })])
      ], { fallbackText, fallbackReplyMarkup: { remove_keyboard: true } });
      return sendJson(res, 200, { ok: true, handled: "help" });
    }

    // Text input (matric number during registration, /review content)
    if (text && !text.startsWith("/")) {
      // /review flow: session lookup is independent of the users row
      let session = null;
      try {
        session = await getReviewSession(telegramId);
      } catch (err) {
        console.error("[review] session lookup failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
      }

      if (session) {
        try {
          if (!session.content) {
            await handleReviewText(chatId, session, text);
          } else {
            await richSend(chatId, [
              richHeading("Please pick a rating ⭐"),
              richParagraph("Tap a star rating below, or tap Skip rating.")
            ], { fallbackText: "Please pick a rating below, or tap Skip rating. ⭐" });
          }
        } catch (err) {
          console.error("[review] text step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
          await richSend(chatId, [
            richHeading("😓 Something went wrong"),
            richParagraph("Please try again with /review.")
          ], { fallbackText: "😓 Something went wrong saving your review. Please try again with /review." }).catch(() => {});
        }
        return sendJson(res, 200, { ok: true, handled: "review" });
      }

      const userRecord = await getUserRecordByTelegramId(telegramId);
      if (!userRecord) return sendJson(res, 200, { ok: true, ignored: true });

      const step = userRecord.registration_step;
      if (step && ["matric", "change_matric"].includes(step)) {
        await handleMatricInput(chatId, userRecord, text);
        return sendJson(res, 200, { ok: true, handled: "matric" });
      }
    }

    return sendJson(res, 200, { ok: true, ignored: true });
  } catch (error) {
    console.error("Webhook failed", error);
    return sendJson(res, 200, { ok: true, error: "Internal webhook error" });
  }
}

// ── Baiah takeover remote (mainboard) ──
function formatBaiahKl(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "—";
  }
}

async function fetchBaiahRow() {
  const rows = await supabaseRequest("/app_settings?id=eq.1&select=*&limit=1");
  return Array.isArray(rows) ? rows[0] : null;
}

async function setBaiahActive(userRecord, active) {
  const nowIso = new Date().toISOString();
  const body = active
    ? {
        is_baiah_active: true,
        baiah_activated_at: nowIso,
        baiah_start_at: null,
        baiah_updated_by: userRecord?.name || "mainboard",
        updated_at: nowIso
      }
    : {
        is_baiah_active: false,
        baiah_start_at: null,
        baiah_updated_by: userRecord?.name || "mainboard",
        updated_at: nowIso
      };
  await supabaseRequest("/app_settings?id=eq.1", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body
  });
  try {
    await createAuditLog({
      actor: userRecord,
      action: active ? "activated_baiah_takeover" : "deactivated_baiah_takeover",
      tableName: "app_settings",
      recordId: "1",
      details: `Baiah takeover ${active ? "ACTIVATED" : "deactivated"} via bot remote.`
    });
  } catch {
    undefined;
  }
}

async function sendBaiahMenu(chatId, userRecord) {
  if (userRecord?.role !== "mainboard") {
    await richSend(chatId, [
      richHeading("⛔ Mainboard only"),
      richParagraph("The Baiah takeover remote is limited to the mainboard role.")
    ], { fallbackText: "⛔ The Baiah takeover remote is limited to the mainboard role." });
    return;
  }

  let row = null;
  try {
    row = await fetchBaiahRow();
  } catch {
    undefined;
  }
  if (!row) {
    await richSend(chatId, [
      richHeading("⚠️ app_settings missing"),
      richParagraph("Run supabase/baiah-takeover.sql, then try /baiah again.")
    ], { fallbackText: "⚠️ app_settings row missing. Run supabase/baiah-takeover.sql first." });
    return;
  }

  const status = row.is_baiah_active ? "🔴 LIVE now" : row.baiah_start_at ? "🗓️ Scheduled" : "⚪ Off";
  const detail = row.is_baiah_active
    ? `Live since ${formatBaiahKl(row.baiah_activated_at)}${row.baiah_updated_by ? ` · by ${row.baiah_updated_by}` : ""}`
    : row.baiah_start_at
      ? `Starts ${formatBaiahKl(row.baiah_start_at)} (MYT) · announcement ${Number(row.baiah_notify_lead_minutes ?? 2)} min before`
      : "Nothing scheduled. Use the app panel to set a time, or tap Activate now.";

  const fallbackReplyMarkup = {
    inline_keyboard: [
      [
        { text: "🎉 Activate now", callback_data: "baiah:on" },
        { text: "🛑 Deactivate", callback_data: "baiah:off" }
      ],
      [
        { text: "🔄 Refresh", callback_data: "baiah:status" },
        { text: "⚙️ Open controls", web_app: { url: `${appBaseUrl()}/bureau` } }
      ]
    ]
  };

  await richSend(chatId, [
    richHeading("🎊 Baiah takeover remote"),
    richParagraph(`Status: ${status}`),
    richParagraph(detail),
    richParagraph(
      `Announcement: ${row.baiah_notify === false ? "off" : "on"} · Music: ${row.baiah_song_enabled === true ? "on" : "off"} · Skip button: ${row.baiah_skip_enabled === false ? "hidden" : "shown"}`
    ),
    richButtonsRow([
      richButton({ text: "🎉 Activate now", callbackData: "baiah:on", style: "success" }),
      richButton({ text: "🛑 Deactivate", callbackData: "baiah:off", style: "danger" })
    ]),
    richButtonsRow([
      richButton({ text: "🔄 Refresh", callbackData: "baiah:status" }),
      richButton({ text: "⚙️ Open controls", webApp: `${appBaseUrl()}/bureau` })
    ])
  ], { fallbackText: `🎊 Baiah takeover: ${status}\n${detail}`, fallbackReplyMarkup });
}
