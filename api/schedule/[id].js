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
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;
    if (user.role !== "mainboard") {
      return sendJson(res, 403, { error: "Mainboard only." });
    }

    const { id } = req.query;
    if (!id) return sendJson(res, 400, { error: "Schedule item ID is required." });

    const body = await readJson(req);
    const patch = {};
    if (typeof body.isLive === "boolean") patch.is_live = body.isLive;
    if (body.readinessStatus) patch.readiness_status = body.readinessStatus;
    if (Object.keys(patch).length === 0) {
      return sendJson(res, 400, { error: "No update fields provided." });
    }

    patch.updated_at = new Date().toISOString();
    const rows = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(id)}&select=${SCHEDULE_SELECT}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: patch
    });

    const item = Array.isArray(rows) ? rows[0] : undefined;
    if (!item) return sendJson(res, 404, { error: "Schedule item not found." });

    await createAuditLog({
      actor: user,
      action: body.isLive ? "published_schedule_item" : "updated_schedule_item",
      tableName: "schedule_items",
      recordId: id,
      details: `Schedule item "${item.title}" ${body.isLive ? "published" : "updated"}.`
    });

    return sendJson(res, 200, { item: mapScheduleItem(item) });
  } catch (error) {
    console.error("Schedule update failed", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
