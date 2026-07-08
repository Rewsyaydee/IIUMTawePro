import type { WellbeingReport } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type ReportListResponse = {
  reports: WellbeingReport[];
  error?: string;
};

type ReportResponse = {
  report: WellbeingReport;
  error?: string;
};

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
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ action, ...data })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "RPC request failed.");
  }
  return payload;
}

export async function listWellbeingReports() {
  const payload = (await rpc("wellbeing.list")) as ReportListResponse;
  return payload.reports;
}

export async function submitWellbeingReport(input: {
  studentName: string;
  phone: string;
  category: string;
  notes: string;
}) {
  const payload = (await rpc("wellbeing.submit", input)) as ReportResponse;
  return payload.report;
}

export async function updateWellbeingReportStatus(id: string, status: WellbeingReport["status"]) {
  const payload = (await rpc("wellbeing.update", { id, status })) as ReportResponse;
  return payload.report;
}
