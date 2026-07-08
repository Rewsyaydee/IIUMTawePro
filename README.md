# TWA Event Ops — IIUM Ta'aruf Week Mini App

Phase 7 production-ready Telegram Mini App for IIUM Ta'aruf Week Semester 2, 2025/2026.

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 8, React Router 6, Framer Motion, Lucide React
- **Backend**: Vercel Serverless Functions (single RPC router), Supabase (PostgreSQL + Storage)
- **Auth**: Telegram `initData` verification, custom Supabase JWT with role/bureau claims

## Features

### Core

- **4 user roles**: student (guest), committee, head of bureau, mainboard
- **8 bureaus**: Catering, PrepTech, Registration, Program Coordinator, Special Task, Discipline, Multimedia, Welfare
- **Telegram auth bridge** — validates initData, persists users to Supabase, issues role-scoped JWTs
- **Access code system** — committee/head codes (env fallback) + Supabase `invite_codes` table
- **Role-based theming** — student (teal/gold), committee (blue), head (violet), mainboard (deep teal/red)
- **Service worker** — offline caching for core assets + map images
- **Telegram native** — haptic feedback, theme sync, fullscreen, confirm dialogs

### Navigation (Smart Schedule Navigator)

- **12 campus venues** with categories (hall, mosque, clinic, mahallah, admin)
- **8 pre-computed walking routes** with step-by-step directions and transition notes
- **Campus Map page** (`/map`) — campus overview image with pinch-zoom + venue directory
- **Navigate buttons** on schedule items — auto-detects venue changes and offers route lookup
- **Full-screen route planner modal** — zoomable map, step cards, duration/distance summary
- **Google Maps / Waze / Apple Maps** — one-tap walking directions via external apps
- **Transition reminders** — 15-minute proactive alerts on dashboard before venue change
- **53 schedule items** annotated with venue codes for navigation

### Announcements

- **Student public view** (`/announcements`) — accordion cards, tap to expand full body
- **4 sample announcements** — wake-up call, lost & found, night session, kulliyyah links
- **Urgent/emergency banners** on dashboard with swipe-to-dismiss
- **Mainboard create/deactivate** via Control Room
- **Rich content**: formatted body, external links, tags, relative timestamps

### Operations

- **Wellbeing**: report form + Welfare dashboard (Supabase-backed via RPC)
- **POA tasks**: committee task board per bureau (Supabase-backed via RPC)
- **Bureau operations**: 19 operation records with status tracking (Supabase-backed via RPC)
- **Attendance**: selfie punch card → Special Task review → mainboard visibility
- **Mainboard control room**: user management, invite codes, schedule publishing, official notices, emergency broadcasts, audit trail

### Public Pages

| Route | Access | Content |
|---|---|---|
| `/` | All | Dashboard with live event, quick tiles, urgent announcements |
| `/schedule` | All | Full programme with filters, navigate buttons for students |
| `/official-schedule` | All | Embedded IIUM PDF schedule |
| `/announcements` | All | Accordion announcement cards |
| `/map` | Student | Campus overview + venue directory + routes list |
| `/resources` | All | Dress code, emergency contacts, PDF link |
| `/wellbeing` | All | Report form; Welfare dashboard if authorized |

### Committee Pages

| Route | Access | Content |
|---|---|---|
| `/tasks` | Committee+ | POA task board with status + priority |
| `/attendance` | Committee+ | Daily selfie punch card; Special Task review queue |
| `/bureau` | Committee+ | Bureau operations workspace |
| `/mainboard` | Mainboard | Admin suite: users, schedule, notices, announcements, audit |
| `/launch` | Mainboard | Production readiness gate checks |

## API Architecture

Single RPC router (`api/rpc.js`) dispatches by `action` field — Vercel Hobby plan compatible (7 functions total):

| Action | Purpose | Auth |
|---|---|---|
| `wellbeing.list` | List reports by role | Required |
| `wellbeing.submit` | Submit new report | Required |
| `wellbeing.update` | Update report status | Welfare/Mainboard |
| `tasks.list` | List tasks by bureau | Required |
| `tasks.create` | Create task | Mainboard |
| `tasks.update` | Update task status | Role-scoped |
| `ops.list` | List bureau operations | Required |
| `ops.update` | Update operation status | Bureau/Mainboard |
| `ops.alert` | Send bureau Telegram alert | Bureau/Mainboard |
| `notify.send` | Send official notice via Bot API | Mainboard |
| `notify.emergency` | Send emergency broadcast + banner | Mainboard |
| `schedule.list` | List schedule items | Public |
| `schedule.create` | Create schedule item | Mainboard |
| `schedule.publish` | Publish/unpublish item | Mainboard |
| `announcements.list` | List active announcements | Public |
| `announcements.create` | Create announcement | Mainboard |
| `announcements.deactivate` | Deactivate announcement | Mainboard |
| `audit.list` | List audit log entries | Mainboard |

Standalone endpoints: `api/auth/telegram`, `api/invites/redeem`, `api/health`, `api/telegram/webhook`, `api/attendance/proofs`, `api/attendance/proofs/[id]/review`.

## Supabase Schema

10 tables: `users`, `invite_codes`, `schedule_items`, `wellbeing_reports`, `poa_tasks`, `attendance_proofs`, `bureau_operations`, `banners`, `notifications`, `audit_log`.

Plus: `static_locations`, `static_routes` (navigation), `attendance-selfies` storage bucket.

Full RLS policies in `supabase/rls-policies.sql`.

## Project Structure

```
src/
├── features/navigation/         # Smart Schedule Navigator
│   ├── components/              # NavigateButton, RoutePlannerModal, RouteMapViewer, etc.
│   ├── data/                    # venues, routes, mapAssets
│   ├── hooks/                   # useRoutePlanner, useScheduleTransition
│   └── utils/                   # mapLinks (Google/Waze/Apple)
├── lib/                         # apiAuth, telegram, wellbeingApi, tasksApi, bureauOpsApi, scheduleApi, announcementsApi, attendanceApi
├── pages/                       # Dashboard, Schedule, Announcements, Wellbeing, Tasks, Attendance, BureauOps, Mainboard, etc.
├── components/                  # AppShell, AccessCodeGate, MenuTile, StatusBadge, etc.
├── state/                       # MockDataContext, MockUserContext
└── data/                        # mockData, eventSchedule (53 items)

api/
├── rpc.js                       # Consolidated router (17 actions)
├── _lib/                        # auth-utils, supabase, telegram-bot, wellbeing-utils, tasks-utils, etc.
├── auth/telegram.js
├── invites/redeem.js
├── attendance/proofs.js + [id]/review.js
├── telegram/webhook.js
└── health.js

public/assets/maps/
├── campus-overview.webp         # IIUM Gombak campus overview
└── routes/                      # 8 route images (WebP, ~500KB each)
```

## Map Image Convention

Route images at `public/assets/maps/routes/{fromCode}__to__{toCode}.webp`:

```
main-auditorium__to__shas-mosque.webp
shas-mosque__to__main-auditorium.webp
main-auditorium__to__icc-main-hall.webp
icc-main-hall__to__main-auditorium.webp
icc-main-hall__to__shas-mosque.webp
shas-mosque__to__icc-main-hall.webp
mini-auditorium__to__main-auditorium.webp
main-auditorium__to__sejahtera-clinic.webp
```

Campus overview: `public/assets/maps/campus-overview.webp` (keep under 1MB for Telegram WebView).

## Environment Variables

```env
# Client-safe
VITE_APP_MODE=production
VITE_ENABLE_MOCKS=false
VITE_API_AUTH_BRIDGE=true
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
VITE_TELEGRAM_BOT_USERNAME=

# Server-only
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
COMMITTEE_ACCESS_CODES=
```

## Commands

```bash
npm install
npm run dev          # Local development
npm run build        # Production build
npm run smoke:auth   # Auth bridge smoke test
```

## What's New (Phase 7)

- Smart Schedule Navigator with campus map, route planner, directions
- Announcements system with accordion cards and swipe-to-dismiss
- Role-based theming (4 color palettes)
- Clean bottom navigation with scrollable tabs
- Full-screen committee access unlock animation
- 15 API actions via single RPC router (Vercel Hobby-compatible)
- Wellbeing reports, POA tasks, bureau operations all Supabase-backed
- Telegram Bot API integration for real notifications
- Schedule publishing via API
- Supabase invite_codes table integration
- Map assets with offline service worker caching
- Venue codes on all 53 schedule items
