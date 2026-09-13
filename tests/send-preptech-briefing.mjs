// One-off: send today's morning briefing (with Preptech POA table) to every
// active PrepTech member, mirroring the production cron exactly.
//
// Usage: node tests/send-preptech-briefing.mjs [YYYY-MM-DD]
//   - respects committee_prefs.briefing === 'off'
//   - claims briefing:{userId}:{date} in notification_sends before sending,
//     so the cron never double-sends later today
//   - skips members already claimed

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabaseRequest } from "../api/_lib/supabase.js";
import { composeBriefing, fetchDaySchedule, fetchUserTasksDue } from "../api/_lib/briefing.js";
import { sendRichWithFallback } from "../api/_lib/rich-messages.js";

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
for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "TELEGRAM_BOT_TOKEN"]) {
  if (!process.env[key] && dotEnv[key]) process.env[key] = dotEnv[key];
}

const dateIso = process.argv[2] || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
console.log(`Broadcasting PrepTech briefing for ${dateIso}...`);

const members = await supabaseRequest(
  `/users?bureau=eq.PrepTech&status=eq.active&role=in.(committee,head)&select=id,telegram_id,name,role,bureau,committee_prefs&limit=200`
);
if (!Array.isArray(members) || members.length === 0) {
  console.error("No PrepTech members found.");
  process.exit(1);
}

async function claimSend(key) {
  const rows = await supabaseRequest("/notification_sends?on_conflict=send_key&select=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: [{ send_key: key, sent_at: new Date().toISOString() }]
  });
  return Array.isArray(rows) && rows.length > 0;
}

const dayEvents = await fetchDaySchedule(dateIso);
console.log(`Schedule items today: ${dayEvents.length}`);

let sent = 0;
let skippedPrefs = 0;
let skippedClaimed = 0;
let failed = 0;

for (const member of members) {
  const prefs = member.committee_prefs && typeof member.committee_prefs === "object" ? member.committee_prefs : {};
  if (prefs.briefing === "off") {
    skippedPrefs++;
    console.log(`- skip (briefing off): ${member.name}`);
    continue;
  }
  const claimed = await claimSend(`briefing:${member.id}:${dateIso}`);
  if (!claimed) {
    skippedClaimed++;
    console.log(`- skip (already sent): ${member.name}`);
    continue;
  }
  try {
    const tasks = await fetchUserTasksDue(dateIso, member);
    const composed = composeBriefing({ user: member, dateIso, dayEvents, tasks });
    if (!composed) {
      console.log(`- skip (nothing today): ${member.name}`);
      continue;
    }
    const outcome = await sendRichWithFallback(String(member.telegram_id), composed);
    if (outcome.used === "none") {
      failed++;
      console.log(`- FAILED: ${member.name}`);
    } else {
      sent++;
      console.log(`- sent (${outcome.used}): ${member.name}`);
    }
  } catch (error) {
    failed++;
    console.log(`- FAILED: ${member.name} | ${error?.message || error}`);
  }
}

console.log(`\nDone. sent=${sent} skippedPrefs=${skippedPrefs} skippedClaimed=${skippedClaimed} failed=${failed} total=${members.length}`);
process.exit(failed > 0 ? 1 : 0);
