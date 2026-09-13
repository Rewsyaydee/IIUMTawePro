# TawePro — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | TawePro — IIUM Ta'aruf Week Gamified Orientation Platform |
| Version | 1.0 (Production, Semester 1 2026/2027) |
| Owner (technical) | Rusyaidi (original developer) |
| Owner (operational) | IIUM ITD — TawePro System Administrator |
| Audience | ITD, IIUM Student Development (STADD), Mainboard committee |
| Programme window | 10 – 25 September 2026 (event week 21 – 25 September) |
| Scale target | 4,500+ freshmen, 16+ bureaus, 65+ committee members |
| Platform | Zero-install Telegram Mini App (`@iiumtaweprobot`) |

---

## 1. Product Vision

TawePro is a zero-install, Telegram-native companion for IIUM Ta'aruf Week. It replaces
paper check-in sheets, scattered WhatsApp broadcasts, and static PDF schedules with a
single Mini App that:

- guides freshmen through **registration → attendance → reward** with gamified feedback,
- gives committee volunteers (**"Welwel"**) operational tooling (tasks, POA briefings,
  bureau operations, attendance proofs),
- gives Mainboard a live control room (announcements, schedule CMS, moderation, ops),
- gives ITD an operable, auditable system with no mobile app store dependency.

**Design principle:** every student interaction must complete in ≤ 3 taps inside Telegram;
every operational message must be short and actionable; detailed information always lives
in the Mini App, never in chat spam.

---

## 2. Personas

### 2.1 Freshman (Student) — primary user
| Attribute | Detail |
|---|---|
| Count | 4,500+ |
| Device | Android/iOS Telegram, mixed performance classes |
| Goal | Register, know where to be, check in, earn the Ta'aruf Kit |
| Friction tolerance | Very low — must work in one thumb, often on campus wifi |
| Success | Registers (matric/kulliyyah/mahallah), checks in to ≥ 1 block/day, sees streak grow |

### 2.2 Welwel (Committee Volunteer) — operational user
| Attribute | Detail |
|---|---|
| Count | ~65 across 8 bureaus (Catering, PrepTech, Registration, Program Coordinator, Special Task, Discipline, Multimedia, Welfare) |
| Goal | Know today's Plan of Action (POA), own tasks, and status of their tools |
| Entry | Redeems a committee access code in the bot (`/unlock CODE`) |
| Success | Receives the 07:00 POA briefing, updates task status in `/tasks`, never misses a slot |

### 2.3 Head of Bureau
| Attribute | Detail |
|---|---|
| Goal | Create/edit/delete bureau tasks, monitor task status, manage bureau ops |
| Entry | Head access code; bureau selected at unlock |
| Success | Bureau tasks always current; masterplan reminders reach the right people |

### 2.4 Mainboard (Admin)
| Attribute | Detail |
|---|---|
| Goal | Control room: users, schedule CMS, announcements, review moderation, live ops, launch readiness |
| Entry | Mainboard access code (`/unlock`) |
| Success | Zero unhandled issues during event week; all announcements approved and delivered |

### 2.5 ITD System Administrator (operator)
| Attribute | Detail |
|---|---|
| Goal | Keep the system running with zero prior codebase knowledge |
| Needs | This handover suite, Supabase/Vercel dashboards, bot ownership, escalation matrix |
| Success | Restores service from any documented failure within the runbook SLAs |

---

## 3. Core Feature Set (Production Surface)

### 3.1 Onboarding & Identity
- Telegram-only authentication (`initData` → signed app JWT). **No CAS today** — see
  `SPEC.md §10` for the future CAS integration proposal.
- Registration flow in-bot: matric number → kulliyyah (7 options) → mahallah (17 options,
  grouped Male/Female).
- Profile editing anytime (`/start` → Change Matric / Kulliyyah / Mahallah).
- Committee unlock via access codes; `/unlock student` returns to student view.

### 3.2 Real Schedule Engine
- Real programme 10–25 Sep 2026 seeded from the official appendix (`REAL TAWE SCHEDULE.md`).
- Identity date mode inside the programme window; preview loop only outside it.
- Main vs Concurrent separation (placement tests, booth exhibition).
- Admin CMS: create/update/publish/delete schedule items (Mainboard only).

### 3.3 Attendance & Gamification
- Session blocks: 10 attendance blocks (Mon 21 – Fri 25 Sep, before/after break).
- Server-enforced check-in windows (retroactive/future check-ins rejected).
- GPS-adjacent check-in (client radius check; current production flag `SKIP_GPS` documented
  in the Helpdesk Guide).
- Streak widget, progress circles, milestone rewards (Ta'aruf Kit), share-to-story cards.
- Committee punch-card selfie proofs + review workflow (Special Task/Mainboard).

### 3.4 Leaderboards
- Individual day/week rankings + Mahallah aggregate rankings (attendance %, check-ins).
- Mahallah canonicalisation (bot names ↔ codes), photo avatars with initials fallback.

### 3.5 Campus Maps
- Curated venue/kulliyyah/mahallah dropdowns (cleansed of pseudo-venues).
- Pre-rendered route images (webp) with iOS-safe loading + external map deep links
  (Google/Apple/Waze).

### 3.6 Wellbeing & Medical Intake
- Confidential report form: category, notes, optional multi-select medical conditions
  (Asthma, Food Allergies, Physical Disabilities, Chronic Illnesses, Mental Health
  Considerations), phone persisted for prefill.
- Instant Telegram alert to the Welfare bureau; status lifecycle
  (submitted → responding → resolved/escalated); resolved history.

### 3.7 Telegram Bot Chat (Rich Messages)
- Commands: `/start`, `/unlock [CODE|student]`, `/notifications`, `/review`, `/help`.
- Native Rich Messages (Bot API 10.3): tables, lists, checkboxes, styled buttons,
  collapsible details — with automatic legacy text + inline keyboard fallback.

### 3.8 Committee Notifications & POA
- Students: tier-based reminders (`daily`, `session`, `live`, `off`).
- Committee: 07:00 KL daily morning briefing (today's programme + their tasks) and the
  Preptech POA table; optional masterplan reminders before task due times.
- Task assignment DMs with deep link to `/tasks`.

### 3.9 Reviews & Moderation
- `/review` multi-step flow (name/anonymous → text → 1–5 stars). Anonymous by design —
  no user identifier stored with the review.
- Mainboard moderation alert with Approve/Reject buttons; approved reviews appear on the
  public landing page.

### 3.10 Ops, CMS & Launch
- Bureau operations board (status per tool, alerts).
- Mainboard live ops dashboard (per-venue check-in counts, session delay toggle).
- Interactive launch checklist (Venue Access, Audio, QR/GPS, Welwel Standby, …).
- Guides CMS (emergency contacts, coupon locations), announcements CMS.

### 3.11 Support & Sharing
- Story generator (Wrapped, Achievement, Schedule, Check-in, Invite) with server-rendered
  OG images.
- Support page with Telegram Stars donations + DuitNow QR fallback.

---

## 4. Key User Flows

### 4.1 Freshman happy path
```
Telegram → @iiumtaweprobot → /start
  → type matric → pick Kulliyyah → pick Mahallah
  → Open Dashboard (web_app)
  → Schedule → tap "Check In: Morning Session"
  → Attendance page → submit (server validates window)
  → Dashboard streak +1 → Stories → share Wrapped
```

### 4.2 Welwel daily loop
```
07:00 KL briefing (POA table + today's programme + tasks)
  → /tasks → update statuses (todo → in_progress → done)
  → on-site: bureau ops board updates + alert if issue
  → attendance: punch-card selfie (if bureau requires)
```

### 4.3 Mainboard event-day loop
```
/mainboard → Announcements (broadcast + banner)
  → Attendance Review queue (approve/reject proofs)
  → Bureau Ops live counts (10s poll)
  → Launch checklist toggles
  → Review moderation (bot alert)
```

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Latency | API p95 < 800 ms; Mini App first paint < 2.5 s on mid-range Android |
| Availability | 99% during 10–25 Sep; graceful degradation when Supabase/Telegram degrade |
| Scale | 4,500 users; bursts at check-in windows (handled by cache TTLs, batch sends, rate limits) |
| Rate limits | Telegram ~30 msg/s; per-IP/user API limits (`RATE_LIMIT_MAX`, default 60/min) |
| Security | Server-only secrets; RLS on all tables; JWT claims; webhook secret header |
| Privacy | PDPA-aligned; medical data restricted; 30-day post-event wipe (see PDPA doc) |
| Compatibility | Telegram iOS/Android/Desktop WebView; iOS WKWebView quirks handled |
| Observability | `notification_sends` heartbeat + send log; Vercel logs; Supabase logs; audit_log |
| Maintainability | Zero-build frontend config changes; SQL migrations in `supabase/`; documented env vars |

---

## 6. Success Metrics

| Metric | Target |
|---|---|
| Freshman registration completion | ≥ 90% of Mini App openers |
| Daily check-in participation (event week) | ≥ 70% of registered students |
| Morning briefing delivery (committee) | 100% of opted-in members by 07:30 KL |
| Wellbeing first-response time | ≤ 15 min during event hours |
| Notification send success rate | ≥ 98% (rich + fallback paths) |
| Unhandled incidents during event week | 0 P1 |

---

## 7. Out of Scope (Current Release)

- IIUM CAS integration (proposal only — `SPEC.md §10`).
- In-app payments for students (donations are optional and Stars-based).
- Native mobile apps (store distribution).
- Multi-event reuse (architecture is single-event oriented; reusable via reseed).

---

## 8. Roadmap Pointers

| Item | Reference |
|---|---|
| CAS one-time linking + RBAC (Guests vs Students) | `SPEC.md §10` |
| Ops incident handling | `OPERATIONS-RUNBOOK.md` |
| Ownership/asset handover | `ASSET-TRANSFER.md` |
| Privacy lifecycle & wipe | `PDPA-COMPLIANCE.md` |
| End-user support | `HELPDESK-GUIDE.md` |
