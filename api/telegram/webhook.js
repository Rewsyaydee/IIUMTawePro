import { readJson, sendJson } from "../_lib/auth-utils.js";
import { getUserRecordByTelegramId, supabaseRequest } from "../_lib/supabase.js";

function html(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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

function escapeName(name) {
  return html(name || "there");
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

function kulliyyahKeyboard() {
  const rows = [];
  for (let i = 0; i < kulliyyahs.length; i += 2) {
    rows.push(kulliyyahs.slice(i, i + 2).map((k) => ({ text: k, callback_data: `pick_kulliyyah:${k}` })));
  }
  return { inline_keyboard: rows };
}

function changeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✏️ Change Matric", callback_data: "change_matric" }],
      [{ text: "🏛️ Change Kulliyyah", callback_data: "change_kulliyyah" }],
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
      [{ text: "🤲 Wellbeing Support", url: supportUrl() }]
    ]
  };
}

async function upsertUser(telegramId, firstName, lastName, username) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Guest Student";
  const rows = await supabaseRequest("/users?on_conflict=telegram_id&select=id,telegram_id,name,matric_number,kulliyyah,registration_step", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: [{
      telegram_id: telegramId,
      name,
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

  // New user — no record at all
  if (!userRecord) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✨ <b>Salam, ${html(name)}!</b> 👋\n\nLooks like you're new here — welcome to the <b>Ta'aruf Week</b> family! 🕌\n\nBefore we begin, let's get to know each other. What's your <b>matric number</b>?\n\nJust type it below, e.g. 2212345 ✍️`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  // Registered — show welcome back
  if (!step) {
    const attendance = await getAttendanceCount(userRecord.id);
    const text = [
      `✨ <b>Welcome back, ${html(name)}!</b> 🌙`,
      "",
      `📋 <b>Your Ta'aruf Week Profile:</b>`,
      `   📝 Matric:       <code>${html(matric)}</code>`,
      `   🏛️ Kulliyyah:    <b>${html(kulliyyah)}</b>`,
      `   📊 Attendance:   <b>${attendance}/9</b> events complete`,
      "",
      "Need to update your details? 👇"
    ].join("\n");

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: changeKeyboard()
    });
    return;
  }

  // Mid-registration — resume flow
  if (step === "matric" || step === "change_matric") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `👋 <b>Hey again, ${html(name)}!</b>\n\nWe were just getting your details sorted. What's your <b>matric number</b>? ✍️\n\nJust type it below, e.g. 2212345`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  if (step === "kulliyyah" || step === "change_kulliyyah") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `👋 <b>Hey again, ${html(name)}!</b>\n\nAlmost done! Which <b>kulliyyah</b> are you from? 🏛️`,
      parse_mode: "HTML",
      reply_markup: kulliyyahKeyboard()
    });
    return;
  }
}

async function handleMatricInput(chatId, userRecord, text) {
  const step = userRecord?.registration_step || "";
  const name = escapeName(userRecord?.name || "");

  if (!step || !["matric", "change_matric"].includes(step)) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Hmm, I didn't quite catch that! 😅\n\nType <b>/start</b> to begin or update your registration.`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  const matric = text.trim();
  if (!/^\d{5,10}$/.test(matric)) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Hmm, that doesn't look like a valid matric number! 😅\n\nPlease enter a valid matric number, e.g. 2212345 ✍️`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  await updateUserRegistration(userRecord.telegram_id, {
    matric_number: matric,
    registration_step: step === "change_matric" ? null : "kulliyyah"
  });

  if (step === "change_matric") {
    const old = userRecord.matric_number || "unknown";
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ <b>Updated, ${html(name)}!</b> ✨\n\n📝 Matric:       <code>${html(old)}</code> → <code>${html(matric)}</code>\n\nAll good! Want to change anything else?`,
      parse_mode: "HTML",
      reply_markup: changeKeyboard()
    });
    return;
  }

  // New registration — ask for kulliyyah
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `Got it, ${html(name)}! Your matric is <code>${html(matric)}</code> 📝\n\nNow, which <b>kulliyyah</b> are you from? Pick one below — this is where your Ihsan Madani sessions will be held: 🏛️`,
    parse_mode: "HTML",
    reply_markup: kulliyyahKeyboard()
  });
}

async function handleCallback(chatId, userRecord, data) {
  const name = escapeName(userRecord?.name || "");

  // Kulliyyah selected (from registration or change)
  if (data.startsWith("pick_kulliyyah:")) {
    const k = data.split(":")[1];
    if (!kulliyyahs.includes(k)) return;

    const step = userRecord?.registration_step || "";
    const isChange = step === "change_kulliyyah";

    await updateUserRegistration(userRecord.telegram_id, {
      kulliyyah: k,
      registration_step: null
    });

    if (isChange) {
      const old = userRecord.kulliyyah || "";
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `Done, ${html(name)}! 🏛️\n\nKulliyyah:   <b>${html(old)}</b> → <b>${html(k)}</b>\n\nRemember — your Ihsan Madani sessions will now be at <b>${html(k)}</b>. Plan your route! 🗺️`,
        parse_mode: "HTML",
        reply_markup: changeKeyboard()
      });
    } else {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ <b>All set, ${html(name)}!</b> 🎉\n\n📋 <b>Your Details:</b>\n   📝 Matric:       <code>${html(userRecord.matric_number || "")}</code>\n   🏛️ Kulliyyah:    <b>${html(k)}</b>\n   🌐 Status:       New Student\n\nYou're now ready to experience Ta'aruf Week like never before. Track your attendance, navigate venues, and stay updated — all in one place!\n\nSee you inside! 👇`,
        parse_mode: "HTML",
        reply_markup: dashboardKeyboard()
      });
    }
    return;
  }

  // Change matric
  if (data === "change_matric") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_matric" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `No worries, ${html(name)}! Mistakes happen. ✍️\n\nYour current matric: <code>${html(userRecord.matric_number || "unknown")}</code>\n\nWhat's your new matric number? Just type it below:`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  // Change kulliyyah
  if (data === "change_kulliyyah") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_kulliyyah" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Switching kulliyyah? No problem, ${html(name)}! 🏛️\n\nYour current: <b>${html(userRecord.kulliyyah || "unknown")}</b>\n\nPick your new kulliyyah below:`,
      parse_mode: "HTML",
      reply_markup: kulliyyahKeyboard()
    });
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
      await handleCallback(chatId, userRecord, data);
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

    // Text input (matric number during registration)
    if (text && !text.startsWith("/")) {
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
