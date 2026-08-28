// Quick smoke test for the Rich Messages payload (Bot API 10.3 sendRichMessage).
//
// Usage:
//   node tests/test-rich-message.cjs
//
// Reads TELEGRAM_BOT_TOKEN from env or .env; sends to TARGET_TELEGRAM_ID
// (default 605353966). If sendRichMessage is rejected, falls back to the
// legacy plain-text message (mirrors sendRichWithFallback in production).

const fs = require("fs");
const path = require("path");

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

const richMessage = {
  blocks: [
    { type: "heading", text: "⏰ Session Starting Soon!", size: 2 },
    { type: "paragraph", text: [{ type: "bold", text: "Ihsan Madani Session" }] },
    { type: "paragraph", text: "📍 Respective Kulliyyah" },
    { type: "paragraph", text: "🕐 Starting in 14 min" },
    {
      type: "buttons",
      align: "center",
      buttons: [
        {
          text: "Open TawePro & Check In",
          style: "primary",
          web_app: { url: "https://iium-tawe-pro.vercel.app/attendance" }
        }
      ]
    }
  ]
};

const fallbackText = "⏰ <b>Session Starting Soon!</b>\n\n<b>Ihsan Madani Session</b>\n📍 Respective Kulliyyah\n🕐 Starting in 14 min\n\n👉 Open TawePro to check in: t.me/iiumtaweprobot";

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

(async () => {
  console.log(`Sending Rich Message to ${chatId}...`);
  const rich = await callTelegram("sendRichMessage", { chat_id: chatId, rich_message: richMessage });
  console.log(`sendRichMessage  -> ok=${rich.ok}${rich.description ? ` | ${rich.description}` : ""}`);

  if (rich.ok) {
    console.log("✓ Rich message sent. Check the chat for the card + centered button.");
    process.exit(0);
  }

  console.log("→ Falling back to legacy sendMessage...");
  const legacy = await callTelegram("sendMessage", {
    chat_id: chatId,
    text: fallbackText,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
  console.log(`sendMessage      -> ok=${legacy.ok}${legacy.description ? ` | ${legacy.description}` : ""}`);
  process.exit(legacy.ok ? 0 : 1);
})();
