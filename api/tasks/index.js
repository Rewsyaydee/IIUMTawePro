import { readJson, sendJson } from "../_lib/auth-utils.js";
import { requireActiveAppUser } from "../_lib/wellbeing-utils.js";
import {
  insertTask,
  listTasksForUser,
  mapPoaTask,
  updateTaskStatus
} from "../_lib/tasks-utils.js";

export default async function handler(req, res) {
  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const rows = await listTasksForUser(user);
      const tasks = (Array.isArray(rows) ? rows : []).map(mapPoaTask);
      return sendJson(res, 200, { tasks });
    }

    if (req.method === "POST") {
      if (user.role !== "mainboard") {
        return sendJson(res, 403, { error: "Only mainboard can create tasks." });
      }

      const body = await readJson(req);
      if (!body.title || !body.bureau) {
        return sendJson(res, 400, { error: "Title and bureau are required." });
      }

      const row = await insertTask({ user, task: body });
      if (!row) return sendJson(res, 500, { error: "Failed to create task." });
      return sendJson(res, 201, { task: mapPoaTask(row) });
    }

    if (req.method === "PATCH") {
      const body = await readJson(req);
      if (!body.id || !body.status) {
        return sendJson(res, 400, { error: "Task ID and status are required." });
      }
      if (!["todo", "in_progress", "done", "blocked"].includes(body.status)) {
        return sendJson(res, 400, { error: "Invalid status." });
      }

      const row = await updateTaskStatus({ id: body.id, status: body.status, user });
      if (!row) return sendJson(res, 404, { error: "Task not found." });
      return sendJson(res, 200, { task: mapPoaTask(row) });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("POA tasks failed", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
