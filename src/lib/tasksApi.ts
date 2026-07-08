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

export async function listTasks() {
  const response = await fetch(`${apiBase()}/api/tasks`, {
    headers: sessionHeaders()
  });
  const payload = (await response.json()) as TaskListResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load tasks.");
  }
  return payload.tasks;
}

export async function createTask(input: Partial<PoaTask>) {
  const response = await fetch(`${apiBase()}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as TaskResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to create task.");
  }
  return payload.task;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const response = await fetch(`${apiBase()}/api/tasks`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders()
    },
    body: JSON.stringify({ id, status })
  });
  const payload = (await response.json()) as TaskResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to update task.");
  }
  return payload.task;
}
