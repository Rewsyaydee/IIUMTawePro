import type { StudentAttendance, StudentAttendanceStatus } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

function sessionHeaders(): Record<string, string> {
  const token = getStoredSupabaseJwt();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function rpc(action: string, data: Record<string, unknown> = {}) {
  const response = await fetch(`${apiBase()}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders() },
    body: JSON.stringify({ action, ...data })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "RPC request failed.");
  return payload;
}

export async function onboardStudent(matricNumber: string, kulliyyah: string) {
  return rpc("user.onboard", { matricNumber, kulliyyah });
}

export async function submitStudentAttendance(input: {
  scheduleItemId: string;
  eventTitle: string;
  studentName: string;
  matricNumber: string;
  kulliyyah?: string;
  latitude: number;
  longitude: number;
  status?: StudentAttendanceStatus;
  excuse?: string;
}): Promise<StudentAttendance> {
  const payload = await rpc("attendance.submit", input as Record<string, unknown>);
  return (payload as { attendance: StudentAttendance }).attendance;
}

export async function listStudentAttendance(): Promise<StudentAttendance[]> {
  const payload = await rpc("attendance.student.list");
  return (payload as { attendances: StudentAttendance[] }).attendances;
}

export async function listAllAttendance(): Promise<StudentAttendance[]> {
  const payload = await rpc("attendance.mainboard.list");
  return (payload as { attendances: StudentAttendance[] }).attendances;
}

export async function reviewAttendance(id: string, status: StudentAttendanceStatus): Promise<StudentAttendance> {
  const payload = await rpc("attendance.review", { id, status });
  return (payload as { attendance: StudentAttendance }).attendance;
}
