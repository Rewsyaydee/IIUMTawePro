// Scenario 2: Schedule List - 1000 concurrent students requesting schedule
// Simulates all students opening the app and loading schedule simultaneously
// Endpoint: POST /api/rpc (schedule.list - public, no auth)

import { check, sleep } from "k6";
import http from "k6/http";
import { THRESHOLDS, presetConfig, rpcCall, logCheckFailure } from "./setup.js";

export const options = {
  ...presetConfig([
    { duration: "30s", target: 200 },
    { duration: "1m", target: 1000 },
    { duration: "1m30s", target: 1000 },
    { duration: "30s", target: 0 },
  ]),
  stages: [
    { duration: "30s", target: 200 },
    { duration: "1m", target: 1000 },
    { duration: "1m30s", target: 1000 },
    { duration: "30s", target: 0 },
  ]
};

export default function () {
  const req = rpcCall("schedule.list");

  const res = http.post(req.url, req.body, { headers: req.headers, tags: { name: "schedule.list" } });

  const ok = check(res, {
    "schedule: status 200": (r) => r.status === 200,
    "schedule: response time < 2s": (r) => r.timings.duration < 2000,
  });

  if (!ok) logCheckFailure("schedule-read", res, "200 with items array");

  sleep(1 + Math.random() * 3);
}
