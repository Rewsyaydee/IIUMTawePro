# TawePro — Production Readiness Report

> **App:** IIUM Ta'aruf Week Mini App  
> **Target:** 4,500 students + 180 committees across 8 bureaus  
> **Infrastructure:** Vercel Hobby + Supabase Free  
> **Generated:** July 29, 2026

---

## 1. Executive Summary

The application is **production-ready after two mandatory upgrades**. Public endpoints handle 1,000+ concurrent users with zero errors and sub-600ms latency. Authenticated write operations (attendance check-in) pass at 300 concurrent with 725ms average. Eleven security vulnerabilities were identified and fixed, including two critical findings that were verified closed.

**The free tier will not survive 4,500 users.** Projected monthly traffic is 270% of the Vercel Hobby 1M invocation limit. Supabase Free's 500MB database and 60-connection limit will bottleneck under peak load.

**Minimum viable upgrade: Vercel Pro ($20/mo) + Supabase Pro ($25/mo) = $45/mo total.**

---

## 2. Load Test Results

All tests run against production (`https://iium-tawe-pro.vercel.app`) with `STRESS_TEST_MODE=true`, `RATE_LIMIT_MAX=5000`, and 4,500 pre-signed HS256 JWTs loaded from `students.json`.

### Summary

| # | Scenario | Concurrency | Requests | Error Rate | P50 | P95 | P99 | Verdict |
|---|----------|-------------|----------|------------|-----|-----|-----|---------|
| 1 | Schedule Read | 1,000 | 51,524 | 0.00% | 280ms | 506ms | 748ms | ✅ PASS |
| 2 | Sustained Load | 250 × 60min | 39,246 | 0.00% | 279ms | 498ms | 649ms | ✅ PASS |
| 3 | Attendance Rush | 300 | 8,078 | 0.00% | 725ms | 1,131ms | 1,273ms | ✅ PASS |
| 4 | Mixed RPC Burst | 300 | 5,507 | 0.00% | 348ms | 593ms | 890ms | ✅ PASS |
| 5 | Auth Flood | 200 | 3,593 | 100% (401) | — | — | — | ✅ Auth secure |
| 6 | Notification Broadcast | 1 | timeout | — | — | — | — | ⚠️ Vercel 10s limit |

### Scenario Details

#### 1. Schedule Read (1,000 concurrent)
Simulates all students opening the schedule simultaneously. Public endpoint, no auth.

- **51,524 successful requests over ~3.5 minutes**
- **Zero errors** — Vercel Hobby handled 1,000 concurrent connections cleanly
- **P95 latency: 506ms** — well within acceptable bounds
- **Throughput:** ~245 req/sec sustained

#### 2. Sustained Load (250 concurrent, 60 minutes)
Simulates steady-state browsing throughout an event day. Public reads only (schedule + announcements).

- **39,246 successful requests over 60 minutes**
- **Zero errors** — no memory leaks, no degradation over time
- **P95 latency: 498ms** — consistent throughout the hour
- This test best represents normal usage of 4,500 users spread across a day

#### 3. Attendance Rush (300 concurrent)
Simulates 300 students checking into an event simultaneously. **Full authenticated write** — real JWTs, real database inserts.

- **8,078 successful check-ins over ~1.5 minutes**
- **Zero errors** — all inserts succeeded with unique schedule_item_ids
- **P95 latency: 1,131ms** — acceptable for a write operation with FK constraints and audit logging
- Each request creates a row in `student_attendance` with GPS coordinates

#### 4. Mixed RPC Burst (300 concurrent)
Realistic workload mix: 40% schedule (public), 25% announcements (public), 15% tasks (auth), 10% attendance list (auth), 5% wellbeing (auth), 5% ops (auth).

- **5,507 successful requests**
- **Zero errors** — public + authenticated mix handled cleanly
- **P95 latency: 593ms** — auth overhead adds ~250ms vs. pure public reads

#### 5. Auth Flood (200 concurrent)
Tests the auth gateway endpoint with fake Telegram `initData`. Expects 401.

- **3,593 requests all correctly rejected as 401**
- Auth verification latency: ~800ms (includes HMAC-SHA256 check + `upsertUserProfile` DB write)
- Confirms the auth endpoint is properly secured and handles load without crashing

#### 6. Notification Broadcast
Tests `notify.send` with a real mainboard JWT. Broadcasts to all registered Telegram users.

- **Failed due to Vercel Hobby 10-second function timeout**
- Broadcasting to 4,500+ users via Telegram Bot API (~30 msg/sec limit) takes ~150 seconds
- Batched concurrent sending (25/batch, 8 concurrent) reduces to ~40 seconds — still exceeds Hobby timeout
- **Requires Vercel Pro (60s timeout)** or a background queue architecture

### Infrastructure Capacity Projection

| Metric | Projected Monthly | Free Tier Limit | Usage % | Status |
|--------|-------------------|-----------------|---------|--------|
| Vercel Function Invocations | ~2.7M | 1M | 270% | ⚠️ EXCEEDED |
| Vercel Edge Requests | ~3.0M | 1M | 300% | ⚠️ EXCEEDED |
| Vercel Fast Data Transfer | ~150GB | 100GB | 150% | ⚠️ EXCEEDED |
| Supabase Database Size | ~300MB | 500MB | 60% | ⚠️ TIGHT |
| Supabase Egress | ~30GB | 5GB | 600% | 🔴 EXCEEDED |
| Supabase DB Connections | 60+ (peak) | 60 | 100%+ | 🔴 AT LIMIT |

---

## 3. Security Audit

Eleven vulnerabilities were identified across authentication, authorization, rate limiting, and input validation. All eleven have been fixed. Two critical findings were verified closed with dedicated security tests.

### Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| V1 | 🔴 CRITICAL | Auth bypass via invite code + forged initData | ✅ Fixed + verified |
| V2 | 🔴 CRITICAL | Rate limiter bypass via spoofed `X-Forwarded-For` | ✅ Fixed + verified |
| V3 | 🟠 HIGH | Student can update any bureau operation (`ops.update`) | ✅ Fixed |
| V4 | 🟠 HIGH | `tasks.update` has no role check (any user can modify) | ✅ Fixed |
| V5 | 🟡 MEDIUM | Head can create tasks for another bureau | ✅ Fixed |
| V6 | 🟡 MEDIUM | Unvalidated role/bureau values in `users.update` | ✅ Fixed |
| V7 | 🟡 MEDIUM | Hardcoded access code fallback in source | ✅ Fixed |
| V8 | ⚪ LOW | HTML injection in notification broadcast body | ✅ Fixed |
| V9 | ⚪ LOW | Timing side-channel in JWT signature length check | ✅ Fixed |
| V10 | ⚪ LOW | Health endpoint exposes full config to public | ✅ Fixed |
| V11 | ⚪ LOW | Missing input validation on lat/lng, date, phone | ✅ Fixed |

### Critical Finding Details

#### V1: Auth Bypass (Fixed — `api/auth/telegram.js`, `api/invites/redeem.js`)

**Issue:** Both auth endpoints allowed execution to proceed when Telegram `initData` HMAC verification failed, as long as a valid invite code was provided. The forged `initData` `user.id` was parsed and used to look up or impersonate any Telegram user.

**Attack chain:**
1. Attacker obtains any valid invite/access code
2. Attacker crafts `initData` with a victim's Telegram user ID and a bogus HMAC hash
3. Server's `verifyTelegramInitData` returns `ok: false` but still parses `user` from the forged data
4. `upsertUserProfile` overwrites the victim's role with whatever the invite code grants (up to mainboard)
5. Attacker receives a valid JWT for the victim's account with elevated privileges

**Fix:** Both endpoints now reject immediately if `verifyTelegramInitData` fails — regardless of invite code presence. HMAC verification is always required.

**Verification:** 3 test cases confirmed: fake initData (401), fake initData + valid code (401), empty initData + valid code (401). All correctly rejected.

#### V2: Rate Limiter IP Spoofing (Fixed — `api/rpc.js`)

**Issue:** The rate limiter read the client IP from `X-Forwarded-For`, which is a client-controlled header. An attacker could cycle fake IPs to flood public endpoints without restriction.

**Fix:** Changed to use `x-real-ip` (set by Vercel's edge proxy, not client-spoofable) as the primary IP source, with `x-vercel-forwarded-for` and `x-forwarded-for` as fallbacks.

**Verification:** 120 requests sent with 119 different spoofed `X-Forwarded-For` values. All counted toward the same real IP. Rate limited at iteration 60 (the 60 req/min limit).

### Access Control Matrix

The RPC handler's 29 actions were audited for proper role enforcement:

| # | Action | Allowed Roles | Bureau Scoped? | Status |
|---|--------|---------------|----------------|--------|
| 1 | `schedule.list` | PUBLIC | N/A | OK |
| 2 | `announcements.list` | PUBLIC | N/A | OK |
| 3 | `wellbeing.list` | Any auth | Yes | OK |
| 4 | `wellbeing.submit` | Any auth | No | OK |
| 5 | `wellbeing.update` | Welfare, mainboard | No | OK |
| 6 | `tasks.list` | Any auth | Yes | OK |
| 7 | `tasks.create` | mainboard, head | Enforced | ✅ (V5 fixed) |
| 8 | `tasks.update` | mainboard, head, committee | Enforced | ✅ (V4 fixed) |
| 9 | `tasks.edit` | mainboard, head | No | OK |
| 10 | `tasks.delete` | mainboard, head | No | OK |
| 11 | `ops.list` | Any auth | Yes | OK |
| 12 | `ops.update` | mainboard, head, committee | Enforced | ✅ (V3 fixed) |
| 13 | `notify.send` | mainboard only | N/A | OK |
| 14 | `notify.emergency` | mainboard only | N/A | OK |
| 15 | `schedule.create` | mainboard only | N/A | OK |
| 16 | `schedule.publish` | mainboard only | N/A | OK |
| 17 | `schedule.update` | mainboard only | N/A | OK |
| 18 | `ops.alert` | mainboard or own bureau | Yes | OK |
| 19 | `announcements.create` | mainboard only | N/A | OK |
| 20 | `announcements.deactivate` | mainboard only | N/A | OK |
| 21 | `audit.list` | mainboard only | N/A | OK |
| 22 | `users.list` | mainboard only | N/A | OK |
| 23 | `users.update` | mainboard only | Validated | ✅ (V6 fixed) |
| 24 | `users.revoke` | mainboard only | N/A | OK |
| 25 | `user.onboard` | student only | Self only | OK |
| 26 | `attendance.submit` | student only | Self only | OK |
| 27 | `attendance.student.list` | Any auth | Self only | OK |
| 28 | `attendance.mainboard.list` | mainboard only | N/A | OK |
| 29 | `attendance.review` | mainboard only | N/A | OK |

---

## 4. App Improvements

Pre-launch hardening changes made alongside the tests:

| Improvement | File | Impact |
|-------------|------|--------|
| **Batched concurrent notification broadcast** | `api/_lib/telegram-bot.js` | Reduces broadcast time from ~156s to ~40s (25/batch, 8 concurrent) |
| **30-second in-memory cache** | `api/rpc.js` | Schedule + announcements reads hit cache; reduces Supabase load 90%+ |
| **Per-IP + per-user rate limiting** | `api/rpc.js` | 60 req/min per IP, 60 req/min per user (configurable via `RATE_LIMIT_MAX`) |
| **Health DB connectivity metrics** | `api/health.js` | DB status, latency, active user count in health response |
| **Vercel Speed Insights** | `src/main.tsx` | Web Vitals tracking for real-user performance |
| **Vercel Analytics** | `src/main.tsx` | Traffic analytics, page views, visitor insights |

---

## 5. Security Verification Results

### V1: Auth Bypass Test

```
Test 1 (fake initData, no code):   status=401
Test 2 (fake initData + code):     status=401 ✓ BYPASS CLOSED
Test 3 (empty initData + code):    status=401

All 3/3 checks passed.
```

**Script:** `tests/stress/k6-scripts/security-auth-forge.js`

### V2: Rate Limiter IP Spoofing Test

```
120 iterations with 119 different spoofed X-Forwarded-For headers
All counted toward the same real IP (x-real-ip)
Rate limited at iteration 60 (60 req/min limit)
All subsequent iterations (60-119) returned HTTP 429

✓ V2 FIX CONFIRMED: x-real-ip is being used, spoofed headers are ignored.
```

**Script:** `tests/stress/k6-scripts/security-rate-limit.js`

---

## 6. Pre-Launch Checklist

### Mandatory (Must Complete)

- [ ] **Upgrade Vercel to Pro** ($20/mo) — 10M edge requests, 2M function invocations, 60s timeout, no cold starts
- [ ] **Upgrade Supabase to Pro** ($25/mo) — 8GB database, daily backups, 100K MAU, 100GB storage, no pausing
- [ ] **Enable Supabase daily backups** (included with Pro)
- [ ] **Remove `STRESS_TEST_MODE=true`** from Vercel environment variables
- [ ] **Set `RATE_LIMIT_MAX=60`** (or remove the env var to use default 60)
- [ ] **Verify `COMMITTEE_ACCESS_CODES`** is set in Vercel env (no hardcoded fallback)
- [ ] **Verify `HEAD_ACCESS_CODES`** and `MAINBOARD_ACCESS_CODES` are set
- [ ] **Set `HEALTH_SECRET`** env var to lock down the health endpoint
- [ ] **Verify `.env` is not committed** (already in `.gitignore`, confirmed not tracked)
- [ ] **Run `npm run build`** to verify production build passes
- [ ] **Push latest code to main branch** — all security fixes included

### Recommended

- [ ] **Set Vercel spend cap** to $50-100 to prevent surprise bills
- [ ] **Configure Vercel Firewall** rate limiting rules as a second layer
- [ ] **Smoke test** with ~10 real Telegram accounts before going live
- [ ] **Monitor Vercel Analytics** + Speed Insights dashboard during event week
- [ ] **Monitor Supabase database size** daily during event week (500MB free → 8GB on Pro)
- [ ] **Have a fallback plan**: keep the Vercel preview deployment as a rollback target

### Post-Launch

- [ ] **Clean up test users** from Supabase: `DELETE FROM student_attendance WHERE event_title LIKE 'Stress Test%'`
- [ ] **Remove `students.json`** from the repository (contains pre-signed JWTs valid for 24h)
- [ ] **Set `STRESS_TEST_MODE=false`** in Vercel env (if not already removed)

---

## 7. Scaling Cost Projection

| Plan | Monthly | Includes | Fits 4,500 users? |
|------|---------|----------|-------------------|
| **Free (current)** | $0 | 1M invocations, 500MB DB, 60 connections, 10s timeout | 🔴 NO — will crash |
| **Pro (recommended)** | **$45** | 2M invocations, 8GB DB, 250GB egress, 60s timeout, daily backups | 🟢 YES |
| **Pro+ (conservative)** | $60-85 | Pro + Supabase Small compute (2GB RAM, 90 direct connections) | 🟢 YES — overkill |

**Recommendation:** Start with Pro on both platforms ($45/mo). Monitor during the event. Scale Supabase compute to Small ($15/mo more) only if DB connections approach the 60-connection limit during peak.

---

## 8. Test Suite Usage

### Prerequisites

```powershell
# Install k6 (load testing tool)
winget install k6
# or: choco install k6

# Install Node.js dependencies
cd tests/stress
npm install
```

### Running All Tests

```powershell
cd tests/stress
.\run-all.ps1
```

This runs all 6 scenarios sequentially (~65 minutes total), saves JSON results to `results/`, and generates `stress-report.html`.

### Running Individual Tests

```powershell
$env:BASE_URL = "https://iium-tawe-pro.vercel.app"

# Performance tests
k6 run k6-scripts/auth-flood.js
k6 run k6-scripts/schedule-read.js
k6 run k6-scripts/attendance-rush.js
k6 run k6-scripts/mixed-rpc-burst.js
k6 run k6-scripts/notification-blast.js
k6 run k6-scripts/sustained-load.js

# Security verification tests
k6 run k6-scripts/security-auth-forge.js
k6 run k6-scripts/security-rate-limit.js
```

### Generating JWTs for Stress Testing

```powershell
# Generate 4,500 signed HS256 JWTs (requires SUPABASE_JWT_SECRET in .env)
node generate-tokens.mjs

# Upsert test users into Supabase (for FK constraints on attendance writes)
node seed-test-users.mjs
```

**Note:** Stress testing with real JWTs requires `STRESS_TEST_MODE=true` and `RATE_LIMIT_MAX=5000` set in Vercel environment variables. Remove these after testing.

### Generating the HTML Report

```powershell
node generate-report.mjs
# Opens stress-report.html with Chart.js visualizations
```

---

## 9. File Inventory

| Path | Purpose |
|------|---------|
| `tests/stress/STRESS_TEST_REPORT.md` | This file |
| `tests/stress/stress-report.html` | Interactive HTML report with latency/error charts |
| `tests/stress/students.json` | 4,500 pre-signed JWTs (generated, not committed) |
| `tests/stress/generate-tokens.mjs` | JWT generator using `SUPABASE_JWT_SECRET` |
| `tests/stress/generate-report.mjs` | HTML report generator (streaming parser for large files) |
| `tests/stress/seed-test-users.mjs` | Bulk upsert test users into Supabase |
| `tests/stress/run-all.ps1` | PowerShell orchestrator for full test suite |
| `tests/stress/package.json` | npm scripts for running tests |
| `tests/stress/k6-scripts/setup.js` | Shared config, JWT helpers, rate limit/threshold presets |
| `tests/stress/k6-scripts/auth-flood.js` | Scenario 1: Auth endpoint flood |
| `tests/stress/k6-scripts/schedule-read.js` | Scenario 2: Schedule read at 1,000 concurrent |
| `tests/stress/k6-scripts/attendance-rush.js` | Scenario 3: Attendance check-in rush |
| `tests/stress/k6-scripts/mixed-rpc-burst.js` | Scenario 4: Mixed workload |
| `tests/stress/k6-scripts/notification-blast.js` | Scenario 5: Notification broadcast |
| `tests/stress/k6-scripts/sustained-load.js` | Scenario 6: Sustained 60-minute load |
| `tests/stress/k6-scripts/security-auth-forge.js` | Security test: V1 auth bypass verification |
| `tests/stress/k6-scripts/security-rate-limit.js` | Security test: V2 rate limit IP spoofing |
| `tests/stress/results/` | Raw k6 JSON output (not committed) |
