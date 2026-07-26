// Scenario 4: Mixed RPC Burst - realistic mixed usage with REAL JWTs
// 40% schedule (public), 25% announcements (public), 15% tasks (auth),
// 10% attendance list (auth), 5% wellbeing (auth), 5% ops (auth)
// Uses pre-generated student + committee JWTs

import { check, sleep } from "k6";
import http from "k6/http";
import {
  THRESHOLDS, presetConfig, rpcCall,
  loadStudentTokens, getStudentHeaders, getCommitteeHeaders
} from "./setup.js";

export const options = {
  ...presetConfig([
    { duration: "15s", target: 50 },
    { duration: "30s", target: 300 },
    { duration: "45s", target: 300 },
    { duration: "10s", target: 0 },
  ]),
  stages: [
    { duration: "15s", target: 50 },
    { duration: "30s", target: 300 },
    { duration: "45s", target: 300 },
    { duration: "10s", target: 0 },
  ]
};

const ACTIONS = [
  { action: "schedule.list", weight: 40, auth: false },
  { action: "announcements.list", weight: 25, auth: false },
  { action: "tasks.list", weight: 15, auth: true },
  { action: "attendance.student.list", weight: 10, auth: true },
  { action: "wellbeing.list", weight: 5, auth: true },
  { action: "ops.list", weight: 5, auth: true },
];

function pickAction() {
  const total = ACTIONS.reduce((sum, a) => sum + a.weight, 0);
  let r = Math.random() * total;
  for (const a of ACTIONS) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return ACTIONS[0];
}

export function setup() {
  loadStudentTokens();
}

export default function () {
  const idx = __VU * 10000 + __ITER;
  const entry = pickAction();
  const action = entry.action;

  let headers;
  if (!entry.auth) {
    headers = {};
  } else if (action === "tasks.list" || action === "ops.list") {
    headers = getCommitteeHeaders();
  } else {
    headers = getStudentHeaders(idx);
  }

  const req = rpcCall(action, {}, headers);
  const res = http.post(req.url, req.body, { headers: req.headers, tags: { name: action } });

  check(res, {
    "mixed: status OK": (r) => r.status === 200 || r.status === 201,
    "mixed: response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1 + Math.random() * 5);
}
