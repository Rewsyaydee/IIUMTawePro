// Renders the Preptech POA briefing section with sample Sunday 13 Sep tasks and
// sends it to the tester chat so the rich layout can be eyeballed.
//
// Usage: node tests/test-poa-briefing.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeBriefing } from "../api/_lib/briefing.js";

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

const user = { id: "u-test", name: "Syedi Preptech", role: "committee", bureau: "PrepTech" };

const tasks = [
  { id: "t1", bureau: "PrepTech", title: "OR Opening & Inspection", description: "Open & check Operations Room (OR), clean up OR, inspect other bureaus' ORs", status: "todo", due_time: "08:00:00", assigned_to: "PIC OR", assigned_to_ids: [] },
  { id: "t2", bureau: "PrepTech", title: "POA Presentation Prep", description: "Prepare for POA presentation", status: "todo", due_time: "09:00:00", assigned_to: "5 persons", assigned_to_ids: [] },
  { id: "t3", bureau: "PrepTech", title: "POA Presentation", description: "POA presentation", status: "todo", due_time: "10:30:00", assigned_to: "ALL", assigned_to_ids: [] },
  { id: "t4", bureau: "PrepTech", title: "KYKM Voice Recording & Storyboard", description: "Voice recording KYKM and finalize storyboard (until 4:00 PM)", status: "todo", due_time: "14:00:00", assigned_to: "5 persons", assigned_to_ids: [] },
  { id: "t5", bureau: "PrepTech", title: "Store Opening & Inventory Sort", description: "Open store, observe item claims, pick up Preptech items, sort inventory", status: "todo", due_time: "15:00:00", assigned_to: "ALL", assigned_to_ids: [] }
];

const dayEvents = [
  { id: "e1", title: "Mahallah Registration (International Students)", venue: "Wadi Budi", scheduled_start_time: "09:00", scheduled_end_time: "13:00", is_concurrent: false, tag: "Registration" }
];

const composed = composeBriefing({ user, dateIso: "2026-09-13", dayEvents, tasks });
if (!composed) {
  console.error("composeBriefing returned null");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/sendRichMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chatId, rich_message: composed.richMessage })
});
const payload = await response.json();
console.log(`sendRichMessage -> ok=${payload.ok}${payload.description ? ` | ${payload.description}` : ""}`);
console.log("Blocks:", composed.richMessage.blocks.length);
process.exit(payload.ok ? 0 : 1);
