import { sendJson, verifyAppSessionFromRequest } from "./auth-utils.js";
import { createSignedStorageUrl, getUserById, supabaseRequest, uploadStorageObject } from "./supabase.js";

export const ATTENDANCE_BUCKET = "attendance-selfies";

const PROOF_SELECT = "id,date,user_id,telegram_id,committee_name,bureau,selfie_path,submitted_at,status,reviewed_by,reviewed_at";

export async function requireActiveAppUser(req, res) {
  const session = verifyAppSessionFromRequest(req);
  if (!session.ok) {
    sendJson(res, 401, { error: session.reason });
    return null;
  }

  const user = await getUserById(session.claims.app_user_id);
  if (!user) {
    sendJson(res, 403, { error: "Active app user not found." });
    return null;
  }

  return user;
}

export function isCommitteeUser(user) {
  return user?.role === "committee" || user?.role === "head";
}

export function isSpecialTaskUser(user) {
  return isCommitteeUser(user) && user.bureau === "Special Task";
}

export function isMainboardUser(user) {
  return user?.role === "mainboard";
}

export function malaysiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseImageDataUrl(value = "") {
  const match = String(value).match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new Error("Selfie must be a PNG, JPG, or WebP image.");
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (buffer.length === 0) throw new Error("Selfie image is empty.");
  if (buffer.length > 4 * 1024 * 1024) throw new Error("Selfie image must be under 4 MB.");

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return { buffer, extension, mimeType };
}

export function mapAttendanceProof(row, selfieDataUrl = "") {
  return {
    id: row.id,
    date: row.date,
    userId: row.user_id,
    telegramId: row.telegram_id,
    committeeName: row.committee_name,
    bureau: row.bureau,
    selfieDataUrl,
    submittedAt: row.submitted_at,
    status: row.status,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined
  };
}

export async function decorateAttendanceProof(row) {
  const signedUrl = row.selfie_path
    ? await createSignedStorageUrl({
        bucket: ATTENDANCE_BUCKET,
        path: row.selfie_path,
        expiresIn: 60 * 15
      })
    : "";
  return mapAttendanceProof(row, signedUrl);
}

export async function decorateAttendanceProofs(rows) {
  return Promise.all((Array.isArray(rows) ? rows : []).map((row) => decorateAttendanceProof(row)));
}

export async function findProofForUserDate(userId, date) {
  const rows = await supabaseRequest(
    `/attendance_proofs?user_id=eq.${encodeURIComponent(userId)}&date=eq.${encodeURIComponent(date)}&select=${PROOF_SELECT}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function listAttendanceRowsForUser(user) {
  let path = `/attendance_proofs?select=${PROOF_SELECT}&order=submitted_at.desc`;
  if (isMainboardUser(user)) {
    path += "&status=eq.sent_to_mainboard";
  } else if (!isSpecialTaskUser(user)) {
    path += `&user_id=eq.${encodeURIComponent(user.id)}`;
  }
  return supabaseRequest(path);
}

export async function uploadAttendanceSelfie({ user, date, selfieDataUrl }) {
  const image = parseImageDataUrl(selfieDataUrl);
  const objectPath = `${user.id}/${date}-${Date.now()}.${image.extension}`;
  await uploadStorageObject({
    bucket: ATTENDANCE_BUCKET,
    path: objectPath,
    body: image.buffer,
    contentType: image.mimeType
  });
  return objectPath;
}

export async function insertAttendanceProof({ user, date, selfiePath }) {
  const rows = await supabaseRequest(`/attendance_proofs?select=${PROOF_SELECT}`, {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: [
      {
        date,
        user_id: user.id,
        telegram_id: user.telegramId,
        committee_name: user.name,
        bureau: user.bureau,
        selfie_path: selfiePath,
        status: "pending_review"
      }
    ]
  });
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function resubmitRejectedAttendanceProof({ id, selfiePath }) {
  const rows = await supabaseRequest(`/attendance_proofs?id=eq.${encodeURIComponent(id)}&select=${PROOF_SELECT}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: {
      selfie_path: selfiePath,
      status: "pending_review",
      submitted_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null
    }
  });
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function updateAttendanceReview({ proofId, reviewerId, status }) {
  const rows = await supabaseRequest(`/attendance_proofs?id=eq.${encodeURIComponent(proofId)}&select=${PROOF_SELECT}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: {
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    }
  });
  return Array.isArray(rows) ? rows[0] : undefined;
}
