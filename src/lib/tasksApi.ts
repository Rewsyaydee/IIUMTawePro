import type { PoaTask, TaskStatus } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type TaskListResponse = {
  tasks: PoaTask[];
  error?: string;
};

type TaskResponse = {
  task: PoaTask;
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

export async function listTasks() {
  const payload = (await rpc("tasks.list")) as TaskListResponse;
  return payload.tasks;
}

export async function createTask(input: Partial<PoaTask>) {
  const payload = (await rpc("tasks.create", input as Record<string, unknown>)) as TaskResponse;
  return payload.task;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const payload = (await rpc("tasks.update", { id, status })) as TaskResponse;
  return payload.task;
}

export async function updateTaskDetails(id: string, fields: Partial<PoaTask>) {
  const payload = (await rpc("tasks.edit", { id, ...fields })) as TaskResponse;
  return payload.task;
}

export async function deleteTaskApi(id: string) {
  await rpc("tasks.delete", { id });
}
