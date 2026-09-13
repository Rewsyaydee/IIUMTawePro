// Preptech POA briefing section builder.
//
// Renders a bureau's daily Plan of Action (poa_tasks slots) in the operational
// card style:
//   🔔 PREPTECH POA REMINDER · #techkitojangeypecoh
//   📅 Sunday, 13 September 2026
//   • 08:00 AM — OR Opening & Inspection
//       • bullet 1
//       • bullet 2
//       👥 PIC: PIC OR · 📍 Scheduled
//   [Open TawePro & Check In]
//
// Used by the 07:00 morning briefing (briefing-only delivery: POA slots are
// seeded with notify_minutes_before = 0, so no per-slot pings are sent).

import { getAppBaseUrl } from "./telegram-bot.js";
import { richButton, richButtonsRow, richHeading, richParagraph, richTable } from "./rich-messages.js";

export const BUREAU_TAGLINES = {
  PrepTech: "#techkitojangeypecoh"
};

export function bureauTagline(bureau) {
  return BUREAU_TAGLINES[bureau] || "";
}

export function formatPoaTime(value) {
  const [hRaw, mRaw] = String(value || "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (!Number.isFinite(h)) return String(value || "");
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")} ${suffix}`;
}

const STATUS_LABELS = {
  todo: "Scheduled",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done"
};

export function poaStatusLabel(status) {
  return STATUS_LABELS[status] || "Scheduled";
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function taskBullets(task) {
  return String(task.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildPoaBriefingBlocks({ bureau, dateLabel, tasks }) {
  const tagline = bureauTagline(bureau);
  const heading = tagline
    ? `🔔 ${String(bureau).toUpperCase()} POA REMINDER · ${tagline}`
    : `🔔 ${bureau} POA`;

  // Compact 3-column table: Time | Task (bullets inline) | PIC.
  // Full details always live in /tasks; long task cells are truncated.
  const rows = [
    [
      { text: "Time", is_header: true },
      { text: "Task", is_header: true },
      { text: "PIC", is_header: true }
    ],
    ...tasks.map((task) => {
      const bullets = taskBullets(task);
      let detail = bullets.join(" • ");
      if (detail.length > 160) detail = `${detail.slice(0, 157)}…`;
      const taskCell = detail
        ? { text: [{ type: "bold", text: task.title }, ` — ${detail}`] }
        : { text: [{ type: "bold", text: task.title }] };
      return [
        { text: formatPoaTime(task.due_time) },
        taskCell,
        { text: task.assigned_to || "ALL" }
      ];
    })
  ];

  return [
    richHeading(heading),
    richParagraph(`📅 ${dateLabel}`),
    richTable(rows, { compact: true, bordered: true, striped: true }),
    richButtonsRow([richButton({ text: "Open TawePro & Check In", webApp: `${getAppBaseUrl()}/tasks` })])
  ];
}

export function buildPoaBriefingFallback({ bureau, dateLabel, tasks }) {
  const tagline = bureauTagline(bureau);
  const lines = [
    `🔔 <b>${escapeHtml(String(bureau).toUpperCase())} POA REMINDER</b>${tagline ? ` | <code>${escapeHtml(tagline)}</code>` : ""}`,
    `📅 <b>${escapeHtml(dateLabel)}</b>`,
    ""
  ];
  for (const task of tasks) {
    lines.push(`<b>${escapeHtml(formatPoaTime(task.due_time))} — ${escapeHtml(task.title)}</b>`);
    for (const bullet of taskBullets(task)) lines.push(`• ${escapeHtml(bullet)}`);
    lines.push(`👥 PIC: ${escapeHtml(task.assigned_to || "ALL")} · 📍 ${poaStatusLabel(task.status)}`, "");
  }
  lines.push("👉 Open TawePro & check in: t.me/iiumtaweprobot");
  return lines.join("\n");
}
