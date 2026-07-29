// Security Test: Rate Limiter IP Spoofing Bypass (V2 fix)
// Verifies that x-real-ip (Vercel edge) is used, not client-spoofable x-forwarded-for.
// Strategy: send rapid requests with cycling X-Forwarded-For values.
// After fix: x-real-ip must be used → all 100+ requests share the same real IP → get rate-limited.

import { check } from "k6";
import http from "k6/http";
import { API_BASE } from "./setup.js";

export const options = {
  vus: 1,
  iterations: 120,
  thresholds: {
    http_req_failed: ["rate>0.05"], // expect at least 5% 429s
  },
};

export default function () {
  // Each iteration, spoof a different X-Forwarded-For
  const spoofedIp = `10.0.${__ITER % 255}.${__ITER % 167}`;

  // Hit schedule.list (public, no auth needed)
  const res = http.post(`${API_BASE}/rpc`, JSON.stringify({ action: "schedule.list" }), {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": spoofedIp,
    },
    tags: { name: "rate-limit-test" }
  });

  check(res, {
    "V2: received response (200 or 429)": (r) => r.status === 200 || r.status === 429,
  });

  if (__ITER === 0) {
    console.log(`\nIteration 1: spoofed X-Forwarded-For=${spoofedIp}, status=${res.status}`);
  }
  if (__ITER === 119) {
    console.log(`Iteration 120: spoofed X-Forwarded-For=${spoofedIp}, status=${res.status}`);
  }
  if (res.status === 429) {
    console.log(`  → Rate limited at iteration ${__ITER} (V2 fix working)`);
  }
}

export function handleSummary(data) {
  const limited = Object.values(data.metrics.http_reqs?.values || {})
    .filter(v => v && v.tags?.status === "429")
    .length;

  console.log(`\n=== RATE LIMIT VERIFICATION ===`);
  console.log(`Total requests: ${data.metrics.http_reqs?.values?.count || 0}`);
  console.log(`429 responses: ${limited}`);

  if (limited > 0) {
    console.log(`✓ V2 FIX CONFIRMED: Rate limited at iteration ${data.metrics.http_reqs?.values ? "within 120" : "unknown"}`);
    console.log(`  x-real-ip is being used (all 120 requests from same real IP)`);
  } else {
    console.log(`⚠ COULD NOT VERIFY: No 429s received. Possible causes:`);
    console.log(`  1. RATE_LIMIT_MAX set very high (current: ${__ENV.RATE_LIMIT_MAX || "default 60"})`);
    console.log(`  2. Vercel edge overwrites x-real-ip per request`);
    console.log(`  3. Need to check Vercel deployment has V2 code`);
  }

  return {};
}
