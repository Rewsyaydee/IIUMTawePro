import { createAuditLog, hasSupabaseServerConfig, SupabaseRequestError } from "../../../_lib/supabase.js";
import { decorateAttendanceProof, isSpecialTaskUser, requireActiveAppUser, updateAttendanceReview } from "../../../_lib/attendance-utils.js";
import { isProductionRuntime, readJson, sendJson } from "../../../_lib/auth-utils.js";

const REVIEW_STATUSES = new Set(["sent_to_mainboard", "rejected"]);

function proofIdFromRequest(req) {
  if (req.query?.id) return String(req.query.id);
  const pathname = new URL(req.url || "", "https://tawepro.local").pathname;
  const match = pathname.match(/\/api\/attendance\/proofs\/([^/]+)\/review$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (isProductionRuntime() && !hasSupabaseServerConfig()) {
    return sendJson(res, 503, { error: "Supabase server configuration is missing." });
  }

  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;

    if (!isSpecialTaskUser(user)) {
      return sendJson(res, 403, { error: "Only Special Task can review attendance proof." });
    }

    const proofId = proofIdFromRequest(req);
    if (!proofId) return sendJson(res, 400, { error: "Missing proof id." });

    const body = await readJson(req);
    const status = String(body.status || "");
    if (!REVIEW_STATUSES.has(status)) {
      return sendJson(res, 400, { error: "Review status must be sent_to_mainboard or rejected." });
    }

    const row = await updateAttendanceReview({
      proofId,
      reviewerId: user.id,
      status
    });
    if (!row) return sendJson(res, 404, { error: "Attendance proof not found." });

    await createAuditLog({
      actor: user,
      action: status === "sent_to_mainboard" ? "Verified attendance proof" : "Rejected attendance proof",
      tableName: "attendance_proofs",
      recordId: row.id,
      details: `${user.name} changed ${row.committee_name} proof to ${status}.`
    });

    return sendJson(res, 200, {
      status: "reviewed",
      proof: await decorateAttendanceProof(row)
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      console.error("Attendance review API failed", error.status, error.payload);
      return sendJson(res, 502, { error: "Supabase attendance review failed." });
    }
    console.error("Attendance review API failed", error);
    return sendJson(res, 400, { error: "Invalid attendance review request." });
  }
}
