// Scenario 1: Auth Flood - tests auth endpoint throughput under load
// Sends fake initData to POST /api/auth/telegram
// Expects 401 (production rejects fake signatures) — tests auth gateway capacity

import { check, sleep } from "k6";
import http from "k6/http";
import {
  API_BASE, THRESHOLDS_EXTREME, presetConfig,
  generateInitData
} from "./setup.js";

export const options = {
  ...presetConfig([
    { duration: "15s", target: 50 },
    { duration: "30s", target: 200 },
    { duration: "15s", target: 200 },
    { duration: "10s", target: 0 },
  ], THRESHOLDS_EXTREME),
  stages: [
    { duration: "15s", target: 50 },
    { duration: "30s", target: 200 },
    { duration: "15s", target: 200 },
    { duration: "10s", target: 0 },
  ]
};

export default function () {
  const userId = __VU * 10000 + __ITER;
  const name = `Student_${userId}`;
  const initData = generateInitData(userId, name, "student");

  const res = http.post(`${API_BASE}/auth/telegram`, JSON.stringify({
    initData,
    inviteCode: ""
  }), {
    headers: { "Content-Type": "application/json" }
  });

  check(res, {
    "auth: got a response": (r) => r.status === 200 || r.status === 201 || r.status === 401 || r.status === 400,
    "auth: response time < 3s": (r) => r.timings.duration < 3000,
  });

  sleep(1 + Math.random() * 2);
}
