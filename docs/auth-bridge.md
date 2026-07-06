# Auth Bridge

Phase 6 adds safe stubs for the real Telegram authentication path.

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
```

Use comma-separated values for multiple codes. Keep these server-side only.

## Production Requirements

- Set `TELEGRAM_BOT_TOKEN`.
- Set `SUPABASE_JWT_SECRET` when issuing Supabase custom JWTs.
- Replace the stub code lookup with Supabase `invite_codes`.
- Store each redeemed code and Telegram ID server-side.
- Never accept default development codes in production.

## Files

- `api/_lib/auth-utils.js`
- `api/auth/telegram.js`
- `api/invites/redeem.js`
- `api/health.js`
- `src/lib/apiAuth.ts`
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
