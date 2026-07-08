import { readJson, sendJson } from "../_lib/auth-utils.js";
import { requireActiveAppUser } from "../_lib/wellbeing-utils.js";
import { createAuditLog, supabaseRequest } from "../_lib/supabase.js";
import { broadcastToTargets } from "../_lib/telegram-bot.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;
    if (user.role !== "mainboard") {
      return sendJson(res, 403, { error: "Mainboard only." });
    }

    const body = await readJson(req);
    if (!body.title || !body.body) {
      return sendJson(res, 400, { error: "Title and body are required." });
    }

    const text = `<b>${body.title}</b>\n\n${body.body}`;
    const { sent, failed, queued } = await broadcastToTargets({
      targetRole: body.targetRole || "all",
      targetBureau: body.targetBureau || "all",
      text
    });

    const rows = await supabaseRequest("/notifications?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: [{
        target_role: body.targetRole || "all",
        target_bureau: body.targetBureau || "all",
        title: body.title,
        body: body.body,
        type: body.type || "official",
        send_status: failed > 0 ? "sent" : "sent",
        sent_at: new Date().toISOString(),
        sent_by: user.id
      }]
    });

    await createAuditLog({
      actor: user,
      action: "sent_official_notice",
      tableName: "notifications",
      recordId: Array.isArray(rows) ? rows[0]?.id : undefined,
      details: `Notice "${body.title}" sent to ${queued} users (${sent} delivered, ${failed} failed).`
    });

    return sendJson(res, 200, {
      queued,
      sent,
      failed,
      notificationId: Array.isArray(rows) ? rows[0]?.id : undefined
    });
  } catch (error) {
    console.error("Notification send failed", error);
    return sendJson(res, 500, { error: "Failed to send notification." });
  }
}
