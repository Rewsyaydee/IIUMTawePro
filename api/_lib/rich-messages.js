// Rich Messages (Telegram Bot API 10.3+) dispatch helpers.
//
// Schema facts (verified against core.telegram.org/bots/api 10.3):
// - sendRichMessage takes { chat_id, rich_message } where rich_message is an
//   InputRichMessage and exactly one of blocks / html / markdown must be set.
// - Button rows are InputRichBlockButtons: { type: "buttons", buttons: [1..8
//   RichMessageButton], align: "left"|"center"|"right" }.
// - RichMessageButton: { text: RichText, style?, url? | web_app? | ... } —
//   web_app (WebAppInfo) launches the Mini App but works only in private chats.
// - RichText is a plain string, an array of RichText, or a typed entity like
//   { type: "bold", text }.
// - There is no documented client-side fallback, so callers should keep a
//   legacy plain-text version and use sendRichWithFallback.

import { getAppBaseUrl, getBotToken, sendTelegramMessage } from "./telegram-bot.js";

// ── Rich message block factories (Bot API 10.3 verified schema) ──

export function richHeading(text, size = 2) {
  return { type: "heading", text, size };
}

export function richParagraph(text) {
  return { type: "paragraph", text };
}

export function richPre(text, language) {
  return { type: "pre", text, ...(language ? { language } : {}) };
}

export function richFooter(text) {
  return { type: "footer", text };
}

export function richDetails(summary, blocks, isOpen) {
  return { type: "details", summary, blocks, ...(typeof isOpen === "boolean" ? { is_open: isOpen } : {}) };
}

export function richBlockquote(text, credit) {
  return { type: "expandable_blockquote", text, ...(credit ? { credit } : {}) };
}

export function richList(items) {
  return {
    type: "list",
    items: items.map((item) => {
      const { blocks, hasCheckbox, isChecked } = item;
      return {
        blocks,
        ...(typeof hasCheckbox === "boolean" ? { has_checkbox: hasCheckbox } : {}),
        ...(typeof isChecked === "boolean" ? { is_checked: isChecked } : {})
      };
    })
  };
}

export function richTable(rows, { compact = true, bordered = true, striped = false } = {}) {
  return {
    type: "table",
    cells: rows.map((row) => row.map((cell) => (typeof cell === "string" ? { text: cell } : cell))),
    ...(bordered ? { is_bordered: true } : {}),
    ...(striped ? { is_striped: true } : {}),
    ...(compact ? { is_compact: true } : {})
  };
}

export function richButtonsRow(buttons, align = "left") {
  return { type: "buttons", buttons, align };
}

export function richButton({ text, style, callbackData, webApp, url }) {
  return {
    text,
    ...(style ? { style } : {}),
    ...(callbackData ? { callback_data: callbackData } : {}),
    ...(webApp ? { web_app: { url: webApp } } : {}),
    ...(url ? { url } : {})
  };
}

export function buildRichMessage({ heading, lines, buttonLabel = "Open TawePro", webAppPath = "/attendance" }) {
  return {
    blocks: [
      { type: "heading", text: heading, size: 2 },
      ...(Array.isArray(lines) ? lines : []).map((text) => ({ type: "paragraph", text })),
      {
        type: "buttons",
        align: "center",
        buttons: [
          {
            text: buttonLabel,
            style: "primary",
            web_app: { url: `${getAppBaseUrl()}${webAppPath}` }
          }
        ]
      }
    ]
  };
}

// "⏰ Session Starting Soon!" — the live check-in alert.
export function buildSessionStartingRichMessage({ sessionName, location, timeRemaining, buttonLabel = "Open TawePro & Check In" }) {
  return buildRichMessage({
    heading: "⏰ Session Starting Soon!",
    lines: [
      [{ type: "bold", text: sessionName }],
      `📍 ${location}`,
      `🕐 ${timeRemaining}`
    ],
    buttonLabel
  });
}

// "🌅 Ta'aruf Week Morning!" — first-session-of-the-day reminder.
export function buildMorningRichMessage({ title, venue, time, buttonLabel = "Open TawePro" }) {
  return buildRichMessage({
    heading: "🌅 Ta'aruf Week Morning!",
    lines: [
      "First session today:",
      [{ type: "bold", text: title }],
      `📍 ${venue}`,
      `🕐 ${time}`
    ],
    buttonLabel
  });
}

// "🕐 Evening Sessions Reminder" — one paragraph per upcoming evening session.
export function buildEveningRichMessage({ lines, buttonLabel = "Open TawePro" }) {
  return buildRichMessage({
    heading: "🕐 Evening Sessions Reminder",
    lines: ["Upcoming today:", ...(Array.isArray(lines) ? lines : [])],
    buttonLabel
  });
}

export async function sendRichMessage(chatId, richMessage) {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendRichMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      rich_message: richMessage
    })
  });
  return response.json();
}

// Preferred path: try the native Rich Message; if the Bot API server rejects it
// (e.g. temporarily behind on the 10.3 release) or the network fails, fall back
// to the legacy HTML text message (+ optional inline keyboard) so no user is
// ever missed.
export async function sendRichWithFallback(chatId, { richMessage, fallbackText, fallbackReplyMarkup }) {
  try {
    const payload = await sendRichMessage(chatId, richMessage);
    if (payload.ok) return { used: "rich" };
    console.error(`[rich-message] sendRichMessage failed for ${chatId}:`, payload.description || JSON.stringify(payload));
  } catch (error) {
    console.error(`[rich-message] sendRichMessage threw for ${chatId}:`, error?.message || error);
  }
  try {
    await sendTelegramMessage(chatId, fallbackText, fallbackReplyMarkup);
    return { used: "fallback" };
  } catch (error) {
    console.error(`[rich-message] legacy fallback failed for ${chatId}:`, error?.message || error);
    return { used: "none", error: error?.message || "send failed" };
  }
}
