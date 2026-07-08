import { readJson, sendJson } from "../_lib/auth-utils.js";
import { requireActiveAppUser } from "../_lib/wellbeing-utils.js";
import {
  listOperationsForUser,
  mapBureauOperation,
  updateOperationStatus
} from "../_lib/bureau-ops-utils.js";

export default async function handler(req, res) {
  try {
    const user = await requireActiveAppUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const rows = await listOperationsForUser(user);
      const operations = (Array.isArray(rows) ? rows : []).map(mapBureauOperation);
      return sendJson(res, 200, { operations });
    }

    if (req.method === "PATCH") {
      const body = await readJson(req);
      if (!body.id || !body.status) {
        return sendJson(res, 400, { error: "Operation ID and status are required." });
      }
      if (!["pending", "active", "ready", "issue", "done"].includes(body.status)) {
        return sendJson(res, 400, { error: "Invalid status." });
      }

      const row = await updateOperationStatus({ id: body.id, status: body.status, user });
      if (!row) return sendJson(res, 404, { error: "Operation not found." });
      return sendJson(res, 200, { operation: mapBureauOperation(row) });
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Bureau operations failed", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
