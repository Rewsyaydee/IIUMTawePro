# Deployment Plan

## Do We Need GitHub And Vercel Now?

Not before continuing development. The app can keep moving locally while the UI, access flow, schedule, and backend contracts are refined.

GitHub and Vercel become important when:

- You want safer version history and collaboration.
- You want Vercel auto-deployment from a branch.
- You want a public HTTPS URL for Telegram Mini App testing.
- You want to connect environment variables for Supabase and Telegram Bot API.

## Recommended Order

1. Finish mock production shape locally.
2. Repair or initialize Git version tracking.
3. Push to a private GitHub repository.
4. Create a Vercel project from GitHub.
5. Add only client-safe Vite environment variables in Vercel frontend settings.
6. Add server-only secrets only to API/serverless environment settings.
7. Set the Telegram Mini App URL to the Vercel HTTPS URL.
8. Test guest student flow.
9. Test committee access code flow.
10. Disable mock mode for production.
11. Check `/api/health` after deployment.

## Telegram Mini App Hosting Note

Telegram requires a public HTTPS URL for real Mini App testing. Vercel is a good fit for this project because it already has `vercel.json`, Vite build scripts, and serverless API route potential.

## Current Recommendation

The `/api/auth/telegram` and `/api/invites/redeem` stubs now exist. Continue locally until the guest/code flow feels right, then move to GitHub and Vercel before real Telegram testing.

## Vercel Environment Split

Client-safe:

```env
VITE_APP_MODE=production
VITE_ENABLE_MOCKS=false
VITE_API_AUTH_BRIDGE=true
VITE_API_BASE_URL=
VITE_TELEGRAM_BOT_USERNAME=
```

Server-only:

```env
TELEGRAM_BOT_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
COMMITTEE_ACCESS_CODES=
HEAD_ACCESS_CODES=
MAINBOARD_ACCESS_CODES=
```

## Pre-Deploy Checks

Run locally:

```bash
npm run smoke:auth
npm run build
```

After Vercel deployment, open:

```text
https://your-vercel-domain.vercel.app/api/health
```

The health endpoint reports whether required environment values are present without exposing secret values.
