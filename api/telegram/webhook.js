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

async function deleteReviewSession(telegramId) {
  await supabaseRequest(`/review_sessions?telegram_id=eq.${encodeURIComponent(telegramId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}

async function handleReviewStart(chatId, userRecord) {
  const name = escapeName(userRecord?.name || "");
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `⭐ <b>Rate your Ta'aruf Week experience!</b>\n\nHow would you like your name displayed?`,
    parse_mode: "HTML",
    reply_markup: reviewNameKeyboard()
  });
}

async function handleReviewText(chatId, session, text) {
  const content = String(text || "").trim().slice(0, 1500);
  if (!content) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "That message was empty. Send your review text:",
      parse_mode: "HTML"
    });
    return;
  }
  await upsertReviewSession(session.telegram_id, { content });
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: "Got it! How many stars would you give your Ta'aruf Week experience? ⭐",
    parse_mode: "HTML",
    reply_markup: reviewStarsKeyboard()
  });
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
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "😓 Sorry, something went wrong saving your review. Please try again with /review.",
      parse_mode: "HTML"
    });
    return;
  }

  const stars = review.rating ? `${"⭐".repeat(review.rating)} (${review.rating}/5)` : "None";
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `✅ <b>Review received!</b>\n\n${stars !== "None" ? `🏅 ${stars}\n` : ""}${html(review.content)}\n\nThank you for your feedback!`,
    parse_mode: "HTML",
    reply_markup: { remove_keyboard: true }
  });

  // Step D: admin moderation alert (isolated — must never fail the user's flow)
  const adminId = process.env.REVIEW_ADMIN_TELEGRAM_ID;
  if (!adminId) {
    console.error("[review] REVIEW_ADMIN_TELEGRAM_ID is not configured — admin alert skipped.");
    return;
  }
  try {
    await callTelegram("sendMessage", {
      chat_id: adminId,
      text: `⭐ <b>New Review</b>\n\n👤 ${html(review.display_name)}\n🏅 ${stars}\n\n📝 ${html(review.content)}\n\nTap below to moderate:`,
      parse_mode: "HTML",
      reply_markup: {
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

async function handleNotifications(chatId, userRecord) {
  const current = userRecord?.notify_tier || "off";
  const tierNames = { daily: "Daily", session: "Session", live: "Live", off: "Off" };
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `🔔 <b>Notification Settings</b>\n\nCurrent: <b>${tierNames[current] || "Off"}</b>\n\nChoose when you want to receive session reminders:\n\n• <b>Daily</b> — 30 min before the first session each morning\n• <b>Session</b> — Morning + 1:40 PM reminder\n• <b>Live</b> — 5–10 min before every session starts\n• <b>Off</b> — No notifications\n\nTap a tier below to update: 👇`,
    parse_mode: "HTML",
    reply_markup: notifyKeyboard(current)
  });
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
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✨ <b>Salam, ${html(name)}!</b> 👋\n\nWe're so glad you're here — welcome to the <b>Ta'aruf Week</b> family! 🕌\n\nThis bot is your companion for the entire Ta'aruf Week. I'll help you register, track attendance, and stay updated throughout the programme.\n\nLet's start with your <b>matric number</b> — just type it below, e.g. 2212345 ✍️\n\nJoin our community below! 👇\nhttps://t.me/taweprohelp`,
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
      `   🏠 Mahallah:     <b>${html(mahallah)}</b>`,
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

  if (step === "mahallah_zone" || step === "mahallah" || step === "change_mahallah") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `🏠 <b>Pick your Mahallah, ${html(name)}!</b>\n\nWhich hostel do you belong to?`,
      parse_mode: "HTML",
      reply_markup: mahallahKeyboard()
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
    try {
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
    } catch (err) {
      console.error("Unlock mainboard failed:", err?.message || err);
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `😓 Sorry ${html(name)}, something went wrong updating your account. Please try again or contact the Mainboard team.`,
        parse_mode: "HTML"
      });
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
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `😓 Sorry ${html(name)}, something went wrong updating your account. Please try again or contact the Mainboard team.`,
      parse_mode: "HTML"
    });
    return;
  }

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

async function handleCallback(chatId, userRecord, data, fromId) {
  const name = escapeName(userRecord?.name || "");
  // Single source of truth for Telegram identity: the update's from.id.
  const telegramId = fromId || userRecord?.telegram_id || "";

  // ── /review flow ──
  if (data === "review_name:use" || data === "review_name:anon") {
    const displayName = data === "review_name:anon" ? "Anonymous" : userRecord?.name || "Anonymous";
    await upsertReviewSession(telegramId, { display_name: displayName, content: null });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `📝 <b>Tell us about your Ta'aruf Week!</b>\n\nSend your review text below — what did you love, and what could be better?`,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  if (data === "review_cancel") {
    await deleteReviewSession(telegramId);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "Review cancelled. You can start again anytime with /review",
      parse_mode: "HTML"
    });
    return;
  }

  if (data.startsWith("review_rating:")) {
    try {
      const session = await getReviewSession(telegramId);
      if (!session) {
        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: "No active review found. Start one with /review",
          parse_mode: "HTML"
        });
        return;
      }
      const value = data.split(":")[1];
      const rating = value === "skip" ? null : parseInt(value, 10);
      await completeReview(chatId, session, rating);
    } catch (err) {
      console.error("[review] rating step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "😓 Something went wrong saving your review. Please try again with /review.",
        parse_mode: "HTML"
      }).catch(() => {});
    }
    return;
  }

  if (data.startsWith("review_approve:") || data.startsWith("review_reject:")) {
    const adminId = process.env.REVIEW_ADMIN_TELEGRAM_ID;
    if (!adminId || String(fromId) !== String(adminId)) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "⛔ You're not authorized to moderate reviews.",
        parse_mode: "HTML"
      });
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
        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: "✅ Review approved.",
          parse_mode: "HTML"
        });
      } else {
        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: "❌ Review rejected (kept unapproved).",
          parse_mode: "HTML"
        });
      }
    } catch (err) {
      console.error("[review] moderation step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "😓 Something went wrong. Please try again.",
        parse_mode: "HTML"
      }).catch(() => {});
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
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `😓 Sorry ${html(name)}, something went wrong saving your bureau. Please try again or contact the Mainboard team.`,
        parse_mode: "HTML"
      });
      return;
    }

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
      registration_step: isChange ? null : "mahallah"
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
        text: `✅ <b>Got it, ${html(name)}!</b> Kulliyyah: <b>${html(k)}</b> 🏛️\n\nLast step — which <b>hostel (mahallah)</b> do you stay at? Pick your zone first:`,
        parse_mode: "HTML",
        reply_markup: mahallahZoneKeyboard()
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

  // Mahallah selected
  if (data.startsWith("pick_mahallah:")) {
    const m = data.split(":")[1];
    const all = [...maleMahallahs, ...femaleMahallahs];
    if (!all.includes(m)) return;
    const step = userRecord?.registration_step || "";
    const isChange = step === "change_mahallah" || step === "mahallah";
    await updateUserRegistration(userRecord.telegram_id, {
      mahallah: m,
      registration_step: null
    });
    if (isChange) {
      const old = userRecord.mahallah || "unknown";
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ <b>Updated, ${html(name)}!</b> 🏠\n\nMahallah:   <b>${html(old)}</b> → <b>${html(m)}</b>`,
        parse_mode: "HTML",
        reply_markup: changeKeyboard(userRecord.role)
      });
    } else {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ <b>You're all set, ${html(name)}!</b> 🎉\n\n📋 <b>Your Details:</b>\n   🎭 Role:         <b>Student</b>\n   📝 Matric:       <code>${html(userRecord.matric_number || "")}</code>\n   🏛️ Kulliyyah:    <b>${html(userRecord.kulliyyah || "")}</b>\n   🏠 Mahallah:     <b>${html(m)}</b>\n\nYou're now ready to experience Ta'aruf Week like never before. Track your attendance, navigate venues, and stay updated — all in one place!\n\nTap below to dive in 👇`,
        parse_mode: "HTML",
        reply_markup: dashboardKeyboard()
      });
    }
    return;
  }

  // Change mahallah
  if (data === "change_mahallah") {
    await updateUserRegistration(userRecord.telegram_id, { registration_step: "change_mahallah" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Switching mahallah, ${html(name)}? No problem! 🏠\n\nYour current: <b>${html(userRecord.mahallah || "unknown")}</b>\n\nPick your new mahallah:`,
      parse_mode: "HTML",
      reply_markup: mahallahKeyboard()
    });
    return;
  }

  // Notification tier selected
  if (data.startsWith("set_notify:")) {
    const tier = data.split(":")[1];
    if (!["off", "daily", "session", "live"].includes(tier)) return;
    await updateUserRegistration(userRecord.telegram_id, { notify_tier: tier });
    const tierNames = { daily: "Daily", session: "Session", live: "Live", off: "Off" };
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ <b>Notification updated!</b>\n\nYou'll now receive: <b>${tierNames[tier]}</b> reminders.\n\nChange anytime with /notifications`,
      parse_mode: "HTML"
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

    // /help command
    if (text.startsWith("/help")) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🤖 <b>Bot Commands</b>\n\n<b>/start</b> — View your profile & dashboard\n<b>/unlock CODE</b> — Unlock committee access\n<b>/notifications</b> — Subscribe to session reminders\n<b>/review</b> — Rate your Ta'aruf Week experience\n\nYou can also:\n• Tap the buttons below any message to open the app\n• Update your matric number or kulliyyah anytime\n• Check your attendance progress\n\n📢 Join our community: https://t.me/taweprohelp`,
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true }
      });
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
            await callTelegram("sendMessage", {
              chat_id: chatId,
              text: "Please pick a rating below, or tap Skip rating. ⭐",
              parse_mode: "HTML"
            });
          }
        } catch (err) {
          console.error("[review] text step failed", err?.message || err, err?.payload ? `| payload: ${JSON.stringify(err.payload)}` : "");
          await callTelegram("sendMessage", {
            chat_id: chatId,
            text: "😓 Something went wrong saving your review. Please try again with /review.",
            parse_mode: "HTML"
          }).catch(() => {});
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
