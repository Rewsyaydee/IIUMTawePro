import { readJson, sendJson } from "../_lib/auth-utils.js";
import {
  canManageReports,
  insertReport,
  listReportsForUser,
  mapWellbeingReport,
  requireActiveAppUser,
  updateReportStatus,
  validateReportInput
} from "../_lib/wellbeing-utils.js";

export default async function handler(req, res) {
  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const rows = await listReportsForUser(user);
      const reports = (Array.isArray(rows) ? rows : []).map(mapWellbeingReport);
      return sendJson(res, 200, { reports });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const error = validateReportInput(body);
      if (error) return sendJson(res, 400, { error });

      const row = await insertReport({
        user,
        studentName: body.studentName.trim(),
        phone: body.phone.trim(),
        category: body.category,
        notes: body.notes.trim()
      });

      if (!row) return sendJson(res, 500, { error: "Failed to create report." });
      return sendJson(res, 201, { report: mapWellbeingReport(row) });
    }

    if (req.method === "PATCH") {
      if (!canManageReports(user)) {
        return sendJson(res, 403, { error: "Only Welfare bureau and mainboard can update reports." });
      }

      const body = await readJson(req);
      const { id, status } = body;
      if (!id) return sendJson(res, 400, { error: "Report ID is required." });
      if (!["responded", "resolved", "escalated"].includes(status)) {
        return sendJson(res, 400, { error: "Invalid status." });
      }

      const row = await updateReportStatus({ id, status, user });
      if (!row) return sendJson(res, 404, { error: "Report not found." });
      return sendJson(res, 200, { report: mapWellbeingReport(row) });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Wellbeing reports failed", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
