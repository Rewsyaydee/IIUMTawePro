# Backend Wiring Checklist

Use this checklist when moving from the current mock prototype to a real IIUM Ta'aruf Week production build.

## What You Need To Provide

- Telegram bot username.
- Telegram bot token, stored only in the server environment.
- Supabase project URL.
- Supabase publishable key, stored as the browser-safe `VITE_SUPABASE_ANON_KEY`.
- Supabase secret or service role key, stored only in the server environment.
- Supabase JWKS URL if using Supabase signing key discovery.
- Supabase JWT secret or signing strategy for custom claims.
- Final event dates, venues, and published programme.
- Final committee list with name, role, and bureau; Telegram ID can be captured on first Mini App entry.
- Decision on whether students self-register publicly or through invite links.
- Manual committee access-code policy and final bureau/role assignment rules.

## Build Sequence

1. Create Supabase project.
2. Review and run `supabase/schema.sql`.
3. Review and run `supabase/rls-policies.sql`.
4. Create private storage bucket `attendance-selfies`.
5. Add serverless API routes from `docs/server-endpoints.md`.
6. Use the auth bridge in `docs/auth-bridge.md`.
7. Implement Telegram `initData` verification.
8. Issue Supabase JWT with `app_user_id`, `app_role`, `bureau`, and `telegram_id`.
9. Support guest student public entry through Telegram Mini App.
10. Support committee/head access-code redemption after guest entry.
11. Replace mock providers with API-backed providers.
12. Connect attendance selfie upload to private storage.
13. Connect official notices and emergency broadcasts to Telegram Bot API.
14. Run rehearsal with student, committee, head, Special Task, and mainboard users.
15. Disable mock mode and remove the preview role switcher from production.

## Release Blockers

- Mock role switcher visible in production.
- Mock data enabled in production.
- Telegram initData not verified server-side.
- Bot token exposed to the browser.
- Service role key exposed to the browser.
- Attendance selfies stored in browser state instead of private storage.
- Mainboard controls reachable by non-mainboard users.
- Special Task review skipped before mainboard attendance visibility.
- Emergency broadcast lacks audit logging.

## Recommended Environment Values

Client-safe values:

```env
VITE_APP_MODE=production
VITE_ENABLE_MOCKS=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
VITE_API_BASE_URL=https://your-api-domain.example
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

Server-only values:

```env
TELEGRAM_BOT_TOKEN=server-only
SUPABASE_SERVICE_ROLE_KEY=server-only
SUPABASE_SECRET_KEY=server-only
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_SECRET=server-only
```

## Current Real Integration Status

All targets completed:

- `/api/auth/telegram` validates Telegram users, persists `public.users`, and returns the app session + Supabase JWT.
- `/api/invites/redeem` upgrades the same Telegram user to committee/head/mainboard-compatible app access. Supports Supabase `invite_codes` table with env-code fallback.
- `/api/attendance/proofs` stores daily selfie punch cards in private Supabase Storage and writes `attendance_proofs`.
- `/api/attendance/proofs/:id/review` lets Special Task approve or reject before mainboard visibility.
- `/api/rpc` consolidated router (Vercel Hobby plan — 7 functions total):
  - `wellbeing.*` — wellbeing report CRUD with Welfare/mainboard auth
  - `tasks.*` — POA task CRUD with bureau-scoped visibility
  - `ops.*` — bureau operations with status tracking + bureau alerts via Telegram Bot
  - `notify.*` — official notices and emergency broadcasts via Telegram Bot API
  - `schedule.*` — schedule publishing with mainboard-only auth
  - `announcements.*` — public read + mainboard create/deactivate
  - `audit.list` — mainboard audit trail view
- `/api/health` deployment readiness endpoint.

## Production Checklist

- [ ] Mainboard admin suite API integration (notices, schedule, announcements wired)
- [ ] Disable mock mode: `VITE_ENABLE_MOCKS=false`
- [ ] Remove role switcher from production
- [ ] Final rehearsal with all 4 roles (student, committee, head, mainboard)
