import type { BureauOperation, BureauOperationStatus } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type OpsListResponse = {
  operations: BureauOperation[];
  error?: string;
};

type OpsResponse = {
  operation: BureauOperation;
  error?: string;
};

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

function sessionHeaders(): Record<string, string> {
  const token = getStoredSupabaseJwt();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listBureauOperations() {
  const response = await fetch(`${apiBase()}/api/bureau-ops`, {
    headers: sessionHeaders()
  });
  const payload = (await response.json()) as OpsListResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load bureau operations.");
  }
  return payload.operations;
}

export async function updateBureauOperationStatus(id: string, status: BureauOperationStatus) {
  const response = await fetch(`${apiBase()}/api/bureau-ops`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ id, status })
  });
  const payload = (await response.json()) as OpsResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to update operation status.");
  }
  return payload.operation;
}
