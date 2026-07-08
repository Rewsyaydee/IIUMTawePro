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

export async function listBureauOperations() {
  const payload = (await rpc("ops.list")) as OpsListResponse;
  return payload.operations;
}

export async function updateBureauOperationStatus(id: string, status: BureauOperationStatus) {
  const payload = (await rpc("ops.update", { id, status })) as OpsResponse;
  return payload.operation;
}
