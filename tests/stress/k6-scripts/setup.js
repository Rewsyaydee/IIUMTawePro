// Shared setup, config, and helpers for all TawePro stress tests
// Target: 4500 students, 180 committees across 8 bureaus

const BASE_URL = __ENV.BASE_URL || "https://iium-tawe-pro.vercel.app";
export const API_BASE = `${BASE_URL}/api`;

// ── Test thresholds ──
// k6 v2.x uses the base metric name; avg/med/p95 etc are trend stats, not separate metrics
export const THRESHOLDS = {
  "http_req_duration": ["p(95)<3000"],       // 95% of requests under 3s
  "http_req_failed": ["rate<0.05"],           // <5% error rate
  "iteration_duration": ["avg<5000"],         // avg iteration under 5s
};

// Relaxed thresholds for extreme scenarios
export const THRESHOLDS_EXTREME = {
  "http_req_duration": ["p(95)<5000"],
  "http_req_failed": ["rate<0.15"],
  "iteration_duration": ["avg<10000"],
};

// ── Test users ──
const BUREAUS = [
  "Catering", "PrepTech", "Registration", "Program Coordinator",
  "Special Task", "Discipline", "Multimedia", "Welfare"
];

const SAMPLE_EVENT_IDS = [
  "dummy-event-001", "dummy-event-002", "dummy-event-003",
  "dummy-event-004", "dummy-event-005", "dummy-event-006",
  "dummy-event-007", "dummy-event-008", "dummy-event-009", "dummy-event-010"
];

// ── Helper: simulate Telegram initData ──
// k6 runs on Goja JS engine (no URLSearchParams), so build query string manually
export function generateInitData(userId, name, role) {
  const now = Math.floor(Date.now() / 1000);
  const user = JSON.stringify({
    id: userId,
    first_name: name,
    last_name: "",
    username: `student_${userId}`,
    language_code: "en"
  });
  const params = [
    `query_id=test_${userId}_${now}`,
    `user=${encodeURIComponent(user)}`,
    `auth_date=${now}`,
    "hash=0000000000000000000000000000000000000000000000000000000000000000"
  ];
  return params.join("&");
}

// ── Helper: get auth token (call auth endpoint) ──
export function getAuthHeaders(userId, name) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer test-jwt-${userId}-mainboard`
  };
}

// ── Real JWT helpers (loaded from students.json at init stage) ──
let studentJwts = null;
let mainboardJwt = null;
let committeeJwt = null;

// Load tokens at init stage (module scope, before any VU executes)
try {
  const data = JSON.parse(open("../students.json"));
  studentJwts = data.students;
  mainboardJwt = data.mainboard.jwt;
  committeeJwt = data.committee.jwt;
} catch (e) {
  console.error("Failed to load students.json:", e);
  studentJwts = [];
}

export function loadStudentTokens() {
  // Tokens already loaded at init stage
  if (!studentJwts || studentJwts.length === 0) {
    throw new Error("No student tokens available. Run generate-tokens.mjs first.");
  }
}

export function getStudentJwt(index) {
  const s = studentJwts[index % studentJwts.length];
  return `Bearer ${s.jwt}`;
}

export function getStudentUserId(index) {
  return studentJwts[index % studentJwts.length].userId;
}

export function getMainboardJwt() {
  return `Bearer ${mainboardJwt}`;
}

export function getCommitteeJwt() {
  return `Bearer ${committeeJwt}`;
}

export function getCommitteeHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": getCommitteeJwt(),
  };
}

export function getStudentHeaders(index) {
  return {
    "Content-Type": "application/json",
    "Authorization": getStudentJwt(index),
  };
}

// ── RPC call helper ──
export function rpcCall(action, body = {}, headers = {}) {
  return {
    url: `${API_BASE}/rpc`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({ action, ...body })
  };
}

// ── Scenario helpers ──
export function randomBureau() {
  return BUREAUS[Math.floor(Math.random() * BUREAUS.length)];
}

export function randomEventId() {
  return SAMPLE_EVENT_IDS[Math.floor(Math.random() * SAMPLE_EVENT_IDS.length)];
}

// ── k6 config presets ──
export function presetConfig(stages, thresholds = THRESHOLDS) {
  return {
    thresholds,
    noConnectionReuse: false,    // simulate real browser behavior
    userAgent: "TawePro-StressTest/1.0",
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  };
}

// ── Log helpers ──
export function logCheckFailure(name, res, expected) {
  console.error(`CHECK FAILED [${name}]: expected ${expected}, got status ${res.status}, body: ${res.body?.substring(0, 200)}`);
}

export function logIterationSummary(iteration, duration) {
  if (iteration % 100 === 0) {
    console.log(`Iteration ${iteration} completed in ${duration.toFixed(0)}ms`);
  }
}

export default {
  BASE_URL,
  API_BASE,
  THRESHOLDS,
  THRESHOLDS_EXTREME,
  BUREAUS,
  generateInitData,
  getAuthHeaders,
  rpcCall,
  randomBureau,
  randomEventId,
  presetConfig,
  logCheckFailure,
  logIterationSummary,
};
