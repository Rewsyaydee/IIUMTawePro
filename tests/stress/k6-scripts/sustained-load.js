// Scenario 6: Sustained Load - 250 concurrent users over 60 minutes
// Simulates steady-state usage during a full event day
// Tests for memory leaks, cold starts, long-term stability

import { check, sleep } from "k6";
import http from "k6/http";
import { random } from "k6";
import { THRESHOLDS, presetConfig, rpcCall, getAuthHeaders, logCheckFailure } from "./setup.js";

export const options = {
  ...presetConfig([
    { duration: "5m", target: 50 },
    { duration: "10m", target: 250 },
    { duration: "35m", target: 250 },
    { duration: "10m", target: 0 },
  ]),
  stages: [
    { duration: "5m", target: 50 },
    { duration: "10m", target: 250 },
    { duration: "35m", target: 250 },
    { duration: "10m", target: 0 },
  ]
};

// Lightweight actions only - no heavy writes
const READ_ACTIONS = ["schedule.list", "announcements.list"];

export default function () {
  const userId = __VU * 10000 + __ITER;
  const action = READ_ACTIONS[Math.floor(Math.random() * READ_ACTIONS.length)];

  // All sustained-load actions are public — no auth needed
  const req = rpcCall(action, {}, {});
  const res = http.post(req.url, req.body, { headers: req.headers, tags: { name: action } });

  check(res, {
    "sustained: status 200": (r) => r.status === 200,
    "sustained: response time < 3s": (r) => r.timings.duration < 3000,
  });

  // Realistic think time: users browse, not hammer
  sleep(5 + Math.random() * 25);
}
