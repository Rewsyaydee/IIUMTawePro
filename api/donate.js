import { sendJson } from "./_lib/auth-utils.js";
import { getBotToken } from "./_lib/telegram-bot.js";

async function callTelegram(method, payload) {
  const token = getBotToken();
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

const MIN_STARS = 1;
const MAX_STARS = 2500;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk; });
      req.on("end", () => {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON body.")); }
      });
      req.on("error", reject);
    });

    const stars = parseInt(body.stars, 10);
    if (!Number.isFinite(stars) || stars < MIN_STARS || stars > MAX_STARS) {
      return sendJson(res, 400, { error: `Stars amount must be between ${MIN_STARS} and ${MAX_STARS}.` });
    }

    const result = await callTelegram("createInvoiceLink", {
      title: "Support TawePro",
      description: "A small token of support for Ta'aruf Week's companion app. Donations fund hosting, Telegram Bot infrastructure, AI services, and future development.",
      payload: `donate:${Date.now()}:${stars}`,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "Support TawePro", amount: stars }]
    });

    const invoiceLink = result?.result;
    if (!invoiceLink) {
      return sendJson(res, 500, { error: "Failed to create the Stars invoice." });
    }
    return sendJson(res, 200, { link: invoiceLink });
  } catch (err) {
    console.error("donate error:", err?.message || err);
    return sendJson(res, 500, { error: err?.message || "Internal server error." });
  }
}
