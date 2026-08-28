// Validates the bot-chat Rich Message payloads built by webhook.js helpers
// against the live Telegram API. Sends representative payloads (profile table,
// mahallah picker, review moderation, notifications checkbox list) to the
// target chat so the actual rendering can be eyeballed.
//
// Usage:
//   node tests/test-botchat-rich.mjs
//
// Reads TELEGRAM_BOT_TOKEN from env or .env; sends to TARGET_TELEGRAM_ID
// (default 605353966). A legacy fallback is sent when a rich payload is rejected.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  richBlockquote,
  richButton,
  richButtonsRow,
  richHeading,
  richList,
  richParagraph,
  richPre,
  richTable
} from "../api/_lib/rich-messages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv(file) {
  const out = {};
  try {
    const text = fs.readFileSync(path.resolve(file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !m[1].startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}

const dotEnv = loadDotEnv(path.join(__dirname, "..", ".env"));
const token = process.env.TELEGRAM_BOT_TOKEN || dotEnv.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TARGET_TELEGRAM_ID || dotEnv.TARGET_TELEGRAM_ID || "605353966";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not found in env or .env");
  process.exit(1);
}

const appBase = "https://iium-tawe-pro.vercel.app";

const payloads = [
  {
    name: "profile-table",
    blocks: [
      richHeading("✨ Great to see you again, Tester! 🌙"),
      richParagraph("Your Ta'aruf Week profile:"),
      richTable([
        [{ text: "🎭 Role", is_header: true }, { text: "Student" }],
        [{ text: "📝 Matric", is_header: true }, { text: "2212345" }],
        [{ text: "🏛️ Kulliyyah", is_header: true }, { text: "KICT" }],
        [{ text: "🏠 Mahallah", is_header: true }, { text: "Faruq" }],
        [{ text: "📊 Attendance", is_header: true }, { text: "6/8 sessions complete" }]
      ]),
      richParagraph("Need to update your details or unlock committee access? 👇"),
      richButtonsRow([
        richButton({ text: "✏️ Change Matric", callbackData: "change_matric" }),
        richButton({ text: "🏛️ Change Kulliyyah", callbackData: "change_kulliyyah" }),
        richButton({ text: "🏠 Change Mahallah", callbackData: "change_mahallah" })
      ]),
      richButtonsRow([
        richButton({ text: "🧭 Open Dashboard", webApp: appBase }),
        richButton({ text: "📅 View Schedule", webApp: `${appBase}/official-schedule` })
      ])
    ]
  },
  {
    name: "mahallah-picker",
    blocks: [
      richHeading("Pick your Mahallah, Tester! 🏠"),
      richParagraph("Which hostel do you belong to?"),
      richHeading("Male Mahallahs", 4),
      richButtonsRow([
        richButton({ text: "Uthman", callbackData: "pick_mahallah:Uthman" }),
        richButton({ text: "Faruq", callbackData: "pick_mahallah:Faruq" }),
        richButton({ text: "Siddiq", callbackData: "pick_mahallah:Siddiq" })
      ]),
      richHeading("Female Mahallahs", 4),
      richButtonsRow([
        richButton({ text: "Safiyyah", callbackData: "pick_mahallah:Safiyyah" }),
        richButton({ text: "Aminah", callbackData: "pick_mahallah:Aminah" }),
        richButton({ text: "Asiah", callbackData: "pick_mahallah:Asiah" })
      ])
    ]
  },
  {
    name: "review-moderation",
    blocks: [
      richHeading("⭐ New Review"),
      richParagraph("👤 Anonymous"),
      richParagraph("🏅 ⭐⭐⭐⭐ (4/5)"),
      richBlockquote("The orientation programme was super organised. Loved the KCDIO sessions and the mahallah activities!"),
      richButtonsRow([
        richButton({ text: "✅ Approve", callbackData: "review_approve:test", style: "success" }),
        richButton({ text: "❌ Reject", callbackData: "review_reject:test", style: "danger" })
      ])
    ]
  },
  {
    name: "notifications",
    blocks: [
      richHeading("🔔 Notification Settings"),
      richParagraph("Current: Off"),
      richList([
        { blocks: [richParagraph("🌅 Daily — 30 min before the first session each morning")], hasCheckbox: true, isChecked: false },
        { blocks: [richParagraph("🕘 Session — Morning + 1:40 PM reminder")], hasCheckbox: true, isChecked: false },
        { blocks: [richParagraph("🔔 Live — 5–10 min before every session starts")], hasCheckbox: true, isChecked: false },
        { blocks: [richParagraph("🔕 Off — No notifications")], hasCheckbox: true, isChecked: true }
      ]),
      richParagraph("Tap a tier below to update: 👇"),
      richButtonsRow([richButton({ text: "🔔 Live — Every programme as it begins", callbackData: "set_notify:live" })])
    ]
  },
  {
    name: "help",
    blocks: [
      richHeading("🤖 Bot Commands"),
      richList([
        { blocks: [richParagraph([{ type: "code", text: "/start" }, " — View your profile & dashboard"])] },
        { blocks: [richParagraph([{ type: "code", text: "/unlock CODE" }, " — Unlock committee access"])] },
        { blocks: [richParagraph([{ type: "code", text: "/notifications" }, " — Subscribe to session reminders"])] },
        { blocks: [richParagraph([{ type: "code", text: "/review" }, " — Rate your Ta'aruf Week experience"])] }
      ]),
      richButtonsRow([richButton({ text: "📢 Join our community", url: "https://t.me/taweprohelp" })])
    ]
  },
  {
    name: "unlock-no-code",
    blocks: [
      richHeading("🔓 Unlock Committee Access"),
      richParagraph("Send your access code like this:"),
      richPre("/unlock YOUR_CODE_HERE"),
      richParagraph("If you don't have a code yet, please contact the Mainboard team.")
    ]
  }
];

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

let failed = 0;
for (const item of payloads) {
  const rich = await callTelegram("sendRichMessage", { chat_id: chatId, rich_message: { blocks: item.blocks } });
  const status = rich.ok ? "OK " : "FAIL";
  if (!rich.ok) failed++;
  console.log(`[${status}] ${item.name.padEnd(22)} ${rich.ok ? "" : rich.description || ""}`);
}

console.log(failed === 0 ? "\nAll bot-chat rich payloads accepted by the live API." : `\n${failed} payload(s) rejected.`);
process.exit(failed === 0 ? 0 : 1);
