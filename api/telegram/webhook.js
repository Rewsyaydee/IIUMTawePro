import { readJson, sendJson, resolveAccessCode } from "../_lib/auth-utils.js";
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

function roleLabel(role, bureau) {
  if (role === "student") return "Student";
  if (role === "mainboard") return "Mainboard";
  if (role === "head" && bureau) return `Head of ${bureau}`;
  if (role === "committee" && bureau) return `Committee of ${bureau}`;
  return role || "Student";
}

const BUREAUS = ["Catering", "PrepTech", "Registration", "Program Coordinator", "Special Task", "Discipline", "Multimedia", "Welfare"];

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

function kulliyyahKeyboard() {
  const rows = [];
  for (let i = 0; i < kulliyyahs.length; i += 2) {
    rows.push(kulliyyahs.slice(i, i + 2).map((k) => ({ text: k, callback_data: `pick_kulliyyah:${k}` })));
  }
  return { inline_keyboard: rows };
}

function changeKeyboard(role) {
  if (role && role !== "student") {
    return {
      inline_keyboard: [
        [{ text: "🧭 Open Dashboard", web_app: { url: appBaseUrl() } }],
        [{ text: "📅 View Schedule", web_app: { url: `${appBaseUrl()}/official-schedule` } }],
        [{ text: "🤲 Wellbeing Support", url: supportUrl() }]
      ]
    };
  }
  return {
    inline_keyboard: [
      [{ text: "✏️ Change Matric", callback_data: "change_matric" }],
      [{ text: "🏛️ Change Kulliyyah", callback_data: "change_kulliyyah" }],
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
      [{ text: "🤲 Wellbeing Support", url: supportUrl() }]
    ]
  };
}

async function upsertUser(telegramId, firstName, lastName, username) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Guest Student";
  const rows = await supabaseRequest("/users?on_conflict=telegram_id&select=id,telegram_id,name,role,bureau,matric_number,kulliyyah,registration_step", {
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
  const role = userRecord?.role || "student";
  const bureau = userRecord?.bureau || "";
  const rLabel = roleLabel(role, bureau);

  // New user — no record at all
  if (!userRecord) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✨ <b>Salam, ${html(name)}!</b> 👋\n\nWe're so glad you're here — welcome to the <b>Ta'aruf Week</b> family! 🕌\n\nThis bot is your companion for the entire Ta'aruf Week. I'll help you register, track attendance, and stay updated throughout the programme.\n\nLet's start with your <b>matric number</b> — just type it below, e.g. 2212345 ✍️`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  // Registered — show welcome back
  if (!step) {
    const attendance = await getAttendanceCount(userRecord.id);
    const lines = [
      `✨ <b>Great to see you again, ${html(name)}!</b> 🌙`,
      "",
      `📋 <b>Your Ta'aruf Week Profile:</b>`,
      `   🎭 Role:         <b>${html(rLabel)}</b>`,
      `   📝 Matric:       <code>${html(matric)}</code>`,
      `   🏛️ Kulliyyah:    <b>${html(kulliyyah)}</b>`,
      `   📊 Attendance:   <b>${attendance}/8</b> sessions complete`,
      ""
    ];

    if (role === "student") {
      lines.push("Need to update your details or unlock committee access? 👇");
    } else {
      lines.push("Need to update anything? Tap below 👇");
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
      reply_markup: changeKeyboard(role)
    });
    return;
  }

  // Mid-registration — resume flow
  if (step === "matric" || step === "change_matric") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `👋 <b>Hey ${html(name)}, let's pick up where we left off!</b>\n\nWhat's your <b>matric number</b>? Just type it below, e.g. 2212345 ✍️`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  if (step === "kulliyyah" || step === "change_kulliyyah") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `👋 <b>Hey ${html(name)}, we're almost there!</b>\n\nWhich <b>kulliyyah</b> are you from? Pick one below — this is where your Ihsan Madani sessions will be held: 🏛️`,
      parse_mode: "HTML",
      reply_markup: kulliyyahKeyboard()
    });
    return;
  }
}

async function handleUnlock(chatId, userRecord, codeText) {
  const name = escapeName(userRecord?.name || "");
  const code = codeText.trim();

  if (!code) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `🔓 <b>Unlock Committee Access</b>\n\nSend your access code like this:\n<code>/unlock YOUR_CODE_HERE</code>\n\nIf you don't have a code yet, please contact the Mainboard team.`,
      parse_mode: "HTML"
    });
    return;
  }

  const invite = resolveAccessCode({ code, selectedRole: "committee", selectedBureau: "Catering" });

  if (!invite.ok) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Hmm, that code doesn't look right 😅\n\nPlease double-check your access code and try again with:\n<code>/unlock YOUR_CODE_HERE</code>`,
      parse_mode: "HTML"
    });
    return;
  }

  // Mainboard — no bureau needed
  if (invite.role === "mainboard") {
    await updateUserRegistration(userRecord.telegram_id, {
      role: "mainboard",
      bureau: null,
      registration_step: null
    });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `🎉 <b>Access unlocked, ${html(name)}!</b>\n\n🎭 You are now <b>Mainboard</b>.\n\nYou now have full access to the control room, broadcast tools, and operations dashboard.\n\nTap below to open your workspace 👇`,
      parse_mode: "HTML",
      reply_markup: dashboardKeyboard()
    });
    return;
  }

  // Committee or Head — need to ask for bureau
  await updateUserRegistration(userRecord.telegram_id, {
    role: invite.role,
    registration_step: `unlock_bureau:${invite.role}`
  });

  const roleText = invite.role === "head" ? "Head of Bureau" : "Committee Member";
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `🎉 <b>Code verified, ${html(name)}!</b>\n\nYou're unlocking access as a <b>${html(roleText)}</b>.\n\nNow, which <b>bureau</b> do you belong to? Pick one below: 🏛️`,
    parse_mode: "HTML",
    reply_markup: bureauKeyboard()
  });
}

async function handleMatricInput(chatId, userRecord, text) {
  const step = userRecord?.registration_step || "";
  const name = escapeName(userRecord?.name || "");

  if (!step || !["matric", "change_matric"].includes(step)) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Hmm, I didn't quite catch that! 😅\n\nType <b>/start</b> to see your profile, or <b>/unlock</b> to unlock committee access.`,
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
      text: `✅ <b>All updated, ${html(name)}!</b> ✨\n\n📝 Matric:       <code>${html(old)}</code> → <code>${html(matric)}</code>\n\nEverything looks good! Anything else you'd like to change?`,
      parse_mode: "HTML",
      reply_markup: changeKeyboard(userRecord.role)
    });
    return;
  }

  // New registration — ask for kulliyyah
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `Perfect, ${html(name)}! Your matric is <code>${html(matric)}</code> 📝\n\nNow, which <b>kulliyyah</b> are you from? Pick one below — this is where your Ihsan Madani sessions will be held: 🏛️`,
    parse_mode: "HTML",
    reply_markup: kulliyyahKeyboard()
  });
}

async function handleCallback(chatId, userRecord, data) {
  const name = escapeName(userRecord?.name || "");

  // Bureau selected (from /unlock flow)
  if (data.startsWith("pick_bureau:")) {
    const b = data.split(":")[1];
    if (!BUREAUS.includes(b)) return;

    const step = userRecord?.registration_step || "";
    if (!step.startsWith("unlock_bureau:")) return;
    const unlockRole = step.split(":")[1];

    await updateUserRegistration(userRecord.telegram_id, {
      bureau: b,
      role: unlockRole,
      registration_step: null
    });

    const rLabel = roleLabel(unlockRole, b);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `🎉 <b>Access unlocked, ${html(name)}!</b>\n\n🎭 You are now <b>${html(rLabel)}</b>.\n\nYou now have access to your bureau's tasks, operations, and attendance tools.\n\nTap below to open your workspace 👇`,
      parse_mode: "HTML",
      reply_markup: dashboardKeyboard()
    });
    return;
  }

  // Unlock prompt
  if (data === "unlock_prompt") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `🔓 <b>Unlock Committee Access</b>\n\nIf you have an access code, send it like this:\n<code>/unlock YOUR_CODE_HERE</code>\n\nDon't have a code? Please contact the Mainboard team.`,
      parse_mode: "HTML"
    });
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
      registration_step: null
    });

    if (isChange) {
      const old = userRecord.kulliyyah || "";
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ <b>Updated, ${html(name)}!</b> 🏛️\n\nKulliyyah:   <b>${html(old)}</b> → <b>${html(k)}</b>\n\nRemember — your Ihsan Madani sessions will now be at <b>${html(k)}</b>. Plan your route! 🗺️`,
        parse_mode: "HTML",
        reply_markup: changeKeyboard(userRecord.role)
      });
    } else {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ <b>You're all set, ${html(name)}!</b> 🎉\n\n📋 <b>Your Details:</b>\n   🎭 Role:         <b>Student</b>\n   📝 Matric:       <code>${html(userRecord.matric_number || "")}</code>\n   🏛️ Kulliyyah:    <b>${html(k)}</b>\n\nYou're now ready to experience Ta'aruf Week like never before. Track your attendance, navigate venues, and stay updated — all in one place!\n\nTap below to dive in 👇`,
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

    // /help command
    if (text.startsWith("/help")) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🤖 <b>Bot Commands</b>\n\n<b>/start</b> — View your profile & dashboard\n<b>/unlock CODE</b> — Unlock committee access\n\nYou can also:\n• Tap the buttons below any message to open the app\n• Update your matric number or kulliyyah anytime\n• Check your attendance progress\n\nNeed help? Contact the Mainboard team.`,
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true }
      });
      return sendJson(res, 200, { ok: true, handled: "help" });
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
