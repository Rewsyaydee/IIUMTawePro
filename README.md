# 🕌 IIUM Ta'aruf Week — Telegram Mini App

<p align="center">
  <img src="public/assets/iium-logo.png" alt="IIUM Logo" width="80" />
</p>

<p align="center">
  <strong>"Garden of Knowledge and Virtue"</strong><br>
  <em>Production-ready event companion for 2,000+ new intake students · July 13–19, 2026</em>
</p>

<p align="center">
  <a href="https://t.me/iiumtaweprobot"><img src="https://img.shields.io/badge/Open_in-Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Open in Telegram" /></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

---

## 🚀 Try It Now

**Open the app in Telegram:**  
👉 **[t.me/iiumtaweprobot](https://t.me/iiumtaweprobot)**

No install. No sign-up. Just open the link in Telegram and you're in.

Students enter as guests. Committee members unlock their workspace with `/unlock <code>` in the bot chat.

---

## What Is This?

Every semester, **IIUM** welcomes thousands of new students through **Ta'aruf Week** — a 2-week orientation programme with 50+ sessions across 12 venues. Students move between ICC Main Hall, SHAS Mosque, the Auditorium, clinics, and mahallahs. They need to know:

- 📍 **Where to go next** — and how to get there
- 📢 **What's happening now** — urgent announcements, schedule changes
- 🆘 **Where to get help** — wellbeing reports, emergency contacts
- 🎯 **What's expected of them** — dress code, prayer times, session rules
- ✅ **Where they need to check in** — GPS-verified attendance at each venue

**This app solves all five problems in one place.** It runs entirely inside Telegram — no browser, no app store, no login screens. Just tap and go.

---

## ✨ What Makes This App Different

### 🌙 Dark Glassmorphism Design

The entire app uses a **deep green gradient** (`#0a2e23` → `#143a2e`) with **pale gold accents** (`#E5D3B3`), glassmorphic cards with backdrop blur, and Inter + Outfit typography. The header centers the IIUM mark with a role-aware greeting ("Salam, {firstName}") and avatar.

- **Glassmorphic cards** with `backdrop-filter: blur()` throughout
- **ColorSweepText animation** — the NOW badge sweeps gold → white → gold infinitely using `framer-motion` `backgroundPositionX` keyframes
- **Pulsating flame hero** on the attendance view with 7-circle progress indicators
- **Role theming** — subtle color palette shifts per role so there's no confusion about context

---

### 📅 Interactive Schedule Timeline

A two-column layout with a **date navigator** on the left (Mon Jul 13 → Sun Jul 19) and a scrollable event list on the right:

- **Segmented toggle** — switch between Main Schedule and Concurrent Sessions
- **Auto-select today** — the date navigator highlights the current day on load
- **Auto-scroll to NOW** — the timeline scrolls to the first live event
- **Time-aware card styling** — PAST (dimmed), NOW (gold border + glow), UPCOMING (default)
- **Inline check-in buttons** — tap "Check In" on any live session to jump to the attendance form with the block label and venue codes pre-filled
- **Track labels** — "Former CFS", "Non-Former CFS" shown on concurrent session cards

---

### 🎠 53-Event Live Carousel

The dashboard carousel shows **all 53 individual event cards** from the official schedule:

- **CSS scroll-snap** carousel with auto-center on the first live event
- **Multiple simultaneous NOW highlights** — every live event gets a gold border + glow + ColorSweepText NOW badge
- **Ongoing badge** — concurrent events (e.g. ASNB booth) show a blue ONGOING badge
- **Past/future peek cards** with edge labels for context
- **Check-in + Navigate buttons** on every live card

---

### ✅ GPS-Verified Session Check-In

Students check in at each venue with a **glassmorphic form** that includes:

- **Auto-filled fields** — Full Name, Matric Number, and Kulliyyah are pre-populated from the user's Telegram bot registration (still editable)
- **GPS location verification** — 200m radius check using Haversine distance
- **Telegram LocationManager support** — uses `webApp.LocationManager.getLocation()` (native Telegram permission dialog) on mobile, falls back to `navigator.geolocation` on desktop browsers
- **Scanning / Success / Failed states** with haptic feedback on each transition
- **Submit button locked** until GPS is verified and all fields are filled
- **Attendance persistence** — writes to Supabase (production) or localStorage (mock mode)
- **Streak widget** — flame icon + attended count (3/8) + thin gold progress bar on the dashboard

---

### 📢 Real-Time Announcements, Beautifully Designed

No more scrolling through messy Telegram channel messages. Announcements are structured, searchable, and interactive:

- **Accordion cards** — tap to expand, swipe to dismiss
- **Emergency/Urgent/Info** priority levels with color-coded badges
- **External links** (Google Forms, WhatsApp groups) rendered as pill buttons
- **Hashtag tags** for categorization (#wake-up, #lost-found, #kulliyyah)
- **Urgent banners** on the dashboard that students can't miss
- **Spring-physics swipe gestures** — cards feel native, with bouncy dismissal

---

### 🗺️ Smart Campus Navigation That Actually Works

Forget getting lost between ICC and SHAS Mosque. **Every schedule item detects the next venue change** and offers a one-tap Navigate button:

<p align="center">
  <em>ICC Main Hall → SHAS Mosque · 3 min · 280m</em>
</p>

- **8 pre-computed walking routes** with step-by-step directions, landmarks, and prayer notes
- **Pinch-zoom campus map** with all 12 venues categorized by type
- **One-tap Google Maps / Waze / Apple Maps** for real walking directions
- **15-minute transition reminders** — "Next: ICC Main Hall → SHAS Mosque in 15 min"
- **Offline-ready** — all map images cached by service worker, works with bad campus reception

---

### 🤝 A Complete Committee Operations Hub

This isn't just a student app. It's a **full event management platform** with four role tiers:

| Role | What They Can Do |
|---|---|
| 🧑‍🎓 **Student** | View schedule, navigate venues, check in with GPS, read announcements, get help |
| 👔 **Committee** | Manage bureau tasks, submit attendance selfies, update operations |
| 👑 **Head of Bureau** | Oversee bureau operations, update readiness, send alerts |
| 🛡️ **Mainboard** | Admin suite: users, invite codes, schedule publishing, emergency broadcasts, audit trail |

**8 bureaus supported:** Catering · PrepTech · Registration · Program Coordinator · Special Task · Discipline · Multimedia · Welfare

**Unlocking committee access** is done entirely through the Telegram bot:

1. Student sends `/unlock <CODE>` in the bot chat
2. Bot verifies the code against `COMMITTEE_ACCESS_CODES` / `HEAD_ACCESS_CODES` / `MAINBOARD_ACCESS_CODES` env vars
3. If committee or head → bot asks which bureau (inline keyboard with 8 options)
4. User taps their bureau → role + bureau saved to Supabase → dashboard keyboard sent
5. If mainboard → role upgraded directly, no bureau needed

---

### 🔐 Telegram-Native Auth That Just Works

- **Zero sign-up** — students enter as guests via Telegram Mini App
- **Bot registration flow** — `/start` prompts for matric number → kulliyyah selection (inline keyboard) → profile complete
- **`/unlock` command** — committee/head/mainboard codes verified via bot, bureau selection via inline keyboard
- **`/help` command** — shows available commands
- **Role-aware messages** — welcome back shows role, attendance count `/8`, and role-appropriate keyboard
- **Auto-filled check-in form** — matric number and kulliyyah from bot registration are passed to the frontend auth session and pre-filled in the check-in form
- **Supabase JWT** with role and bureau claims for fine-grained authorization
- **Row-Level Security** on all 10 database tables — nobody sees data they shouldn't
- **Attendance selfies** stored in private Supabase Storage — Special Task reviews before mainboard visibility

---

### ⚡ Built for Production, Not Just Demos

- **7 Vercel serverless functions** (way under the Hobby plan limit) serving **18 API actions** via a single RPC router
- **Telegram Bot API** integration for real push notifications, `/unlock` command, and registration flow
- **Telegram LocationManager API** for native GPS permission on mobile (falls back to browser Geolocation on desktop)
- **Service worker** caches everything offline — maps, assets, pages
- **Haptic feedback** on every button press — the app *feels* native
- **Dark glassmorphism** theme synced with Telegram's color scheme
- **Simulation mode** — `demoNow` set to July 15, 2026 (Day 2, Wednesday) for real-time testing of time-aware features

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Telegram Mini App                     │
│                 (React + TypeScript + Vite)             │
├──────────────────────────────────────────────────────┤
│  Student View      │  Committee Ops   │  Mainboard    │
│  - Schedule TL     │  - Task Board    │  - User Mgmt  │
│  - Event Carousel  │  - Punch Cards   │  - Schedule   │
│  - GPS Check-In    │  - Bureau Ops    │  - Emergency   │
│  - Streak Widget   │  - Attendance    │  - Audit Trail│
│  - Navigation      │                  │               │
│  - Announcements   │                  │               │
│  - Wellbeing       │                  │               │
├──────────────────────────────────────────────────────┤
│  Components: CheckInForm · ColorSweepText ·           │
│  EventCarousel · StudentAttendanceView · StreakWidget │
├──────────────────────────────────────────────────────┤
│  Location: LocationManager API → geolocation fallback  │
├──────────────────────────────────────────────────────┤
│              api/rpc.js (Single Router)                │
│              18 actions / 1 function                   │
├──────────────────────────────────────────────────────┤
│  api/telegram/webhook.js — Bot: /start /unlock /help   │
├──────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + Storage)           │
│        10 tables · RLS Policies · JWT Auth             │
└──────────────────────────────────────────────────────┘
```

**Why a single router?** Vercel Hobby plan limits projects to 12 serverless functions. By consolidating 7 endpoints (wellbeing, tasks, bureau ops, notifications, emergency, schedule, announcements) into one `api/rpc.js` dispatcher, we run at 7 total — less than 60% of the limit with room to grow.

---

## 📋 Feature Checklist

### Core Schedule & Navigation
- [x] 53-item real event schedule from official IIUM markdown (July 13–19, 2026)
- [x] 12 campus venues with categories and route data
- [x] 8 pre-computed walking routes with step-by-step directions
- [x] Campus map with pinch-zoom and venue directory
- [x] Google Maps / Waze / Apple Maps one-tap directions
- [x] Navigate buttons on schedule (auto-detects venue changes)
- [x] 15-minute proactive transition reminders

### Interactive Schedule Timeline
- [x] Two-column date navigator + event list layout
- [x] Segmented toggle (Main / Concurrent sessions)
- [x] Auto-select today + auto-scroll to NOW
- [x] Time-aware card styling (PAST / NOW / UPCOMING)
- [x] Inline check-in buttons on live sessions
- [x] Track labels for parallel sessions (Former CFS, etc.)

### Event Carousel
- [x] 53 individual event cards with CSS scroll-snap
- [x] Multiple simultaneous NOW highlights (gold border + glow)
- [x] ColorSweepText animated NOW badge (framer-motion)
- [x] ONGOING badge for concurrent events
- [x] Auto-center on first live event
- [x] Check-in + Navigate buttons on every live card

### Attendance & Check-In
- [x] GPS-verified session check-in (200m Haversine radius)
- [x] Telegram LocationManager API (native mobile permission)
- [x] Browser Geolocation fallback (desktop)
- [x] Auto-filled Full Name, Matric, Kulliyyah from bot registration
- [x] Glassmorphic check-in form with editable fields
- [x] Scanning / Success / Failed GPS states with haptic feedback
- [x] Submit locked until GPS verified + fields filled
- [x] Streak widget — flame icon + 3/8 progress bar
- [x] Pulsating flame hero + 7-circle milestone indicators
- [x] Rewards milestone card (3 / 5 / 8 sessions)

### Announcements & Wellbeing
- [x] Announcements system with accordion cards + swipe-to-dismiss
- [x] Emergency broadcast via Telegram Bot API
- [x] Wellbeing report form + Welfare dashboard (Supabase-backed)

### Committee Operations
- [x] POA task board per bureau with priority/status tracking
- [x] Bureau operations workspace (19 tools across 8 bureaus)
- [x] Attendance punch card with selfie upload + Special Task review
- [x] Mainboard admin suite (users, invites, schedule, notices, audit)

### Telegram Bot
- [x] `/start` — registration flow (matric → kulliyyah), welcome back with profile
- [x] `/unlock <CODE>` — committee/head/mainboard access code verification
- [x] Bureau selection via inline keyboard (8 bureaus)
- [x] `/help` — command reference
- [x] Role-aware messages and keyboards
- [x] Conversational tone with emoji and warm language

### Design & UX
- [x] Dark glassmorphism theme (deep green + pale gold)
- [x] ColorSweepText animation (gold → white → gold sweep)
- [x] Inter + Outfit typography
- [x] Glassmorphic cards with backdrop blur
- [x] Role-based theming (4 color palettes)
- [x] Haptic feedback on all interactions
- [x] Service worker offline caching (maps, assets)
- [x] Simulation mode (demoNow = July 15, 2026)

### Auth & Backend
- [x] Telegram auth bridge with Supabase JWT + RLS
- [x] Auto-filled matric/kulliyyah from bot registration → check-in form
- [x] Deployed on Vercel, ready for production

---

## 🛠️ Quick Start

```bash
# Clone the repo
git clone https://github.com/Rewsyaydee/IIUMTawePro.git
cd IIUMTawePro

# Install dependencies
npm install

# Start dev server
npm run dev
```

Then open **[t.me/iiumtaweprobot](https://t.me/iiumtaweprobot)** in Telegram to test the live production app.

```bash
# Run auth smoke test
npm run smoke:auth

# Production build
npm run build
```

### Database Setup

Run the SQL in `supabase/schema.sql` against your Supabase project. Key tables:

- `public.users` — telegram_id, name, role, bureau, matric_number, kulliyyah, registration_step
- `public.student_attendance` — user_id, schedule_item_id, event_title, student_name, matric_number, kulliyyah, latitude, longitude, status
- `public.invite_codes` — code, role, bureau, used_by, created_by
- `public.schedule_items`, `public.poa_tasks`, `public.bureau_operations`, `public.notifications`, `public.audit_log`

The `registration_step` column uses a CHECK constraint that allows: `matric`, `kulliyyah`, `change_matric`, `change_kulliyyah`, `unlock_bureau:committee`, `unlock_bureau:head`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot API token for webhook + notifications |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token for webhook verification |
| `TELEGRAM_WEB_APP_URL` | Mini App URL (your Vercel deployment) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side operations |
| `SUPABASE_JWT_SECRET` | JWT signing secret |
| `COMMITTEE_ACCESS_CODES` | Comma-separated committee unlock codes |
| `HEAD_ACCESS_CODES` | Comma-separated head unlock codes |
| `MAINBOARD_ACCESS_CODES` | Comma-separated mainboard unlock codes |
| `VITE_ENABLE_MOCKS` | Set to `"false"` for production mode |
| `VITE_API_AUTH_BRIDGE` | Set to `"true"` to use API auth instead of mock |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 8 |
| Routing | React Router 6 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (private buckets) |
| Auth | Telegram initData + Supabase JWT |
| Location | Telegram LocationManager API + Browser Geolocation |
| Maps | Google Maps / Waze / Apple Maps URLs |
| Notifications | Telegram Bot API |
| Caching | Service Worker (CacheStorage) |
| Hosting | Vercel |

---

## 📚 Technical Documentation

For architecture details, API endpoint contracts, database schema, environment variables, and deployment guidance, see:

👉 **[milestone.md](milestone.md)** — Full Phase 7 technical reference

---

## 📱 Screenshots

<p align="center">
  <em>Add your screenshots below!</em>
</p>

| Student Dashboard | Schedule Timeline | Event Carousel |
|---|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Schedule](screenshots/schedule.png) | ![Carousel](screenshots/carousel.png) |

| GPS Check-In | Attendance Streak | Campus Map |
|---|---|---|
| ![CheckIn](screenshots/checkin.png) | ![Streak](screenshots/streak.png) | ![Map](screenshots/map.png) |

| Announcements | Committee Tasks | Bot Chat |
|---|---|---|
| ![News](screenshots/news.png) | ![Tasks](screenshots/tasks.png) | ![Bot](screenshots/bot.png) |

---

<p align="center">
  <strong>#TaweAuTaraweh #EHHTaweAhh</strong><br>
  <em>Built with ❤️ for the IIUM community</em>
</p>
