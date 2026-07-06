import type { AttendanceProof, AttendanceStatus } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type AttendanceListResponse = {
  proofs: AttendanceProof[];
  error?: string;
};

type AttendanceProofResponse = {
  proof: AttendanceProof;
  error?: string;
};

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

function sessionHeaders(): Record<string, string> {
  const token = getStoredSupabaseJwt();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listAttendanceProofs() {
  const response = await fetch(`${apiBase()}/api/attendance/proofs`, {
    headers: sessionHeaders()
  });
  const payload = (await response.json()) as AttendanceListResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load attendance proofs.");
  }
  return payload.proofs;
}

export async function submitAttendanceProof(selfieDataUrl: string) {
  const response = await fetch(`${apiBase()}/api/attendance/proofs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ selfieDataUrl })
  });
  const payload = (await response.json()) as AttendanceProofResponse;
  if (!response.ok) {
    if (response.status === 409 && payload.proof) return payload.proof;
    throw new Error(payload.error || "Unable to submit attendance proof.");
  }
  return payload.proof;
}

export async function reviewAttendanceProof(id: string, status: Extract<AttendanceStatus, "sent_to_mainboard" | "rejected">) {
  const response = await fetch(`${apiBase()}/api/attendance/proofs/${encodeURIComponent(id)}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ status })
  });
  const payload = (await response.json()) as AttendanceProofResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to review attendance proof.");
  }
  return payload.proof;
}
