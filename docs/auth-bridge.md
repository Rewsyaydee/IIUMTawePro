# Auth Bridge

Phase 6 now includes the server-backed Telegram authentication path for app users.

## Current Endpoints

- `POST /api/auth/telegram`
- `POST /api/invites/redeem`
- `GET /api/health`

Both endpoints:

- Accept Telegram `initData`.
- Verify Telegram signature when `TELEGRAM_BOT_TOKEN` is configured.
- Allow local stub mode outside production.
- Return guest student access by default.
- Upgrade to committee/head/mainboard only when a valid server-side code is supplied.
- Persist the Telegram user to `public.users` when Supabase server credentials are configured.
- Return the saved Supabase user UUID to the frontend so the app session uses the real user row.

When a Telegram user opens the Mini App again, `/api/auth/telegram` preserves the saved Supabase role and bureau instead of downgrading the user back to student.

## Frontend Switches

Local mock mode:

```env
VITE_ENABLE_MOCKS=true
VITE_API_AUTH_BRIDGE=false
```

API bridge mode:

```env
VITE_ENABLE_MOCKS=false
VITE_API_AUTH_BRIDGE=true
```

## Server Code Variables

```env
COMMITTEE_ACCESS_CODES=<shared-committee-code>
HEAD_ACCESS_CODES=
MAINBOARD_ACCESS_CODES=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

Use comma-separated values for multiple codes. Keep these server-side only. `SUPABASE_SECRET_KEY` is the newer `sb_secret_...` key. `SUPABASE_SERVICE_ROLE_KEY` is the legacy service-role JWT key; only one of those server keys is required.

## Production Requirements

- Set `TELEGRAM_BOT_TOKEN`.
- Set `SUPABASE_URL`.
- Set either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- Set `SUPABASE_JWT_SECRET` when issuing Supabase custom JWTs for direct client-side Supabase calls.
- Replace the environment-code lookup with Supabase `invite_codes`.
- Never accept default development codes in production.

## Files

- `api/_lib/auth-utils.js`
- `api/_lib/supabase.js`
- `api/auth/telegram.js`
- `api/invites/redeem.js`
- `api/health.js`
- `src/lib/apiAuth.ts`
- `src/state/MockUserContext.tsx`
- `src/components/AccessCodeGate.tsx`

## Local Smoke Check

Run:

```bash
npm run smoke:auth
```

This checks:

- Guest auth returns student access in local stub mode.
- The committee access code can unlock selected role and bureau locally.
- Production mode rejects missing Telegram `initData`.
- Health endpoint returns a deployment readiness payload.
