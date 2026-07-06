# TWA Event Ops

Phase 6 prototype for the event-only Telegram Mini App.

## Current scope

- React, TypeScript, Vite SPA
- Vercel-ready routing with `vercel.json`
- Fixed roles: student, committee, head of bureau, mainboard
- Fixed bureaus, including Welfare for wellbeing operations
- Guest student public view by default
- Manual committee/head access-code flow for whitelist access
- Collapsed preview role switcher for local development
- Public schedule imported from the provided Semester 2, 2025/2026 Ta'aruf Week markdown
- Public official IIUM PDF schedule viewer at `/official-schedule`
- Public resources and emergency contacts
- Wellbeing report form and Welfare dashboard
- Committee/head/mainboard POA task board
- Mainboard emergency broadcast mock with in-app banners
- Telegram theme, haptic, native confirm, and browser fallbacks
- Phase 2 bureau operations workspace for all fixed bureaus
- Mock bureau group alerts for operational updates
- Phase 3 mainboard admin suite with invite codes, local user management, schedule publishing, official notices, and audit trail
- Mock accountability records for sensitive flows such as emergency broadcasts, attendance review, and access changes
- Phase 4 launch readiness screen for mainboard-only production gate checks
- Backend production contract in `docs/production-contract.md`
- Phase 5 Supabase schema and RLS policy drafts in `supabase/`
- Server endpoint contracts and backend wiring checklist in `docs/`
- Supabase-backed Telegram auth bridge in `api/`
- Frontend auth bridge client for guest and access-code login with persisted app session
- Deployment health endpoint and local auth smoke check
- Deployment guidance in `docs/deployment-plan.md`
- IIUM branding notes in `docs/branding-notes.md`
- IIUM logo asset in app header and startup loading screen
- Telegram fullscreen and vertical swipe behavior request on app startup when supported

## Next production phase

- Finish replacing mock operational data with Supabase reads/writes
- Keep Supabase tables, RLS policies, and custom JWT claims reviewed before launch
- Wire real serverless API routes for reports, invites, notifications, schedule publishing, and audit logs
- Replace mock notification records with Telegram Bot API sends
- Split each bureau operation record into its production Supabase table
- Add mainboard-only production authorization checks for admin endpoints
- Move attendance selfie proof to private storage with signed review URLs
- Replace environment-code lookup with Supabase `invite_codes` records
- Replace the bundled official PDF if IIUM publishes a newer schedule revision

## Commands

```bash
npm install
npm run dev
npm run build
npm run smoke:auth
```
