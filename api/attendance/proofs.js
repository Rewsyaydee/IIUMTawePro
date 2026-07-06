import {
  createAuditLog,
  hasSupabaseServerConfig,
  SupabaseRequestError
} from "../_lib/supabase.js";
import {
  decorateAttendanceProof,
  decorateAttendanceProofs,
  findProofForUserDate,
  insertAttendanceProof,
  isCommitteeUser,
  listAttendanceRowsForUser,
  malaysiaDateKey,
  requireActiveAppUser,
  resubmitRejectedAttendanceProof,
  uploadAttendanceSelfie
} from "../_lib/attendance-utils.js";
import { isProductionRuntime, readJson, sendJson } from "../_lib/auth-utils.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (isProductionRuntime() && !hasSupabaseServerConfig()) {
    return sendJson(res, 503, { error: "Supabase server configuration is missing." });
  }

  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const rows = await listAttendanceRowsForUser(user);
      return sendJson(res, 200, {
        proofs: await decorateAttendanceProofs(rows)
      });
    }

    if (!isCommitteeUser(user) || !user.bureau) {
      return sendJson(res, 403, { error: "Only committee members can submit attendance proof." });
    }

    const body = await readJson(req);
    const date = body.date || malaysiaDateKey();
    const existing = await findProofForUserDate(user.id, date);
    if (existing && existing.status !== "rejected") {
      return sendJson(res, 409, {
        error: "Attendance proof already submitted for today.",
        proof: await decorateAttendanceProof(existing)
      });
    }

    const selfiePath = await uploadAttendanceSelfie({
      user,
      date,
      selfieDataUrl: body.selfieDataUrl
    });

    const row = existing
      ? await resubmitRejectedAttendanceProof({ id: existing.id, selfiePath })
      : await insertAttendanceProof({ user, date, selfiePath });

    if (!row) return sendJson(res, 502, { error: "Unable to save attendance proof." });

    await createAuditLog({
      actor: user,
      action: existing ? "Resubmitted attendance proof" : "Submitted attendance proof",
      tableName: "attendance_proofs",
      recordId: row.id,
      details: `${user.name} submitted punch card proof for ${date}.`
    });

    return sendJson(res, 200, {
      status: "submitted",
      proof: await decorateAttendanceProof(row)
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      console.error("Attendance proof API failed", error.status, error.payload);
      return sendJson(res, 502, { error: "Supabase attendance request failed." });
    }
    console.error("Attendance proof API failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid attendance request." });
  }
}
