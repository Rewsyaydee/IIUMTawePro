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

export async function listWellbeingReports() {
  const response = await fetch(`${apiBase()}/api/wellbeing/reports`, {
    headers: sessionHeaders()
  });
  const payload = (await response.json()) as ReportListResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load wellbeing reports.");
  }
  return payload.reports;
}

export async function submitWellbeingReport(input: {
  studentName: string;
  phone: string;
  category: string;
  notes: string;
}) {
  const response = await fetch(`${apiBase()}/api/wellbeing/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as ReportResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to submit wellbeing report.");
  }
  return payload.report;
}

export async function updateWellbeingReportStatus(id: string, status: WellbeingReport["status"]) {
  const response = await fetch(`${apiBase()}/api/wellbeing/reports`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ id, status })
  });
  const payload = (await response.json()) as ReportResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to update report status.");
  }
  return payload.report;
}
