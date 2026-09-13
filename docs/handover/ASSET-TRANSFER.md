# TawePro — Asset Transfer Protocol

| Field | Value |
|---|---|
| Version | 1.0 |
| Purpose | Transfer full ownership and operational control of TawePro from the original developer to IIUM ITD |
| Audience | ITD + original developer (joint session) |
| Estimated duration | 2–3 hours (excl. DNS propagation) |

> Run this protocol **outside event hours**. Notifications and check-ins must be paused or
> the transfer performed during a quiet window. No secrets appear in this document.

---

## 1. Asset Inventory

| Asset | Identifier | Current owner | Transfer method |
|---|---|---|---|
| Telegram bot | `@iiumtaweprobot` | Developer's Telegram account | BotFather → Transfer Ownership |
| Vercel project | `puterasedis-projects/iium-tawe-pro` | Developer's Vercel account | Vercel project transfer to ITD team |
| Production domain | `iium-tawe-pro.vercel.app` | Vercel (auto) | Follows project transfer |
| Custom domain | `taweproapp.rewsyaydee.tech` | Developer DNS | Add domain to ITD Vercel project + DNS records |
| Supabase project | project ref recorded in `supabase/.temp/project-ref` | Developer's Supabase org | Org/project transfer to IIUM ITD |
| GitHub repo | `Rewsyaydee/IIUMTawePro` | Developer GitHub | Repository transfer to IIUM org |
| UptimeRobot monitor | `https://iium-tawe-pro.vercel.app/api/cron/notifications` | Developer account | Recreate in ITD account (free tier) |
| GitHub Actions secrets | none required today | — | Recreate if added |
| Figma files | TawePro UI design | Developer Figma | Duplicate/transfer to IIUM Figma org |
| Env secrets | Vercel env vars (list in `SPEC.md §7`) | Vercel project | Export/import + rotate |

---

## 2. Telegram Bot Ownership Transfer

**Prerequisite:** an ITD Telegram account that will own the bot.

1. Open Telegram as the current owner → chat with **@BotFather**.
2. Send `/mybots` → select **@iiumtaweprobot** → **Transfer Ownership**.
3. BotFather asks for the recipient's Telegram **username** (not display name). Enter the
   ITD account's `@username`.
4. Confirm the transfer code prompt on the ITD account (BotFather sends a confirmation to
   the recipient; it must be accepted within the validity window).
5. Verify on the ITD account: `/mybots` lists `@iiumtaweprobot`.

### 2.1 Post-transfer webhook + token (mandatory)
The bot token **does not change** on ownership transfer, but the webhook must be re-set if
it was pointed at a dev tunnel, and the secret should be rotated:

1. Set the webhook (replace placeholders; the secret must match `TELEGRAM_WEBHOOK_SECRET`):
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://iium-tawe-pro.vercel.app/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
2. Verify:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
   Expect `"url"` set and `"pending_update_count": 0`.
3. **Recommended token rotation** (owner change = credential change):
   BotFather → `/mybots` → API Token → **Revoke current token** → copy new token →
   update `TELEGRAM_BOT_TOKEN` in Vercel → redeploy → re-run `setWebhook`.
4. Confirm the bot responds: send `/help` and `/start`.

---

## 3. Vercel Project Transfer

1. Developer: Vercel → **iium-tawe-pro** → Settings → **Transfer Project** → select the
   ITD team (`puterasedis-projects` or the IIUM team).
2. ITD: accept the transfer invitation.
3. **Environment variables:** Vercel → Settings → Environment Variables → export each
   (Production/Preview/Development). Import into the transferred project if not carried
   over automatically. Verify against `SPEC.md §7` — especially:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEB_APP_URL`, `TELEGRAM_WEBHOOK_SECRET`,
   `REVIEW_ADMIN_TELEGRAM_ID`, access codes.
4. **Custom domain:** Settings → Domains → add `taweproapp.rewsyaydee.tech`.
   - If the domain stays on the developer's DNS: add the CNAME/A record Vercel provides.
   - If ITD owns a domain: prefer adding an `iium.edu.my` subdomain here.
5. **Git integration:** Settings → Git → confirm the repo connection. If auto-deploy is
   broken, use `vercel --prod --yes` (see `OPERATIONS-RUNBOOK.md §3.4`).
6. Redeploy once to confirm the new owner can ship:
   ```bash
   vercel --prod --yes
   ```

---

## 4. Supabase Project Transfer

1. Developer: Supabase dashboard → project → **Settings → General → Transfer project**
   (or transfer the whole organization) → select the ITD organization.
2. ITD: accept and verify access to: SQL Editor, Table Editor, Logs, Backups, Storage.
3. **Key rotation (recommended after transfer):**
   - Settings → API → roll the **service role** key → update Vercel env
     `SUPABASE_SERVICE_ROLE_KEY` → redeploy.
   - Keep the anon/publishable key stable unless compromised (client bundles reference it;
     rotation requires a frontend redeploy).
   - If app JWT signing uses a shared secret, rotate `SUPABASE_JWT_SECRET` and redeploy.
4. **RLS verification** (run in SQL editor):
   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname = 'public' order by tablename;
   ```
   All application tables must show `rowsecurity = true`.
5. **Backups:** confirm PITR is enabled (Settings → Database → Backups) and note the
   retention window in the ITD runbook.
6. **Storage:** confirm the private bucket used for attendance selfies exists and that
   signed URL generation works (upload one test selfie via a committee account).

---

## 5. GitHub Repository Transfer

1. Developer: GitHub repo → Settings → **Transfer ownership** → IIUM organization/account.
2. ITD: accept, then:
   - Enable branch protection on `main` (require PR review, block force pushes).
   - Verify **Actions** are enabled; re-enable the `Notify — Session Reminders` workflow.
   - Recreate any repository secrets if added later (none required today).
3. Add ITD maintainers; remove the developer only after a 30-day hypercare window.

---

## 6. UptimeRobot (Pinger) Handover

1. ITD creates an account (free tier is sufficient).
2. Add a new monitor:
   - Type: **HTTP(s)**, URL: `https://iium-tawe-pro.vercel.app/api/cron/notifications`
   - Interval: **1 minute**, expected status 200.
3. Delete/pause the developer's old monitor to avoid duplicate pings (duplicates are safe
   but noisy).
4. Verify: heartbeat in `notification_sends` updates every minute.

---

## 7. Figma Handover

1. Developer: open the TawePro Figma file → **Share → Transfer ownership** to the ITD
   Figma account (or duplicate into the IIUM Figma organization).
2. Export and commit to the repo (if not already):
   - Screens: Dashboard, Schedule, Attendance, Leaderboard, Map, Wellbeing, Tasks, Ops,
     Mainboard, Launch, Stories, Support.
   - Assets: logo, flame, dress-code image, DuitNow QR, map webp files.
3. Confirm fonts used (Inter, Outfit) are licensed for IIUM use (Google Fonts — OFL).
4. Document the design tokens (colors, spacing) — they live in `src/styles.css`.

---

## 8. Cutover Checklist

| # | Step | Done |
|---|---|---|
| 1 | Bot ownership accepted by ITD | ☐ |
| 2 | Webhook re-set + verified (`pending_update_count = 0`) | ☐ |
| 3 | Bot token rotated and updated in Vercel | ☐ |
| 4 | Vercel project transferred + env vars verified | ☐ |
| 5 | Supabase transferred + service key rotated + RLS verified | ☐ |
| 6 | GitHub repo transferred + Actions re-enabled | ☐ |
| 7 | UptimeRobot monitor created in ITD account | ☐ |
| 8 | Custom domain resolved on the new project | ☐ |
| 9 | Figma ownership transferred | ☐ |
| 10 | Production deploy by ITD (`vercel --prod --yes`) succeeds | ☐ |
| 11 | Verification tests pass (§9) | ☐ |
| 12 | Old developer credentials revoked (except hypercare access) | ☐ |

---

## 9. Post-Transfer Verification Tests

1. **Student flow:** open the Mini App from Telegram → Dashboard loads → schedule shows
   today's real programme → check-in submits (inside a window) → streak updates.
2. **Bot flow:** `/start`, `/help`, `/notifications` (student tier menu), `/review`
   (submit a test review, moderate from the admin account).
3. **Committee flow:** `/unlock CODE` with a test code → bureau picker → `/notifications`
   shows the committee menu → 07:00 briefing arrives (or test with
   `?briefing_for=<telegram_id>`).
4. **Mainboard flow:** `/mainboard` loads; create and deactivate a test announcement.
5. **Notifications:** heartbeat updates; `select send_key from notification_sends order by
   sent_at desc limit 5;` shows activity.
6. **Failure drills:** promote a previous deployment (rollback) and roll forward again.

---

## 10. Hypercare Window

- **30 days** after transfer: original developer on call for P1/P2 (best effort).
- ITD owns the pinger, deploy path, and database operations from day 1.
- Weekly joint review for the first month: incidents, changes, and any undocumented drift.
