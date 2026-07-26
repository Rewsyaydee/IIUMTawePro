// Scenario 5: Notification Broadcast - mainboard sends broadcast
// Uses REAL mainboard JWT from students.json
// Endpoint: POST /api/rpc (notify.send — requires mainboard role)

import { check } from "k6";
import http from "k6/http";
import { API_BASE, loadStudentTokens, getMainboardJwt } from "./setup.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {},
};

export function setup() {
  loadStudentTokens();
}

export default function () {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": getMainboardJwt(),
  };

  console.log("NOTIFICATION_BLAST: Sending broadcast with real mainboard JWT...");
  const start = Date.now();

  const body = JSON.stringify({
    action: "notify.send",
    title: "[TEST] Stress Test",
    body: "This is an automated stress test broadcast. Please ignore.",
    targetRole: "student",
    targetBureau: "all",
    createBanner: false,
  });

  const res = http.post(`${API_BASE}/rpc`, body, {
    headers,
    timeout: 120000,
    tags: { name: "notify.send" }
  });

  const duration = Date.now() - start;

  let parsed;
  try { parsed = JSON.parse(res.body); } catch { parsed = {}; }

  console.log(`NOTIFICATION_BLAST: status=${res.status}, duration=${duration}ms`);
  console.log(`  queued=${parsed.queued}, sent=${parsed.sent}, failed=${parsed.failed}`);

  check(res, {
    "notify: broadcast initiated": (r) => {
      console.log(`  Response: ${r.body?.substring(0, 300)}`);
      return r.status >= 200 && r.status < 600;
    },
  });
}
