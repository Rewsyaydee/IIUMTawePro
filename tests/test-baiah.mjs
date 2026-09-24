// Baiah takeover test + ops console.
//
// Usage (from the repo root):
//   node tests/test-baiah.mjs status
//   node tests/test-baiah.mjs activate [--no-notify]
//   node tests/test-baiah.mjs deactivate
//   node tests/test-baiah.mjs schedule "2026-09-24T21:00"   (Malaysia time)
//   node tests/test-baiah.mjs schedule --in 3               (now + 3 minutes)
//   node tests/test-baiah.mjs reset
//   node tests/test-baiah.mjs tick                          (ping production dispatcher once)
//   node tests/test-baiah.mjs ping                          (DM the test account a Mini App button)
//   node tests/test-baiah.mjs announce-test                 (send the announcement text to the test account)
//
// This uses the service role directly, so it works even before the mainboard
// UI is open. The client takeover reacts to the DB UPDATE via Realtime.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabaseRequest } from "../api/_lib/supabase.js";
import { getBotToken, sendTelegramMessage } from "../api/_lib/telegram-bot.js";

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
for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEB_APP_URL"]) {
  if (!process.env[key] && dotEnv[key]) process.env[key] = dotEnv[key];
}

const command = (process.argv[2] || "status").toLowerCase();
const TEST_TELEGRAM_ID = process.env.BAIAH_TEST_TELEGRAM_ID || "605353966";
const appUrl = (process.env.TELEGRAM_WEB_APP_URL || "https://iium-tawe-pro.vercel.app").replace(/\/$/, "");

function usage() {
  console.log(`Baiah takeover console — commands:
  status                              show current app_settings row
  progress                            announcement fan-out progress (claims sent)
  audience                            count active users by role (announcement reach)
  admin                               make telegram id ${TEST_TELEGRAM_ID} a mainboard admin
  notify on|off                       toggle the Telegram announcement for the next run
  lead <minutes>                      announcement lead time before the scheduled start
  song on|off|set <url>               custom music (default path: /audio/baiah.mp3)
  activate [--no-notify]              turn the takeover on now
  deactivate                          turn it off
  schedule "YYYY-MM-DDTHH:mm"         schedule (Malaysia time)
  schedule --in <minutes>             schedule relative to now
  unstick                             clear fan-out cursor + per-user claims (restart announcement)
  reset                               back to defaults (off, cleared schedule, cleared claims)
  tick                                invoke the production dispatcher once
  ping                                DM ${TEST_TELEGRAM_ID} a "Open TawePro" button
  announce-test                       send the announcement text to ${TEST_TELEGRAM_ID}`);
}

function toKlInput(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseKl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const date = new Date(hasZone ? withSeconds : `${withSeconds}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readSettings() {
  const rows = await supabaseRequest("/app_settings?id=eq.1&select=*&limit=1");
  return Array.isArray(rows) ? rows[0] : null;
}

async function patchSettings(patch) {
  const rows = await supabaseRequest("/app_settings?id=eq.1&select=*", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: { ...patch, updated_at: new Date().toISOString() }
  });
  return Array.isArray(rows) ? rows[0] : null;
}

function printSettings(row) {
  if (!row) {
    console.error("No app_settings row found. Run supabase/baiah-takeover.sql first.");
    process.exit(1);
  }
  console.log(JSON.stringify(row, null, 2));
  const state = row.is_baiah_active ? "LIVE" : row.baiah_start_at ? "SCHEDULED" : "off";
  console.log(`\nState: ${state}`);
  if (row.baiah_start_at) console.log(`Scheduled: ${new Date(row.baiah_start_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} MYT`);
  if (row.baiah_activated_at) console.log(`Activated: ${new Date(row.baiah_activated_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} MYT`);
  console.log(`Notify: ${row.baiah_notify !== false ? "on" : "off"} · Message: ${row.baiah_message}`);
}

async function clearBaiahSendState() {
  for (const filter of ["key=eq.baiah_announce_state"]) {
    try {
      await supabaseRequest(`/ops_settings?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    } catch {}
  }
  for (const filter of ["send_key=like.baiah-user:*", "send_key=like.baiah-chunk:*"]) {
    try {
      await supabaseRequest(`/notification_sends?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    } catch {}
  }
}

switch (command) {
  case "status": {
    printSettings(await readSettings());
    break;
  }

  case "progress": {
    const settings = await readSettings();
    const stateRows = await supabaseRequest("/ops_settings?key=eq.baiah_announce_state&select=value&limit=1");
    const state = Array.isArray(stateRows) && stateRows[0]?.value ? stateRows[0].value : {};
    const claims = await supabaseRequest("/notification_sends?send_key=like.baiah-user:*&select=send_key&limit=20000");
    const list = Array.isArray(claims) ? claims : [];
    const byEpoch = {};
    for (const row of list) {
      const parts = String(row.send_key).split(":");
      const epoch = parts.slice(1, -1).join(":");
      byEpoch[epoch] = (byEpoch[epoch] || 0) + 1;
    }
    const epoch = state.epoch || state.activatedAt || "—";
    console.log(`Takeover: ${settings?.is_baiah_active ? "LIVE" : "off"} · Announcement done: ${state.done === true} · Claimed/sent: ${list.length} · Epoch: ${epoch}`);
    console.log("Claims by epoch:", JSON.stringify(byEpoch, null, 2));
    break;
  }

  case "audience": {
    const rows = await supabaseRequest("/users?status=eq.active&select=role,telegram_id&limit=10000");
    const list = Array.isArray(rows) ? rows : [];
    const byRole = {};
    let reachable = 0;
    for (const row of list) {
      byRole[row.role] = (byRole[row.role] || 0) + 1;
      if (row.telegram_id) reachable++;
    }
    console.log(`Active users: ${list.length} · reachable via Telegram: ${reachable}`);
    console.log(JSON.stringify(byRole, null, 2));
    break;
  }

  case "admin": {
    const rows = await supabaseRequest(`/users?telegram_id=eq.${encodeURIComponent(TEST_TELEGRAM_ID)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { role: "mainboard", bureau: null, status: "active" }
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      console.error(`No user with telegram_id ${TEST_TELEGRAM_ID}. Open the Mini App once first.`);
      process.exit(1);
    }
    await supabaseRequest("/audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{
        actor_id: row.id,
        actor_name: row.name,
        action: "granted_mainboard_admin",
        table_name: "users",
        record_id: row.id,
        details: `Telegram ${TEST_TELEGRAM_ID} promoted to mainboard via test console.`
      }]
    });
    console.log(`${row.name} (${row.telegram_id}) is now mainboard.`);
    break;
  }

  case "notify": {
    const value = (process.argv[3] || "").toLowerCase();
    if (!["on", "off"].includes(value)) {
      console.error("Usage: notify on|off");
      process.exit(1);
    }
    const row = await patchSettings({ baiah_notify: value === "on", baiah_updated_by: "test console" });
    printSettings(row);
    break;
  }

  case "lead": {
    const minutes = Number(process.argv[3]);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60) {
      console.error("Usage: lead <minutes 0-60>");
      process.exit(1);
    }
    const row = await patchSettings({ baiah_notify_lead_minutes: Math.round(minutes), baiah_updated_by: "test console" });
    printSettings(row);
    break;
  }

  case "song": {
    const value = (process.argv[3] || "").toLowerCase();
    if (value === "on" || value === "off") {
      const row = await patchSettings({ baiah_song_enabled: value === "on", baiah_updated_by: "test console" });
      printSettings(row);
      break;
    }
    if (value === "set") {
      const url = process.argv[4];
      if (!url) {
        console.error("Usage: song set <url>   (or: song on | song off)");
        process.exit(1);
      }
      const row = await patchSettings({ baiah_song_url: url, baiah_song_enabled: true, baiah_updated_by: "test console" });
      printSettings(row);
      break;
    }
    console.error("Usage: song on | song off | song set <url>");
    process.exit(1);
    break;
  }

  case "activate": {
    const notifyOff = process.argv.includes("--no-notify");
    const row = await patchSettings({
      is_baiah_active: true,
      baiah_start_at: null,
      baiah_activated_at: new Date().toISOString(),
      baiah_updated_by: "test console",
      ...(notifyOff ? { baiah_notify: false } : {})
    });
    printSettings(row);
    console.log("\nTakeover LIVE. Anyone with the app open should get the overlay now.");
    break;
  }

  case "deactivate": {
    const row = await patchSettings({ is_baiah_active: false, baiah_start_at: null, baiah_updated_by: "test console" });
    printSettings(row);
    break;
  }

  case "schedule": {
    const arg = process.argv[3];
    let target = null;
    if (arg === "--in") {
      const minutes = Number(process.argv[4]);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        console.error("Usage: schedule --in <minutes>");
        process.exit(1);
      }
      target = new Date(Date.now() + minutes * 60000);
      console.log(`Target: ${toKlInput(target)} (Malaysia time)`);
    } else if (arg) {
      target = parseKl(arg);
    }
    if (!target) {
      console.error('Usage: schedule "YYYY-MM-DDTHH:mm"  or  schedule --in <minutes>');
      process.exit(1);
    }
    const row = await patchSettings({
      is_baiah_active: false,
      baiah_start_at: target.toISOString(),
      baiah_updated_by: "test console"
    });
    printSettings(row);
    console.log(`\nScheduled. The pg_cron job (or the dispatcher, via tick / the pinger) will flip it on.`);
    break;
  }

  case "unstick": {
    await clearBaiahSendState();
    const row = await readSettings();
    printSettings(row);
    console.log("\nFan-out cursor and per-user claims cleared. The next dispatcher hit restarts the announcement.");
    break;
  }

  case "reset": {
    const row = await patchSettings({
      is_baiah_active: false,
      baiah_start_at: null,
      baiah_activated_at: null,
      baiah_message: "BAIAH 2026: WELCOME TO IIUM",
      baiah_notify: true,
      baiah_notify_lead_minutes: 2,
      baiah_song_url: null,
      baiah_song_enabled: false,
      baiah_skip_enabled: true,
      baiah_updated_by: "test reset"
    });
    await clearBaiahSendState();
    printSettings(row);
    console.log("\nReset complete (announcement cursor + claims cleared too).");
    break;
  }

  case "tick": {
    const url = `${appUrl}/api/cron/notifications`;
    console.log(`GET ${url}`);
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    console.log(`HTTP ${response.status}`);
    console.log(JSON.stringify(payload?.baiah ?? payload, null, 2));
    break;
  }

  case "ping": {
    const token = getBotToken();
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN missing.");
      process.exit(1);
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TEST_TELEGRAM_ID,
        text: "🎉 <b>Baiah takeover test</b>\n\nOpen TawePro and keep it in the foreground — we'll flip the switch next.",
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🎉 Open TawePro", web_app: { url: appUrl } }]] }
      })
    });
    const payload = await response.json();
    if (!payload.ok) {
      console.error(`Send failed: ${payload.description}`);
      process.exit(1);
    }
    console.log(`Sent to ${TEST_TELEGRAM_ID}.`);
    break;
  }

  case "announce-test": {
    const text = `🎊 <b>BAIAH 2026 IS LIVE!</b>\n\n<b>WELCOME TO IIUM</b> 🎉\nOpen TawePro now for the celebration!\n\n👉 ${appUrl}`;
    await sendTelegramMessage(TEST_TELEGRAM_ID, text);
    console.log(`Announcement sent to ${TEST_TELEGRAM_ID}.`);
    break;
  }

  default:
    usage();
    process.exit(1);
}
