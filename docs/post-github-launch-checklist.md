# Post-GitHub Launch Checklist

Use this after pushing `main` to GitHub. The goal is to get a safe HTTPS preview first, then move toward a real public release.

## 0. Decide The Release Mode

- [ ] **Private demo / internal review:** acceptable to use mock data while reviewing UI, flow, PDF, branding, and Telegram opening behavior.
- [ ] **Public IIUM release:** do not launch publicly until the Supabase-backed data, invite redemption, attendance selfie storage, and notification endpoints are real.
- [ ] Keep the GitHub repo private until official approval is clear.

## 1. Vercel Project

- [ ] Go to Vercel Dashboard > New Project.
- [ ] Import `Rewsyaydee/IIUMTawePro` from GitHub.
- [ ] Framework preset: `Vite`.
- [ ] Root directory: `.`.
- [ ] Install command: `npm install`.
- [ ] Build command: `npm run build`.
- [ ] Output directory: `dist`.
- [ ] Confirm `vercel.json` is detected. It already contains the SPA rewrite needed for routes like `/official-schedule`.
- [ ] Deploy once and copy the production HTTPS URL.
- [ ] Open these URLs after deployment:
  - [ ] `/`
  - [ ] `/official-schedule`
  - [ ] `/assets/official-taaruf-schedule-2026.pdf`
  - [ ] `/api/health`

## 2. Vercel Environment Variables

For a **private demo preview**, use:

```env
VITE_APP_MODE=mock
VITE_ENABLE_MOCKS=true
VITE_API_AUTH_BRIDGE=false
VITE_API_BASE_URL=
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

For a **Telegram auth bridge test**, use:

```env
VITE_APP_MODE=production
VITE_ENABLE_MOCKS=false
VITE_API_AUTH_BRIDGE=true
VITE_API_BASE_URL=
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

Server-only variables in Vercel Project Settings > Environment Variables:

```env
TELEGRAM_BOT_TOKEN=from_botfather
COMMITTEE_ACCESS_CODES=<shared-committee-code>
HEAD_ACCESS_CODES=
MAINBOARD_ACCESS_CODES=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
SUPABASE_JWT_SECRET=
```

When Supabase is ready, add:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
SUPABASE_SECRET_KEY=server_only_secret_key
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_SECRET=server_only_jwt_secret
```

- [ ] Never prefix server secrets with `VITE_`.
- [ ] If Supabase labels a key `SUPABASE_PUBLISHABLE_KEY`, put that value in `VITE_SUPABASE_ANON_KEY`.
- [ ] If Supabase labels a key `SUPABASE_SECRET_KEY`, keep it server-only. Do not put it in any `VITE_` variable.
- [ ] Set variables for Production, Preview, and Development only as needed.
- [ ] Redeploy after changing environment variables.

## 3. Telegram BotFather

- [ ] Open `@BotFather`.
- [ ] Create or select the bot.
- [ ] Save the bot token privately and place it only in Vercel as `TELEGRAM_BOT_TOKEN`.
- [ ] Create the Mini App with `/newapp`, or edit the existing app.
- [ ] Set the Mini App URL to the Vercel HTTPS production URL.
- [ ] Choose a short name for the app link, for example `tawe`.
- [ ] Save the final launch link, usually `https://t.me/<bot_username>/<app_short_name>`.
- [ ] Optional: set the bot menu button to open the Mini App so users can enter from the chat.
- [ ] Test on Telegram mobile, not only desktop:
  - [ ] App opens.
  - [ ] App requests full screen on supported Telegram clients.
  - [ ] Student lands as guest/public view.
  - [ ] Official PDF opens.
  - [ ] Committee code flow works.

## 4. Supabase Setup

- [ ] Create a Supabase project.
- [ ] Choose a region close to Malaysia if available.
- [ ] Copy the Project URL and anon key into Vercel client-safe variables.
- [ ] Copy the service role key only into Vercel server-only variables.
- [ ] Review `supabase/schema.sql`.
- [ ] Run `supabase/schema.sql` in the Supabase SQL editor.
- [ ] Review `supabase/rls-policies.sql`.
- [ ] Run `supabase/rls-policies.sql` only after confirming the JWT claims strategy.
- [ ] Confirm these tables exist:
  - [ ] `users`
  - [ ] `invite_codes`
  - [ ] `schedule_items`
  - [ ] `wellbeing_reports`
  - [ ] `poa_tasks`
  - [ ] `attendance_proofs`
  - [ ] `bureau_operations`
  - [ ] `banners`
  - [ ] `notifications`
  - [ ] `audit_log`
- [ ] Confirm `attendance-selfies` storage bucket exists and is private.
- [ ] Add real invite codes to `invite_codes`, or keep the server env code only for the early test.

## 5. Backend Work Before Public Launch

- [ ] Replace stub invite redemption with Supabase-backed `invite_codes`.
- [ ] Persist Telegram users in `users`.
- [ ] Persist attendance proofs in `attendance_proofs`.
- [ ] Upload selfies to private Supabase Storage.
- [ ] Add signed URLs for Special Task attendance review.
- [ ] Persist wellbeing reports.
- [ ] Persist POA tasks and bureau operations.
- [ ] Persist banners and notifications.
- [ ] Implement real Telegram Bot API sends for official notices.
- [ ] Add audit log records for sensitive actions.
- [ ] Remove local mock data dependency from public production flows.

## 6. Data And Branding Review

- [ ] Confirm the official schedule PDF is the latest approved IIUM version.
- [ ] Confirm the public schedule markdown data matches the PDF.
- [ ] Confirm the IIUM logo usage is approved.
- [ ] Confirm emergency contacts and wellbeing wording are approved.
- [ ] Confirm committee role names and bureau names are correct.
- [ ] Confirm the shared committee access code can be safely distributed.
- [ ] Replace any code shown during testing before real launch.

## 7. Final Test Matrix

- [ ] Public student opens app from Telegram.
- [ ] Student views schedule.
- [ ] Student opens official PDF.
- [ ] Student opens resources and emergency contacts.
- [ ] Student submits wellbeing report.
- [ ] Committee enters shared code.
- [ ] Committee selects correct role and bureau.
- [ ] Committee submits daily punch card selfie.
- [ ] Special Task reviews attendance proof.
- [ ] Mainboard views attendance status.
- [ ] Mainboard creates or sends official notice.
- [ ] Mainboard tests emergency broadcast with confirmation.
- [ ] Reload app and confirm session behaves correctly.
- [ ] Test iOS Telegram.
- [ ] Test Android Telegram.
- [ ] Test desktop Telegram as secondary support.

## 8. Go / No-Go

- [ ] `npm run smoke:auth` passes locally.
- [ ] `npm run build` passes locally.
- [ ] Vercel production deployment passes.
- [ ] `/api/health` shows expected production settings.
- [ ] No mock role switcher is visible in production.
- [ ] No server secret is visible in browser devtools or bundled JS.
- [ ] Telegram launch URL uses HTTPS.
- [ ] IIUM/public wording has been reviewed.
- [ ] One mainboard person is assigned as release owner.
- [ ] One technical person is assigned as incident owner.

## Official References

- Vercel Git deployments: https://vercel.com/docs/git
- Vercel Vite deployment: https://vercel.com/docs/frameworks/frontend/vite
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Telegram Mini App creation: https://docs.telegram-mini-apps.com/platform/creating-new-app
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
