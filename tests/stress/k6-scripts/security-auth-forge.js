// Security Test: Auth Bypass via Forged initData + Valid Invite Code (V1 fix)
// Verifies that Telegram HMAC verification is now required unconditionally.
// Before fix: fake initData + valid code bypassed auth. After fix: must get 401.

import { check } from "k6";
import http from "k6/http";
import { API_BASE, generateInitData } from "./setup.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {},
};

const VALID_CODE = "COMMITTEETAWEAUTARAWEH"; // from .env COMMITTEE_ACCESS_CODES

export default function () {
  // Test 1: Fake initData (invalid HMAC) WITHOUT invite code → must be 401
  const fakeData = generateInitData(99999, "Attacker", "student");
  const res1 = http.post(`${API_BASE}/auth/telegram`, JSON.stringify({
    initData: fakeData,
    inviteCode: ""
  }), { headers: { "Content-Type": "application/json" }, tags: { name: "auth-no-code" } });

  check(res1, {
    "V1: fake initData without code → 401": (r) => r.status === 401,
  });

  // Test 2: Fake initData (invalid HMAC) WITH valid invite code → must be 401 (THE FIX)
  const res2 = http.post(`${API_BASE}/auth/telegram`, JSON.stringify({
    initData: fakeData,
    inviteCode: VALID_CODE,
    selectedRole: "committee",
    selectedBureau: "PrepTech"
  }), { headers: { "Content-Type": "application/json" }, tags: { name: "auth-with-code" } });

  check(res2, {
    "V1: fake initData WITH valid code → 401 (bypass closed)": (r) => r.status === 401,
  });

  // Test 3: No initData at all + valid code → must be 401
  const res3 = http.post(`${API_BASE}/auth/telegram`, JSON.stringify({
    initData: "",
    inviteCode: VALID_CODE
  }), { headers: { "Content-Type": "application/json" }, tags: { name: "auth-no-initdata" } });

  check(res3, {
    "V1: no initData + valid code → 401": (r) => r.status === 401 || r.status === 400,
  });

  console.log(`\nTest 1 (fake, no code): status=${res1.status}`);
  console.log(`Test 2 (fake + code):   status=${res2.status} ${res2.status === 401 ? '✓ BYPASS CLOSED' : '✗ VULNERABLE'}`);
  console.log(`Test 3 (empty + code):  status=${res3.status}`);
}
