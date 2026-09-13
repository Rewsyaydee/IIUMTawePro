// Committee daily morning briefing builder.
//
// One short, actionable message per person generated from the REAL schedule
// (schedule_items for the given real date) plus that person's own tasks due
// that day (poa_tasks assigned to them). Concurrent sessions are shown in the
// same time-ordered flow with a "(Concurrent)" note; full-day ambient rows
// (booth/exhibition) collapse to a single "Also today" line; breaks/prayers
// are skipped. Long days are capped so the message stays short — the full
// programme lives in the Mini App (/schedule, /tasks).

import { supabaseRequest } from "./supabase.js";
import {
  richButton,
  richButtonsRow,
  richHeading,
  richList,
  richParagraph
} from "./rich-messages.js";
import { getAppBaseUrl } from "./telegram-bot.js";
import { buildPoaBriefingBlocks, buildPoaBriefingFallback, bureauTagline } from "./poa-notify.js";

const MAX_EVENTS = 8;
const MAX_TASKS = 5;

const SKIP_TAGS = new Set(["Break", "Prayer", "Departure"]);

function prettyDate(dateIso) {
  const d = new Date(`${dateIso}T00:00:00`);
  return d.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" });
}

function timeLabel(item) {
  const start = String(item.scheduled_start_time || "").slice(0, 5);
  const end = String(item.scheduled_end_time || "").slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

export async function fetchDaySchedule(dateIso) {
  const rows = await supabaseRequest(
    `/schedule_items?date=eq.${encodeURIComponent(dateIso)}&select=id,title,venue,venue_code,scheduled_start_time,scheduled_end_time,is_concurrent,tag,track&order=scheduled_start_time.asc`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function fetchUserTasksDue(dateIso, user) {
  // Assigned via assigned_to_ids (uuid[]) or legacy assigned_to display name.
  // PIC-label tasks (no individual assignees) reach every member of that bureau.
  const rows = await supabaseRequest(
    `/poa_tasks?due_date=eq.${encodeURIComponent(dateIso)}&status=neq.done&select=id,bureau,title,description,status,due_time,assigned_to,assigned_to_ids&order=due_time.asc&limit=100`
  );
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((task) => {
    const ids = Array.isArray(task.assigned_to_ids) ? task.assigned_to_ids.map(String) : [];
    if (ids.includes(String(user.id))) return true;
    const assignedText = String(task.assigned_to || "").toLowerCase();
    if (assignedText.includes(String(user.name || "").toLowerCase())) return true;
    if (user.bureau && task.bureau === user.bureau && ids.length === 0) return true;
    return false;
  });
}

// Returns { richMessage, fallbackText } or null when there is nothing to report.
export function composeBriefing({ user, dateIso, dayEvents, tasks }) {
  const firstName = String(user.name || "there").split(" ")[0];
  const main = dayEvents.filter((e) => !e.is_concurrent && !SKIP_TAGS.has(e.tag));
  const concurrent = dayEvents.filter((e) => e.is_concurrent && e.tag !== "Exhibition");
  const ambient = dayEvents.filter((e) => e.is_concurrent && e.tag === "Exhibition");
  const events = [...main, ...concurrent].slice(0, MAX_EVENTS);
  const eventTotal = main.length + concurrent.length;
  const truncatedEvents = eventTotal > MAX_EVENTS;

  // Bureau POA slots (PIC-label tasks, no individual assignees) render in the
  // operational POA card style; everything else stays in the personal list.
  const hasTagline = Boolean(bureauTagline(user.bureau));
  const poaTasks = hasTagline
    ? tasks.filter((t) => t.bureau === user.bureau && !(Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.length > 0))
    : [];
  const poaIds = new Set(poaTasks.map((t) => t.id));
  const personalTasks = tasks.filter((t) => !poaIds.has(t.id));

  if (events.length === 0 && tasks.length === 0 && ambient.length === 0) return null;

  // Group same-start-time items into concurrent clusters for display.
  const clusters = [];
  for (const event of events) {
    const prev = clusters[clusters.length - 1];
    const sameStart = prev && prev.start === event.scheduled_start_time;
    if (sameStart) {
      prev.items.push(event);
    } else {
      clusters.push({ start: event.scheduled_start_time, items: [event] });
    }
  }

  const blocks = [
    richHeading(`☀️ Good morning, ${firstName}!`),
    richParagraph(`Here's what to expect today — ${prettyDate(dateIso)}:`)
  ];

  const fallbackLines = [`☀️ <b>Good morning, ${firstName}!</b>`, `Here's what to expect today — ${prettyDate(dateIso)}:`];

  if (clusters.length > 0) {
    blocks.push(richHeading("Today's programme", 3));
    fallbackLines.push("", "📅 <b>Today's programme</b>");
    clusters.forEach((cluster, i) => {
      cluster.items.forEach((event) => {
        const concurrentNote = cluster.items.length > 1 ? "  <i>(Concurrent)</i>" : "";
        blocks.push(richParagraph(`${i + 1}. ${event.title}  ${cluster.items.length > 1 ? "(Concurrent)" : ""}`));
        blocks.push(richParagraph(`   📍 ${event.venue || "TBC"} · ${timeLabel(event)}`));
        fallbackLines.push(`${i + 1}. ${event.title}${concurrentNote}\n   📍 ${event.venue || "TBC"} · ${timeLabel(event)}`);
      });
    });
    if (truncatedEvents) {
      blocks.push(richParagraph(`…and ${eventTotal - MAX_EVENTS} more. Open the full schedule below.`));
      fallbackLines.push(`…and ${eventTotal - MAX_EVENTS} more. Open the full schedule below.`);
    }
  }

  if (ambient.length > 0) {
    const ambientTitles = ambient.map((a) => a.title).join("; ");
    blocks.push(richParagraph(`Also today: ${ambientTitles} (${ambient[0].venue || "All day"}).`));
    fallbackLines.push(`Also today: ${ambientTitles} (${ambient[0].venue || "All day"}).`);
  }

  if (poaTasks.length > 0) {
    blocks.push(...buildPoaBriefingBlocks({ bureau: user.bureau, dateLabel: prettyDate(dateIso), tasks: poaTasks }));
    fallbackLines.push("", buildPoaBriefingFallback({ bureau: user.bureau, dateLabel: prettyDate(dateIso), tasks: poaTasks }));
  }

  if (personalTasks.length > 0) {
    const visibleTasks = personalTasks.slice(0, MAX_TASKS);
    blocks.push(richHeading("Your tasks today", 3));
    blocks.push(richList(visibleTasks.map((task) => ({
      blocks: [
        richParagraph([{ type: "bold", text: task.title }]),
        richParagraph(`🏢 ${task.bureau}${task.due_time ? ` · ⏰ ${String(task.due_time).slice(0, 5)}` : ""}`)
      ],
      hasCheckbox: true,
      isChecked: false
    }))));
    fallbackLines.push("", "✅ <b>Your tasks today</b>");
    for (const task of visibleTasks) {
      fallbackLines.push(`• ${task.title} (${task.bureau}${task.due_time ? `, ${String(task.due_time).slice(0, 5)}` : ""})`);
    }
    if (personalTasks.length > MAX_TASKS) {
      blocks.push(richParagraph(`…and ${personalTasks.length - MAX_TASKS} more in /tasks.`));
      fallbackLines.push(`…and ${personalTasks.length - MAX_TASKS} more in /tasks.`);
    }
  } else if (clusters.length === 0 && ambient.length === 0 && poaTasks.length === 0) {
    return null;
  }

  // POA section carries its own "Open TawePro & Check In" button.
  if (poaTasks.length > 0) {
    blocks.push(richButtonsRow([richButton({ text: "📅 Open Schedule", webApp: `${getAppBaseUrl()}/schedule` })]));
  } else {
    blocks.push(
      richButtonsRow([richButton({ text: "📋 Open Tasks", webApp: `${getAppBaseUrl()}/tasks` })]),
      richButtonsRow([richButton({ text: "📅 Open Schedule", webApp: `${getAppBaseUrl()}/schedule` })])
    );
  }
  fallbackLines.push("", "👉 Open TawePro to manage tasks: t.me/iiumtaweprobot");

  return {
    richMessage: { blocks },
    fallbackText: fallbackLines.join("\n")
  };
}
