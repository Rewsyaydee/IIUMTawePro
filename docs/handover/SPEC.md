# TawePro — Technical Specification (SPEC)

| Field | Value |
|---|---|
| Version | 1.0 (Production, Semester 1 2026/2027) |
| Audience | ITD System Administrators, developers |
| Source of truth | This document + the repository (`Rewsyaydee/IIUMTawePro`) |

> **Important correction to historical briefs:** the frontend is **Vite + React 18 +
> TypeScript** (single-page app), **not Next.js**. The backend is **Vercel serverless
> functions** (`api/*.js`, Node ESM) + **Supabase** (Postgres, Realtime, Storage).
> There is **no Azure VM** in this system.

---

## 1. System Architecture

```
┌──────────────────────┐        initData (HMAC-signed)        ┌──────────────────────────┐
│  Telegram Client      │ ───────────────────────────────────▶ │  Mini App (SPA)          │
│  (iOS / Android /     │                                      │  Vite + React 18 + TS    │
│   Desktop)            │ ◀─────────────────────────────────── │  served by Vercel         │
└─────────┬────────────┘        web_app buttons, deep links    └────────────┬─────────────┘
          │                                                                 │ fetch /api/*
          │ Bot API updates (webhook)                                       ▼
┌─────────▼────────────┐        HTTPS (secret header)          ┌──────────────────────────┐
│ api/telegram/webhook  │ ───────────────────────────────────▶ │  Vercel Serverless API   │
│ api/cron/notifications│                                      │  api/*.js (Node 20 ESM)  │
│ (pinger / cron)       │                                      └────────────┬─────────────┘
└──────────────────────┘                                                    │ service role
                                                                            ▼
                                                              ┌──────────────────────────┐
                                                              │  Supabase                │
                                                              │  • Postgres + RLS        │
                                                              │  • Realtime (presence)   │
                                                              │  • Storage (selfies)     │
                                                              └──────────────────────────┘

Triggers: UptimeRobot (1-min, primary) ─┐
          Vercel cron 23:00 UTC (07:00 KL) ├─▶ GET /api/cron/notifications
          GitHub Actions (5-min backup)   ─┘
          Self-ping on Mini App open / bot interaction (fallback)
```

### 1.1 Component responsibilities

| Component | Responsibility |
|---|---|
| `src/` (Vite SPA) | All screens, client state, mock mode, Telegram WebApp SDK usage |
| `api/auth/telegram.js` | Verifies Telegram `initData` HMAC, upserts user, issues app JWT |
| `api/rpc.js` | Single RPC gateway — 46 actions (schedule, attendance, tasks, wellbeing, ops, users, guides, launch, leaderboard, announcements) |
| `api/telegram/webhook.js` | Bot updates: commands, callback queries, review flow, registration, unlock, rich messages |
| `api/cron/notifications.js` | Student tier reminders, committee briefing, POA/masterplan scans, dedup + heartbeat |
| `api/attendance/proofs*.js` | Committee punch-card selfie upload + Special Task review |
| `api/og.jsx` | Server-rendered story images (`@vercel/og`) |
| `api/donate.js`, `api/prepare-share.js`, `api/health.js` | Support invoice, share prep, health probe |
| `supabase/*.sql` | Schema, RLS, seeds, feature migrations (run order in §9) |

### 1.2 Authentication model

```
Telegram WebApp.initData
  → POST /api/auth/telegram
  → HMAC-SHA256 validation with TELEGRAM_BOT_TOKEN
  → users upsert (telegram_id unique)
  → signed JWT (HS256 or JWKS) with claims:
        app_user_id, app_role, bureau, telegram_id
  → stored client-side; sent as Authorization: Bearer <jwt> to /api/rpc
```

- The JWT is **app-scoped**; Supabase RLS reads the same claims via
  `app_private.claim_*()` helpers when PostgREST is accessed directly (optional path).
- The bot webhook is authenticated separately by `X-Telegram-Bot-Api-Secret-Token`
  (`TELEGRAM_WEBHOOK_SECRET`).

---

## 2. Repository Map

```
TawePro/
├─ api/                     Vercel serverless functions
│  ├─ _lib/                 shared server libraries (auth, supabase, telegram, rich
│  │                        messages, briefing, poa-notify, tasks, wellbeing, …)
│  ├─ auth/telegram.js      Telegram → app JWT
│  ├─ attendance/proofs*.js punch-card selfies + review
│  ├─ cron/notifications.js notification dispatcher
│  ├─ invites/redeem.js     access-code redemption
│  ├─ telegram/webhook.js   bot webhook
│  ├─ rpc.js                main RPC gateway
│  ├─ og.jsx                story image renderer
│  ├─ donate.js             Telegram Stars invoice
│  ├─ health.js             health probe
│  └─ prepare-share.js      share link preparation
├─ src/                     Vite SPA
│  ├─ pages/                Dashboard, Schedule, Attendance, Leaderboard, Members,
│  │                        Wellbeing, Tasks, BureauOps, Mainboard, LaunchReadiness,
│  │                        Announcements, Resources, Stories, Support, OfficialSchedulePdf
│  ├─ components/           StreakWidget, StudentAttendanceView, UserAvatar, CheckInForm, …
│  ├─ features/navigation/  campus map, venues, routes, mahallahs, kulliyyahs
│  ├─ lib/                  api clients, scheduleTime, presenceTracker, useActiveSchedule, …
│  ├─ state/                MockDataContext, MockUserContext
│  └─ styles.css            design system
├─ supabase/                schema.sql, rls-policies.sql, seeds, migrations
├─ tests/                   smoke tests, stress suite, one-off ops scripts
├─ tools/                   smoke-auth, schedule extractor, Python rich-message example
├─ docs/                    engineering docs + docs/handover (this suite)
├─ vercel.json              rewrites, headers, crons
└─ .vercelignore            keeps CLI deploys small (excludes tests/, .ctx/, dumps)
```

---

## 3. Database Schema (Supabase Postgres)

### 3.1 Core tables

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Identity + role | `id`, `telegram_id` (unique), `name`, `role` (student/committee/head/mainboard), `bureau`, `status`, `matric_number`, `kulliyyah`, `mahallah`, `phone`, `photo_url`, `registration_step`, `notify_tier` (off/daily/session/live), `committee_prefs` (jsonb) |
| `schedule_items` | Programme | `date`, `day`, `week` (preparation/event_week), `scheduled_start_time`, `scheduled_end_time`, `title`, `venue`, `venue_code`, `tag`, `audience`, `block` (before_break/after_break), `block_group`, `is_concurrent`, `is_attendance_required`, `track`, `program_count`, `is_live`, `readiness_status` |
| `student_attendance` | Check-ins | `user_id`, `schedule_item_id`, `event_title`, `student_name`, `matric_number`, `kulliyyah`, `mahallah`, `latitude`, `longitude`, `status` (present/absent/excused), `excuse`, `reviewed_by`, `reviewed_at`; unique `(user_id, schedule_item_id)` |
| `attendance_proofs` | Committee punch cards | `date`, `user_id`, `telegram_id`, `committee_name`, `bureau`, `selfie_path`, `status`, `rejection_reason`, `clock_type` |
| `poa_tasks` | Masterplan tasks | `bureau`, `title`, `description`, `due_date`, `due_time`, `assigned_to` (text PIC), `assigned_to_ids` (uuid[]), `status`, `priority`, `notify_minutes_before`, `is_recurring` |
| `bureau_operations` | Ops board | `bureau`, `tool`, `title`, `detail`, `owner`, `status`, `metric` |
| `wellbeing_reports` | Medical intake (sensitive) | `reference`, `submitted_by`, `student_name`, `phone`, `category`, `notes`, `medical_conditions` (text[]), `status`, `assigned_to`, `resolved_at` |
| `banners` | Announcements | `title`, `body`, `type`, `is_active`, `expires_at`, `tags[]`, `links jsonb` |
| `notifications` | Broadcast log | `target_role`, `target_bureau`, `title`, `body`, `type`, `send_status` |
| `notification_sends` | Dedup + heartbeat | `send_key` (unique), `sent_at` |
| `invite_codes` | Access codes | `code`, `role`, `bureau`, `expires_at`, `is_used`, `is_reusable` |
| `audit_log` | Admin audit | `actor_id`, `actor_name`, `action`, `table_name`, `record_id`, `details`, `timestamp` |
| `static_locations` / `static_routes` | Map data | venue codes, route assets, steps jsonb |
| `leaderboard_scores` | Optional materialised scoring | `user_id`, `mahallah`, `schedule_item_id`, `score_date`, `points`, `arrival_window` |
| `reviews` | Public reviews (anonymous) | `display_name`, `content`, `rating`, `is_approved`, `created_at` — **no user column** |
| `review_sessions` | In-flight review state | `telegram_id` (unique), `display_name`, `content` |

### 3.2 CMS/feature tables (added by migrations)

| Table | Purpose |
|---|---|
| `emergency_contacts` | Guides CMS (name, role, phone, priority, sort_order) |
| `coupon_locations` | Guides CMS (name, location, accepts, hours) |
| `ops_settings` | Key/value settings (`session_delay_minutes`) |
| `launch_checklist_items` | Launch readiness toggles (status pending/ready/issue) |
| `task_notifications` | Task DM dispatch log (task_id, assignee, telegram_id, status, error) |

---

## 4. Row Level Security (RLS)

`supabase/rls-policies.sql` defines 34 policies. Claim helpers:

```sql
app_private.claim_user_id()   -- auth.jwt() ->> 'app_user_id' :: uuid
app_private.claim_role()      -- auth.jwt() ->> 'app_role'
app_private.claim_bureau()    -- auth.jwt() ->> 'bureau'
app_private.is_mainboard()    -- claim_role() = 'mainboard'
app_private.is_special_task() -- claim_bureau() = 'Special Task'
```

Representative policy matrix:

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `users` | own profile or mainboard | mainboard admin `for all` |
| `schedule_items` | audience-based read | mainboard `for all` |
| `student_attendance` | own rows; mainboard all | student inserts own; mainboard review |
| `attendance_proofs` | own + Special Task/Mainboard | committee insert own; review by Special Task |
| `wellbeing_reports` | own reports; Welfare + Mainboard all | student insert own; Welfare/Mainboard update |
| `poa_tasks` | bureau-scoped (committee/head); mainboard all | heads/mainboard |
| `banners` | everyone reads active | mainboard `for all` |
| `static_locations`/`static_routes` | public read | mainboard |
| `reviews` | approved only (public) | service role only (bot) |
| CMS tables | read (public/committee) | mainboard (heads for launch checklist) |

> The API uses the **service role** for server-side operations; RLS protects any direct
> PostgREST/Realtime access from clients (e.g., the presence channel).

---

## 5. API Surface

### 5.1 Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/telegram` | POST | Telegram initData | Verify + upsert user, issue app JWT |
| `/api/invites/redeem` | POST | initData + code | Redeem committee/head/mainboard access |
| `/api/rpc` | POST | Bearer JWT (public whitelist: schedule.list, announcements.list, leaderboard.fetch) | 46 actions (below) |
| `/api/attendance/proofs` | POST | JWT (committee) | Punch-card selfie upload |
| `/api/attendance/proofs/[id]/review` | POST | JWT (Special Task) | Approve/reject proof |
| `/api/telegram/webhook` | POST | `X-Telegram-Bot-Api-Secret-Token` | Bot updates |
| `/api/cron/notifications` | GET | none (public by design; dedup protects) | Notification dispatcher |
| `/api/health` | GET | `HEALTH_SECRET` (query/header) | Liveness probe |
| `/api/og` | GET | none | Story image rendering |
| `/api/prepare-share` | POST | JWT | Prepare share payloads |
| `/api/donate` | POST | JWT | Telegram Stars invoice (XTR) |

### 5.2 `rpc.js` actions (48)

| Group | Actions |
|---|---|
| Wellbeing | `wellbeing.list`, `wellbeing.submit`, `wellbeing.update` |
| Tasks | `tasks.list`, `tasks.create`, `tasks.update`, `tasks.edit`, `tasks.delete` |
| Members/Ops | `bureau.members`, `ops.list`, `ops.update`, `ops.alert`, `ops.live`, `ops.settings.get`, `ops.settings.set` |
| Notifications | `notify.send`, `notify.emergency` |
| Schedule | `schedule.list`, `schedule.create`, `schedule.publish`, `schedule.update`, `schedule.delete` |
| Announcements | `announcements.list`, `announcements.create`, `announcements.deactivate`, `announcements.update`, `announcements.delete` |
| Guides CMS | `guides.emergency.list/create/update/delete`, `guides.coupon.list/create/update/delete` |
| Launch | `launch.list`, `launch.update` |
| Audit/Users | `audit.list`, `users.list`, `users.update`, `users.revoke`, `user.onboard` |
| Baiah takeover | `baiah.get` (public read), `baiah.set` (mainboard: activate/deactivate/schedule/message/notify) |
| Attendance | `attendance.submit`, `attendance.student.list`, `attendance.mainboard.list`, `attendance.review` |
| Leaderboard | `leaderboard.fetch` |

**Attendance window enforcement (`attendance.submit`):** parses the block id
`block-<date>-<before_break|after_break>-w<cycle>`, requires it to match the
server-computed current virtual date/cycle, then enforces
`windowStart ≤ now ≤ windowEnd + session_delay` where the window is the first event start
→ final event end of that block. `CHECKIN_SKIP_WINDOW=1` disables this (dev/QA only).

---

## 6. Telegram Bot

### 6.1 Commands

| Command | Behaviour |
|---|---|
| `/start` | New user: welcome + matric prompt. Registered: profile table + action buttons. Mid-registration: resumes the current step |
| `/unlock [CODE]` | Validates committee/head/mainboard code; asks bureau for committee/head |
| `/unlock student` | Committee/head/mainboard returns to student view (with confirmation) |
| `/notifications` | Students: tier menu. Committee+: Session Notifications vs Masterplan Reminders |
| `/review` | Multi-step anonymous review (name choice → text → stars) |
| `/baiah` | Mainboard only: Baiah takeover remote (Activate now / Deactivate / Refresh / open controls) |
| `/help` | Command list + community link |

### 6.2 Callback data namespaces

`pick_bureau:`, `pick_kulliyyah:`, `pick_mahallah:`, `change_matric`, `change_kulliyyah`,
`change_mahallah`, `unlock_prompt`, `set_notify:`, `notify_menu:`, `set_briefing:`,
`set_masterplan:`, `review_name:`, `review_rating:`, `review_cancel`,
`review_approve:` / `review_reject:`, `student_downgrade:`, `baiah:on|off|status`.

### 6.3 Rich Messages (Bot API 10.3)

- All bot messages use `sendRichMessage` with native blocks (headings, tables, lists with
  checkboxes, `pre` blocks, expandable blockquotes, styled buttons).
- Automatic fallback: on any rich-send failure the exact legacy HTML text + inline keyboard
  is sent instead (`sendRichWithFallback`).
- Verified live: profile table, POA table, moderation buttons, notification checkbox list.

### 6.4 Notification system

| Trigger | Window (KL) | Recipients | Dedup key |
|---|---|---|---|
| Student morning digest | first session − 30 min ± 15 | `daily` + `session` students | `morning:<date>` |
| Student evening digest | 13:40 ± 15 | `session` students | `evening:<date>` |
| Student live alert | 5–15 min before each session | `live` students | `live:<date>:<start>` |
| Committee briefing | 07:00–07:30 | non-students with `committee_prefs.briefing != 'off'` | `briefing:<userId>:<date>` |
| Masterplan reminder | `due_time − notify_minutes_before` +10 min | task assignees with `masterplan != 'off'` | `masterplan:<taskId>:<userId>` |
| Heartbeat | every run | — | `ping` |

---

## 7. Environment Variables (names only — never commit values)

### 7.1 Client (safe to expose, `VITE_` prefix)

| Variable | Purpose |
|---|---|
| `VITE_APP_MODE` | `mock` or `production` |
| `VITE_ENABLE_MOCKS` | `true`/`false` — enables mock data contexts |
| `VITE_API_AUTH_BRIDGE` | `true` to force API auth mode |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon/publishable key (browser) |
| `VITE_API_BASE_URL` | API origin (defaults to same origin) |
| `VITE_TELEGRAM_BOT_USERNAME` | `iiumtaweprobot` |

### 7.2 Server-only (never expose)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Server Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | Server DB key (service role) |
| `SUPABASE_JWKS_URL`, `SUPABASE_JWT_SECRET` | App JWT signing/verification |
| `TELEGRAM_BOT_TOKEN` | Bot API token |
| `TELEGRAM_WEB_APP_URL` | Mini App base URL (deep links) |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook secret header |
| `REVIEW_ADMIN_TELEGRAM_ID` | Review moderator account |
| `COMMITTEE_ACCESS_CODES`, `HEAD_ACCESS_CODES`, `MAINBOARD_ACCESS_CODES` | Unlock codes |
| `COMMITTEE_TELEGRAM_IDS`, `COMMITTEE_BUREAU_BY_TELEGRAM_ID`, `DEFAULT_COMMITTEE_BUREAU` | Legacy/fallback committee routing |
| `WELLBEING_SUPPORT_URL` | Support link in wellbeing alerts |
| `CHECKIN_SKIP_WINDOW` | `1` disables check-in window enforcement (dev only) |
| `HEALTH_SECRET` | `/api/health` probe secret |
| `RATE_LIMIT_MAX` | Per-IP/user requests per minute (default 60) |
| `STRESS_TEST_MODE` | Test-only JWT resolution mode |

---

## 8. CI/CD Pipeline

```
Developer ──git push──▶ GitHub (Rewsyaydee/IIUMTawePro, branch main)
                              │
                              ├─ Vercel Git integration (auto-deploy) ──▶ Production
                              │        (if the GitHub App link is healthy)
                              └─ Fallback (current operational path):
                                       vercel --prod --yes
```

- **Build:** `npm run build` = `tsc --noEmit && vite build` (Vercel runs the same).
- **Serverless:** each `api/*.js` becomes a Vercel Function; shared code in `api/_lib`.
- **`vercel.json`:** SPA rewrite `/((?!api/).*) → /index.html`; CORS + immutable cache
  headers for `/assets/maps/*`; cron `0 23 * * *` (07:00 KL) → `/api/cron/notifications`.
- **`.vercelignore`:** excludes `tests/`, `screenshots/`, `.ctx/`, DB dumps, Supabase CLI
  state, `.env*` — keeps CLI uploads ~10 MB (prevents the 100 MB file-limit failure).
- **CI checks:** none blocking today; recommended: run `npm run build` + `node --check api`
  in a GitHub Action before merge.

---

## 9. Local Setup in 15 Minutes

**Prerequisites:** Node.js ≥ 20, npm, a Supabase project, a Telegram bot token
(via @BotFather), Git.

```bash
# 1. Clone (2 min)
git clone https://github.com/Rewsyaydee/IIUMTawePro.git
cd IIUMTawePro
npm install

# 2. Configure env (3 min)
cp .env.example .env
# Fill: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY),
#       TELEGRAM_BOT_TOKEN, TELEGRAM_WEB_APP_URL (http://127.0.0.1:5173 for dev)
# Client defaults are fine for mock mode (VITE_ENABLE_MOCKS=true).

# 3. Run SQL in Supabase SQL Editor — IN THIS ORDER (7 min)
#    supabase/schema.sql
#    supabase/rls-policies.sql
#    supabase/seed-real-schedule.sql        # real 10-25 Sep programme
#    supabase/review-support.sql
#    supabase/notification-sends.sql
#    supabase/cms-refinement.sql
#    supabase/committee-notify.sql
#    supabase/fix-schedule.sql              # venue + stale-row cleanup
#    supabase/seed-preptech-poa.sql         # (optional) Preptech POA data
#    supabase/baiah-takeover.sql            # Baiah Realtime confetti takeover
#    supabase/baiah-takeover-v2.sql         # song, announcement lead time, skip button
#    supabase/baiah-pg-cron.sql             # (optional) exact-minute scheduled activation

# 4. Run the app (1 min)
npm run dev            # http://127.0.0.1:5173  (mock mode, no Telegram needed)

# 5. Optional verification (2 min)
npm run build          # typecheck + production build
node tools/smoke-auth.mjs
node tests/test-rich-message.cjs      # sends one rich message to TARGET_TELEGRAM_ID
```

**API mode locally:** set `VITE_ENABLE_MOCKS=false`, `VITE_API_AUTH_BRIDGE=true` and run
`vercel dev` (serverless functions), or deploy to a Vercel preview.

**Bot webhook for dev:** point Telegram to a tunnel (e.g. `ngrok http 3000`) and
`setWebhook` with `secret_token`; never point production webhook at a dev machine.

---

## 10. Future Integration Proposal: IIUM CAS

> **Status:** proposal only. Today the system is Telegram-auth only. This section defines a
> migration path that adds IIUM CAS verification **without breaking the existing UX**.

### 10.1 Goal

- **Guests** (default, unverified): can browse schedule, maps, announcements, leaderboards
  (read-only). Cannot submit attendance, wellbeing, or reviews.
- **Students** (CAS-verified): must link their IIUM CAS identity (matric number) to their
  Telegram ID once. After linking, attendance/medical submissions unlock.

### 10.2 One-Time Linking Flow

```
[Telegram Mini App]  Student taps "Verify with IIUM CAS"
        │
        ▼
[App] POST /api/auth/cas/start
        │  creates one-time link token {nonce, telegram_id, expires 10 min}
        ▼
[Redirect] https://cas.iium.edu.my/...?service=<callback>&state=<nonce>
        │  (SAML 2.0 POST binding OR OAuth2/OIDC authorization code — adapter decides)
        ▼
[CAS] user authenticates (IIUM credentials — never seen by TawePro)
        │
        ▼
[App] /api/auth/cas/callback  (service validation / code exchange)
        │  extracts: matric_number, full_name, kulliyyah (if released)
        ▼
[Server] Binds identity:
        users.cas_subject = <stable CAS identifier>
        users.matric_number = <from CAS>
        users.verified_at = now()
        users.role stays 'student' (or existing committee role preserved)
        ▼
[Mini App] "Verified ✓" — attendance/wellbeing unlocked
```

**Security requirements**
- One-time nonce (single use, 10-minute TTL, bound to `telegram_id`), replay protection.
- TLS only; validate CAS response signature (SAML) or token signature/issuer (OIDC).
- Never store IIUM passwords; store only the stable subject id + matric.
- If CAS is down: students fall back to the current behaviour only if the Mainboard
  explicitly enables a `cas_bypass` ops setting (audited).

### 10.3 RBAC Matrix

| Capability | Guest (unverified) | Student (CAS-linked) | Committee/Head | Mainboard |
|---|---|---|---|---|
| View schedule / maps / announcements | ✅ | ✅ | ✅ | ✅ |
| View leaderboards | ✅ | ✅ | ✅ | ✅ |
| Submit attendance check-in | ❌ | ✅ | ✅ | ✅ |
| Submit wellbeing/medical report | ❌ | ✅ | ✅ | ✅ |
| Punch-card proofs | ❌ | ❌ | ✅ | ✅ |
| Tasks / ops board | ❌ | ❌ | ✅ (bureau) | ✅ |
| CMS / moderation / users | ❌ | ❌ | ❌ | ✅ |

Implementation: a `verified` claim added to the app JWT (`verified: true` when
`cas_subject IS NOT NULL`). Server guards add `requireVerifiedStudent(user)` in
`attendance.submit` and `wellbeing.submit`. Client hides those screens for guests and shows
the "Verify with IIUM CAS" call-to-action.

### 10.4 Data model delta

```sql
alter table public.users add column if not exists cas_subject text;
alter table public.users add column if not exists verified_at timestamptz;
create unique index if not exists users_cas_subject_key on public.users (cas_subject)
  where cas_subject is not null;
```

### 10.5 Rollout phases

| Phase | Scope |
|---|---|
| 0 | Adapter skeleton + CAS sandbox; no user-facing change |
| 1 | Guest/Student UI split; linking flow enabled for volunteers first |
| 2 | Attendance + wellbeing gated on verification; grace period with Mainboard override |
| 3 | Verification mandatory for all new registrations; legacy users prompted at next check-in |

### 10.6 Open items for ITD

- Confirm IIUM CAS protocol (SAML 2.0 / OAuth2 / OIDC) and released attributes.
- Confirm whether Kulliyyah/Mahallah are authoritative from CAS or remain user-selected.
- Confirm data-sharing approval (PDPA) for matric↔Telegram binding.
