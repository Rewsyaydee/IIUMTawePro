# 🕌 IIUM Ta'aruf Week — Telegram Mini App

<p align="center">
  <img src="public/assets/iium-logo.png" alt="IIUM Logo" width="80" />
</p>

<p align="center">
  <strong>"Garden of Knowledge and Virtue"</strong><br>
  <em>Production-ready event companion for 2,000+ new intake students</em>
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

Students enter as guests. Committee members unlock their workspace with an access code.

---

## What Is This?

Every semester, **IIUM** welcomes thousands of new students through **Ta'aruf Week** — a 2-week orientation programme with 50+ sessions across 12 venues. Students move between ICC Main Hall, SHAS Mosque, the Auditorium, clinics, and mahallahs. They need to know:

- 📍 **Where to go next** — and how to get there
- 📢 **What's happening now** — urgent announcements, schedule changes
- 🆘 **Where to get help** — wellbeing reports, emergency contacts
- 🎯 **What's expected of them** — dress code, prayer times, session rules

**This app solves all four problems in one place.** It runs entirely inside Telegram — no browser, no app store, no login screens. Just tap and go.

---

## ✨ What Makes This App Different

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

### 📢 Real-Time Announcements, Beautifully Designed

No more scrolling through messy Telegram channel messages. Announcements are structured, searchable, and interactive:

- **Accordion cards** — tap to expand, swipe to dismiss
- **Emergency/Urgent/Info** priority levels with color-coded badges
- **External links** (Google Forms, WhatsApp groups) rendered as pill buttons
- **Hashtag tags** for categorization (#wake-up, #lost-found, #kulliyyah)
- **Urgent banners** on the dashboard that students can't miss
- **Spring-physics swipe gestures** — cards feel native, with bouncy dismissal

---

### 🤝 A Complete Committee Operations Hub

This isn't just a student app. It's a **full event management platform** with four role tiers:

| Role | What They Can Do |
|---|---|
| 🧑‍🎓 **Student** | View schedule, navigate venues, read announcements, get help |
| 👔 **Committee** | Manage bureau tasks, submit attendance selfies, update operations |
| 👑 **Head of Bureau** | Oversee bureau operations, update readiness, send alerts |
| 🛡️ **Mainboard** | Admin suite: users, invite codes, schedule publishing, emergency broadcasts, audit trail |

**8 bureaus supported:** Catering · PrepTech · Registration · Program Coordinator · Special Task · Discipline · Multimedia · Welfare

---

### 🔐 Telegram-Native Auth That Just Works

- **Zero sign-up** — students enter as guests via Telegram Mini App
- **Committee access codes** — redeem a code, role upgrades instantly
- **Supabase JWT** with role and bureau claims for fine-grained authorization
- **Row-Level Security** on all 10 database tables — nobody sees data they shouldn't
- **Attendance selfies** stored in private Supabase Storage — Special Task reviews before mainboard visibility

---

### ⚡ Built for Production, Not Just Demos

- **7 Vercel serverless functions** (way under the Hobby plan limit) serving **18 API actions** via a single RPC router
- **Telegram Bot API** integration for real push notifications — not mock, not simulated
- **Service worker** caches everything offline — maps, assets, pages
- **Role theming** — subtle color palette shifts per role so there's no confusion about context
- **Haptic feedback** on every button press — the app *feels* native
- **Dark mode** fully supported, synced with Telegram's theme

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Telegram Mini App                     │
│                 (React + TypeScript + Vite)             │
├──────────────────────────────────────────────────────┤
│  Student View    │  Committee Ops   │  Mainboard Admin │
│  - Schedule      │  - Task Board    │  - User Mgmt     │
│  - Navigation    │  - Punch Cards   │  - Schedule Pub  │
│  - Announcements │  - Bureau Ops    │  - Emergency     │
│  - Wellbeing     │  - Attendance    │  - Audit Trail   │
├──────────────────────────────────────────────────────┤
│              api/rpc.js (Single Router)                │
│              18 actions / 1 function                   │
├──────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + Storage)           │
│        10 tables · RLS Policies · JWT Auth             │
└──────────────────────────────────────────────────────┘
```

**Why a single router?** Vercel Hobby plan limits projects to 12 serverless functions. By consolidating 7 endpoints (wellbeing, tasks, bureau ops, notifications, emergency, schedule, announcements) into one `api/rpc.js` dispatcher, we run at 7 total — less than 60% of the limit with room to grow.

---

## 📋 Feature Checklist

- [x] 53-item real event schedule from official IIUM markdown
- [x] 12 campus venues with categories and route data
- [x] 8 pre-computed walking routes with step-by-step directions
- [x] Campus map with pinch-zoom and venue directory
- [x] Google Maps / Waze / Apple Maps one-tap directions
- [x] Navigate buttons on schedule (auto-detects venue changes)
- [x] 15-minute proactive transition reminders
- [x] Announcements system with accordion cards + swipe-to-dismiss
- [x] Emergency broadcast via Telegram Bot API
- [x] Wellbeing report form + Welfare dashboard (Supabase-backed)
- [x] POA task board per bureau with priority/status tracking
- [x] Bureau operations workspace (19 tools across 8 bureaus)
- [x] Attendance punch card with selfie upload + Special Task review
- [x] Mainboard admin suite (users, invites, schedule, notices, audit)
- [x] Telegram auth bridge with Supabase JWT + RLS
- [x] Role-based theming (4 color palettes)
- [x] Dark mode support
- [x] Haptic feedback on all interactions
- [x] Service worker offline caching (maps, assets)
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

| Student Dashboard | Schedule + Navigate | Route Planner |
|---|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Schedule](screenshots/schedule.png) | ![Route](screenshots/route.png) |

| Campus Map | Announcements | Committee Tasks |
|---|---|---|
| ![Map](screenshots/map.png) | ![News](screenshots/news.png) | ![Tasks](screenshots/tasks.png) |

---

<p align="center">
  <strong>#TaweAuTaraweh #EHHTaweAhh</strong><br>
  <em>Built with ❤️ for the IIUM community</em>
</p>
