# TWA Event Ops — IIUM Ta'aruf Week Mini App

Phase 7–9 production-ready Telegram Mini App for IIUM Ta'aruf Week Semester 2, 2025/2026 (July 13–19, 2026).

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 8, React Router 6, Framer Motion, Lucide React
- **Backend**: Vercel Serverless Functions (single RPC router), Supabase (PostgreSQL + Storage)
- **Auth**: Telegram `initData` verification, custom Supabase JWT with role/bureau claims

## Features

### Core

- **4 user roles**: student (guest), committee, head of bureau, mainboard
- **8 bureaus**: Catering, PrepTech, Registration, Program Coordinator, Special Task, Discipline, Multimedia, Welfare
- **Telegram auth bridge** — validates initData, persists users to Supabase, issues role-scoped JWTs
- **Access code system** — committee/head/mainboard codes via `COMMITTEE_ACCESS_CODES`, `HEAD_ACCESS_CODES`, `MAINBOARD_ACCESS_CODES` env vars
- **Bot `/unlock` command** — verifies codes, asks for bureau via inline keyboard, upgrades role in Supabase
- **Bot `/start` flow** — matric number registration → kulliyyah selection → profile complete, auto-fills check-in form
- **Bot `/help` command** — shows available commands with role-aware messaging
- **Dark glassmorphism theme** — deep green gradient (`#0a2e23` → `#143a2e`), pale gold accents (`#E5D3B3`), Inter + Outfit fonts
- **Auto-filled check-in** — matric number and kulliyyah from bot registration flow into `mapSupabaseUser`, pre-filled in GPS check-in form
- **Service worker** — offline caching for core assets + map images
- **Telegram native** — haptic feedback, theme sync, fullscreen, confirm dialogs, LocationManager
- **Share to Chat** — 5 card templates rendered to 1080×1920 PNG via Canvas, uploaded to Supabase `story-cards` bucket, prepared via `savePreparedInlineMessage` Bot API call, shared natively via `webApp.shareMessage()` to any chat
- **SecureStorage** — encrypted JWT + user profile at rest via Telegram's native encrypted storage, with silent localStorage fallback
- **DeviceStorage** — offline caching for schedule, tasks, announcements, bureau ops, and student attendance via `useDeviceCache` hook with configurable TTL
- **downloadFile** — native Telegram download popup for share images and official schedule PDF, replacing browser `a.click()` workaround
- **Performance detection** — Telegram Android User-Agent parsing for hardware class (LOW/AVERAGE/HIGH) with automatic backdrop-filter disable and canvas resolution scaling on low-end devices
- **Offline check-in queue** — failed GPS submissions queued in localStorage and auto-retried on next app launch
- **Share surfaces** — Stories page (`/stories`), check-in success screen, streak widget, center menu "Share TawePro"

### Dashboard & Event Carousel

- **ColorSweepText animation** — gold → white → gold sweep using framer-motion `backgroundPositionX` keyframes on NOW badges
- **53-event live carousel** — CSS scroll-snap, multiple simultaneous NOW highlights with gold border + glow, auto-center on first live event
- **ONGOING badge** for concurrent events (e.g. ASNB booth)
- **Past/future peek cards** with edge labels
- **StreakWidget** — flame icon + attended count (3/8) + thin gold progress bar

### Interactive Schedule Timeline

- Two-column date navigator (Mon Jul 13 → Sun Jul 19) + scrollable event list
- Segmented toggle (Main / Concurrent sessions)
- Auto-select today + auto-scroll to NOW
- Time-aware card styling (PAST dimmed, NOW gold border + glow, UPCOMING default)
- Inline check-in buttons on live sessions → navigate to `/attendance` with pre-filled blockLabel, blockId, venueCodes
- Track labels for parallel sessions (Former CFS, Non-Former CFS)
- Session blocks: `getSessionBlocks()`, `getConcurrentEvents()`, `getRequiredBlockCount()` helpers

### GPS-Verified Session Check-In

- Glassmorphic check-in form: Full Name, Matric, Kulliyyah (auto-filled from bot registration, editable)
- **Telegram LocationManager API** — `webApp.LocationManager.getLocation()` for native mobile permission dialog, falls back to `navigator.geolocation` on desktop
- 200m Haversine radius verification against venue coordinates
- Scanning → Success → Failed GPS states with haptic feedback
- Submission persisted to Supabase `student_attendance` table (production) or localStorage (mock)
- Pulsating flame hero + 7-circle progress indicators + rewards milestone card (3/5/8)

### Navigation (Smart Schedule Navigator)

- 12 campus venues with categories (hall, mosque, clinic, mahallah, admin)
- 8 pre-computed walking routes with step-by-step directions and transition notes
- Campus Map page (`/map`) — campus overview with pinch-zoom + venue directory
- Navigate buttons on schedule items — auto-detects venue changes and offers route lookup
- Full-screen route planner modal — zoomable map, step cards, duration/distance summary
- Google Maps / Waze / Apple Maps — one-tap walking directions
- 53 schedule items annotated with venue codes for navigation

### Announcements

- Student public view (`/announcements`) — accordion cards, tap to expand full body
- 4 sample announcements with realistic content, links, and tags
- Urgent/emergency banners on dashboard with swipe-to-dismiss
- Mainboard create/deactivate via Control Room
- API mode: `tags[]` and `links[]` stored in `banners` table (JSONB + text[] columns added Phase 8)

### Committee Operations

- **Attendance punch card**: committee members upload selfies → Special Task reviews (with rejection reason) → mainboard visibility
- **Proof rejection notification**: committee members receive in-app notification when their proof is rejected, including reviewer's reason
- **POA task board** (`/tasks`): per-bureau CRUD with status (todo/in_progress/blocked/done) and priority. Heads can create tasks (Phase 8 fix).
- **Bureau operations workspace** (`/bureau`): 19 operations with status tracking. Permission-hardened — committee members can only update their own bureau's operations (Phase 8 fix).
- **Wellbeing** (`/wellbeing`): report form + Welfare dashboard. Report status update restricted to Welfare bureau + mainboard (Phase 8 fix).
- **Mainboard control room** (`/mainboard`): 6 tabs — Overview, Users, Schedule, Notices, News, Audit.
  - **Overview metrics**: now correctly pulls from API data in API mode (Phase 8 fix)
  - **Users tab**: manages real Supabase users via `users.list/update/revoke` RPC actions (Phase 8 fix)
  - **Schedule tab**: create, edit (Phase 8), publish/unpublish, delete schedule items. Venue code selector for navigation (Phase 8 fix)
  - **Announcements**: create with tags + links, deactivate
  - **Emergency broadcasts**: via Telegram Bot API with target role/bureau filtering
  - **Audit trail**: all admin actions logged

### Simulation Mode

- `demoNow = new Date(2026, 6, 15, 10, 0)` — July 15, 2026, 10:00 AM (Day 2, Wednesday)
- All schedule dates shifted to July 8–19, 2026 for real-time feature testing
- Day names corrected for July 2026 calendar

## Public Pages

| Route | Access | Content |
|---|---|---|
| `/` | All | Dashboard with event carousel, streak widget, urgent announcements |
| `/schedule` | All | Interactive timeline with date nav, toggle, auto-scroll to NOW |
| `/official-schedule` | All | Embedded IIUM PDF schedule |
| `/announcements` | All | Accordion announcement cards |
| `/attendance` | Student | GPS check-in form + attendance streak view |
| `/map` | All | Campus overview + venue directory + routes list |
| `/resources` | All | Dress code, emergency contacts, PDF link |
| `/stories` | All | 5 shareable cards (Wrapped, Achievement, Schedule, Check-In, Invite) |
| `/wellbeing` | All | Report form; Welfare dashboard if authorized |

## Committee Pages

| Route | Access | Content |
|---|---|---|
| `/attendance` | Committee+ | Daily selfie punch card; Special Task review queue with rejection reason |
| `/tasks` | Committee+ | POA task board with status + priority |
| `/bureau` | Committee+ | Bureau operations workspace (bureau-scoped permission) |
| `/mainboard` | Mainboard | 6-tab admin suite: Overview, Users (API-backed), Schedule (with edit + venue codes), Notices, News, Audit |
| `/launch` | Mainboard | Production readiness gate checks |

## API Architecture

Single RPC router (`api/rpc.js`) dispatches by `action` field — Vercel Hobby plan compatible (7 functions total):

| Action | Purpose | Auth |
|---|---|---|
| `wellbeing.list/submit/update` | Wellbeing reports CRUD | Role-scoped |
| `tasks.list/create/update` | POA tasks CRUD | Mainboard (+ Head for create) |
| `ops.list/update/alert` | Bureau operations | Bureau-scoped (Phase 8) |
| `notify.send/emergency` | Bot broadcasts | Mainboard |
| `schedule.list/create/publish/update` | Schedule CRUD | Mainboard (public list) |
| `announcements.list/create/deactivate` | News CRUD | Mainboard (public list) |
| `audit.list` | Audit log | Mainboard |
| `users.list/update/revoke` | User management (Phase 8) | Mainboard |
| `user.onboard` | Student matric/kulliyyah registration | Student |
| `attendance.submit/student.list/mainboard.list/review` | Student attendance | Role-scoped |

Standalone endpoints: `api/auth/telegram`, `api/invites/redeem`, `api/health`, `api/telegram/webhook`, `api/attendance/proofs`, `api/attendance/proofs/[id]/review`, `api/prepare-share`.

## Supabase Schema

10 tables: `users`, `invite_codes`, `schedule_items`, `wellbeing_reports`, `poa_tasks`, `attendance_proofs`, `bureau_operations`, `banners`, `notifications`, `audit_log`.

Plus: `static_locations`, `static_routes` (navigation), `student_attendance` (session check-in), `attendance-selfies` storage bucket (private), `story-cards` storage bucket (public, for share card uploads).

### Phase 9 Schema Changes

- `story-cards` storage bucket: public, with `to anon` RLS policies for select and insert
- `grant usage on schema app_private to anon` — allows anonymous storage access without crashing policy evaluation
- `users` table: `SecureStorage` stores encrypted JWT + profile alongside localStorage fallback

### Phase 8 Schema Changes

- `banners` table: added `tags text[] default '{}'` and `links jsonb default '[]'` columns
- `attendance_proofs` table: added `rejection_reason text` column
- `users` table: `registration_step` CHECK constraint updated to include `unlock_bureau:committee` and `unlock_bureau:head` values

Full RLS policies in `supabase/rls-policies.sql`.

## Project Structure

```
src/
├── features/navigation/         # Smart Schedule Navigator
│   ├── components/              # NavigateButton, RoutePlannerModal, RouteMapViewer
│   ├── data/                    # venues, routes, mapAssets
│   ├── hooks/                   # useRoutePlanner, useScheduleTransition
│   └── utils/                   # mapLinks (Google/Waze/Apple)
├── lib/                         # API modules: apiAuth, telegram, locationVerify,
│                                #   wellbeingApi, tasksApi, bureauOpsApi, scheduleApi,
│                                #   announcementsApi, attendanceApi, notifyApi,
│                                #   studentAttendanceApi, usersApi
│                                #   shareTemplates, shareToStory (Phase 9)
│                                #   secureStore, deviceCache, deviceInfo (Phase 9)
│                                #   apiHooks (Phase 9)
├── pages/                       # Dashboard, Schedule, Attendance, Announcements,
│                                #   Wellbeing, Tasks, BureauOps, Mainboard, etc.
│                                #   Stories (Phase 9)
├── components/                  # AppShell, CheckInForm, ColorSweepText, EventCarousel,
│                                #   StudentAttendanceView, StreakWidget, StatusBadge, etc.
│                                #   ShareButton (Phase 9)
├── state/                       # MockDataContext, MockUserContext
└── data/                        # mockData, eventSchedule (53 items), scheduleTime

api/
├── rpc.js                       # Consolidated router (23 actions)
├── _lib/                        # auth-utils, supabase, telegram-bot,
│                                #   wellbeing-utils, tasks-utils, bureau-ops-utils,
│                                #   attendance-utils
├── auth/telegram.js
├── invites/redeem.js
├── attendance/proofs.js + [id]/review.js
├── telegram/webhook.js          # Bot: /start, /unlock, /help
├── prepare-share.js             # Bot API savePreparedInlineMessage (Phase 9)
└── health.js

public/assets/maps/
├── campus-overview.webp
└── routes/                      # 8 route images (WebP)

supabase/
└── schema.sql                   # Full DDL with Phase 8 additions
```

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
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEB_APP_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
COMMITTEE_ACCESS_CODES=
HEAD_ACCESS_CODES=
MAINBOARD_ACCESS_CODES=
```

## Commands

```bash
npm install
npm run dev          # Local development (mock mode)
npm run build        # Production build
npm run smoke:auth   # Auth bridge smoke test
```

## Production Checklist (Phase 8)

- [x] Mainboard Overview metrics use API data (not stale mock)
- [x] Announcement tags/links preserved from form to DB to render
- [x] Bureau heads can create tasks (not just mainboard)
- [x] Invite code expiry dates set after event (Aug 2026)
- [x] Announcement body text updated to July 2026 dates
- [x] Bureau operation updates restricted to member's own bureau
- [x] Wellbeing report status update restricted to Welfare/mainboard
- [x] Double user add on API access code redeem fixed
- [x] Attendance proof rejection includes reason + notifies committee member
- [x] Venue codes in schedule creation form
- [x] Schedule items can be edited (not just create/delete)
- [x] User management backed by real Supabase API (list/update/revoke)
- [x] `registration_step` CHECK constraint includes `unlock_bureau:*` values
- [x] GPS LocationManager support for Telegram mobile
- [x] Auto-filled matric/kulliyyah in check-in form from bot registration
- [x] All 53 event cards with multiple simultaneous NOW highlights
- [x] README.md updated with all current features

## Deployment

1. Run `supabase/schema.sql` migrations against Supabase project
2. Set all environment variables in Vercel dashboard
3. Set Telegram bot webhook: `POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={VERCEL_URL}/api/telegram/webhook&secret_token={WEBHOOK_SECRET}`
4. Deploy via `git push` to Vercel-connected branch

## What's New

### Phase 7 (Design + Core UX)
- Dark glassmorphism theme with deep green gradient, pale gold accents
- 53-event live carousel with ColorSweepText animation and multiple NOW highlights
- Interactive schedule timeline with two-column layout, date nav, segmented toggle
- Session blocks with concurrent event support
- GPS-verified session check-in with Telegram LocationManager support
- Auto-filled matric/kulliyyah from bot registration
- Bot `/unlock` command, `/help` command, role-aware messages
- Student attendance view with streak widget and milestone tracking
- Date shift to July 13–19, 2026 for real-time simulation testing

### Phase 8 (Production Finalization)
- Mainboard Overview metrics fixed for API mode
- Announcement tags/links persisted end-to-end
- Bureau head task creation permission
- Bureau operation permission hardening (bureau-scoped)
- Wellbeing report permission hardening (Welfare/mainboard only)
- Attendance proof rejection with reason + notification to committee member
- Schedule item edit functionality (full field update)
- Venue code selector in schedule creation form
- User management API (list/update/revoke) backed by Supabase
- Fixed invite code expiry dates and announcement body text
- Double user add on API access code redeem eliminated
- `registration_step` CHECK constraint updated for unlock flow
- README.md and milestone.md documentation updates

### Phase 9 (Telegram Bot API 8.0+ Integration)
- **Share to Chat** — 5 card templates (Wrapped, Achievement, Schedule, Check-In, Invite) rendered via Canvas to 1080×1920 PNG, uploaded to public `story-cards` Supabase bucket, prepared via `savePreparedInlineMessage` Bot API call, shared natively via `webApp.shareMessage()` with 60s timeout
- **Share to Story** — `uploadAndShareStory()` posts directly to Telegram Story via `webApp.shareToStory()` with caption and widget link
- **`api/prepare-share.js`** — Vercel serverless function: accepts `{ imageUrl, userId, caption }`, calls Bot API `savePreparedInlineMessage` with `InlineQueryResultPhoto`, returns `{ messageId }`
- **`src/lib/shareTemplates.ts`** — 5 Canvas renderers at 1080×1920 with brand header, gold divider, hashtag footer, and `roundRect` helper
- **`src/lib/shareToStory.ts`** — upload pipeline (Supabase Storage), `shareToChat()` (prepare-share → shareMessage), `uploadAndShareStory()` (shareToStory), `downloadImageAsFile()` (downloadFile with browser fallback)
- **`src/components/ShareButton.tsx`** — reusable Send button with thinking-orb loading, inline error banner, and fullscreen image preview overlay with close button, native download, and copy link
- **`src/pages/Stories.tsx`** — 5-card grid with real attendance/schedule/venue/GPS data, staggered `framer-motion` animations, and ShareButton per card
- **Share surfaces** — check-in success screen (`CheckInForm.tsx`), streak widget Send button (`StreakWidget.tsx`), center menu "Share TawePro" (`AppShell.tsx`)
- **SecureStorage** — `src/lib/secureStore.ts`: encrypted JWT + user profile at rest via `webApp.SecureStorage`, with `localStorage` fallback; `apiAuth.ts` dual-storage pattern (SecureStorage source of truth, localStorage sync cache)
- **DeviceStorage** — `src/lib/deviceCache.ts`: `useDeviceCache<T>()` React hook with TTL; `src/lib/apiHooks.ts`: cache-enabled hooks for schedule, tasks, announcements, bureau ops, and attendance; `MockDataContext.tsx` student attendance migrated to DeviceStorage
- **Offline check-in queue** — `CheckInForm.tsx`: failed GPS submissions saved to localStorage queue, auto-retried on mount
- **downloadFile** — `downloadImageAsFile()` uses `webApp.downloadFile()` native popup; Official Schedule PDF page offers native "Download PDF" button
- **Performance detection** — `src/lib/deviceInfo.ts`: parses Telegram Android User-Agent for manufacturer, model, performance class; sets `data-performance` attribute on `<html>`; CSS disables `backdrop-filter: blur()` on LOW devices; canvas resolution halved on LOW
- **Community link** — `webhook.js` `/start` message includes `https://t.me/taweprohelp` join link
- **Supabase fixes** — `story-cards` bucket with `to anon` RLS policies for select and insert; `grant usage on schema app_private to anon` — prevents policy evaluation crashes on anonymous storage access
- **Harden storage calls** — all Telegram storage API calls use `typeof` function checks + `try/catch` wrapping to survive unsupported features (SecureStorage returning UNSUPPORTED on older clients)
- **Button label defaults** — switched from "Share to Story" to "Send to Chat" with Send icon across all share surfaces
