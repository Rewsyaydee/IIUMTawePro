import { readJson, sendJson } from "../_lib/auth-utils.js";
import { requireActiveAppUser } from "../_lib/wellbeing-utils.js";
import { createAuditLog, supabaseRequest } from "../_lib/supabase.js";

const SCHEDULE_SELECT = "id,date,day,week,scheduled_start_time,scheduled_end_time,title,venue,tag,audience,description,is_live,notify_minutes_before,responsible_bureau,readiness_status,pre_session_tasks,venue_code";

function mapScheduleItem(row) {
  return {
    id: row.id,
    date: row.date,
    day: row.day,
    week: row.week,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    title: row.title,
    venue: row.venue,
    tag: row.tag,
    audience: row.audience,
    description: row.description || undefined,
    isLive: row.is_live,
    notifyMinutesBefore: row.notify_minutes_before,
    responsibleBureau: row.responsible_bureau || undefined,
    readinessStatus: row.readiness_status,
    preSessionTasks: Array.isArray(row.pre_session_tasks) ? row.pre_session_tasks : [],
    venueCode: row.venue_code || undefined
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}&order=date.asc,scheduled_start_time.asc`);
      const items = (Array.isArray(rows) ? rows : []).map(mapScheduleItem);
      return sendJson(res, 200, { items });
    }

    const user = await requireActiveAppUser(req, res);
    if (!user) return;
    if (user.role !== "mainboard") {
      return sendJson(res, 403, { error: "Mainboard only." });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body.title || !body.date || !body.scheduledStartTime || !body.scheduledEndTime) {
        return sendJson(res, 400, { error: "Title, date, start and end time are required." });
      }

      const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: [{
          date: body.date,
          day: body.day || "",
          week: body.week || "event_week",
          scheduled_start_time: body.scheduledStartTime,
          scheduled_end_time: body.scheduledEndTime,
          title: body.title,
          venue: body.venue || "TBC",
          tag: body.tag || "Programme",
          audience: body.audience || "All",
          description: body.description || null,
          is_live: false,
          notify_minutes_before: body.notifyMinutesBefore || 30,
          responsible_bureau: body.responsibleBureau || null,
          readiness_status: "pending",
          pre_session_tasks: JSON.stringify(body.preSessionTasks || []),
          venue_code: body.venueCode || null
        }]
      });

      const item = Array.isArray(rows) ? rows[0] : undefined;
      if (!item) return sendJson(res, 500, { error: "Failed to create schedule item." });

      await createAuditLog({
        actor: user,
        action: "created_schedule_item",
        tableName: "schedule_items",
        recordId: item.id,
        details: `Schedule item "${item.title}" created for ${item.date}.`
      });

      return sendJson(res, 201, { item: mapScheduleItem(item) });
    }

    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Schedule failed", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
