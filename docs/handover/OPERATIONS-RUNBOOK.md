# TawePro — Operations Runbook (SOP)

| Field | Value |
|---|---|
| Version | 1.0 (Production, Semester 1 2026/2027) |
| Audience | ITD System Administrators (on-call during 10–25 Sep 2026) |
| Critical path | Mini App availability → check-ins → notifications |

> **Architecture reminder:** Vercel (SPA + serverless API) + Supabase (Postgres/Realtime) +
> Telegram Bot API. There is **no Azure VM**. All backend logic runs in Vercel functions;
> all state lives in Supabase.

---

## 1. System Topology & Triggers

| Trigger | Cadence | Role | Endpoint |
|---|---|---|---|
| UptimeRobot / cron-job.org | every 1 min | **Primary** — must stay alive | `GET /api/cron/notifications` |
| Vercel cron | 23:00 UTC (07:00 KL) daily | Backup for the morning briefing | same |
| GitHub Actions (`notify.yml`) | every 5 min | Backup (may be delayed/disabled) | same |
| Mini App open / bot interaction | on demand | Fallback only | same |

**Why the pinger matters:** it is the only trigger that covers all-day windows (student
live alerts 5–15 min before sessions, evening digest, masterplan reminders). If it dies,
only the 07:00 briefing survives (via the Vercel cron).

### 1.1 Health checks (2 minutes)

```sql
-- Heartbeat: should be < 3 minutes old if any trigger is alive
select sent_at from public.notification_sends
where send_key = 'ping' order by sent_at desc limit 1;

-- Recent sends (last 20 real sends)
select send_key, sent_at from public.notification_sends
where send_key <> 'ping' order by sent_at desc limit 20;
```

| Check | Where | Healthy |
|---|---|---|
| Mini App loads | `https://iium-tawe-pro.vercel.app` | Dashboard renders, no error banner |
| API alive | Vercel → Project → Functions | error rate < 1% |
| Bot alive | Telegram: send `/help` to `@iiumtaweprobot` | Reply within ~3 s |
| Webhook config | `getWebhookInfo` (bot API) | `url` set, `pending_update_count` ≈ 0 |
| Supabase | Supabase dashboard → Reports | connections < 80%, no 5xx |
| Pinger | UptimeRobot dashboard | monitor green, 1-min interval |

---

## 2. Daily / Weekly Checklist

**Daily (during event week, 06:45 & 18:00 KL)**
1. Heartbeat query (§1.1) — if stale > 5 min → §3.1 (pinger down).
2. Confirm 07:00 briefing delivered: `select send_key, sent_at from notification_sends where send_key like 'briefing:%' order by sent_at desc limit 10;`
3. Vercel → Deployments: latest production deployment is **Ready**.
4. Supabase → Logs: no repeated 429/5xx in last 12 h.
5. Bot webhook pending count ≈ 0.

**Weekly**
1. Review `audit_log` for unexpected admin actions.
2. Verify database size + storage bucket usage (selfies).
3. Confirm pinger + GH Actions still active (both have silent-failure modes).
4. Test one check-in end-to-end from a test student account.

---

## 3. Incident Playbooks

### 3.1 Pinger down (no notifications) — **most common failure**
**Symptom:** heartbeat stale; students report no reminders; briefings missing.

1. Open UptimeRobot (or cron-job.org) → monitor `https://iium-tawe-pro.vercel.app/api/cron/notifications`.
2. If paused/errored: **resume**, or recreate as HTTP monitor, interval **1 minute**, expect HTTP 200.
3. Confirm recovery within 2 minutes via the heartbeat query.
4. If UptimeRobot is unavailable: manually hit the endpoint from any machine:
   ```bash
   curl -s https://iium-tawe-pro.vercel.app/api/cron/notifications
   ```
5. Re-enable GitHub Actions backup: repo → Actions → "Notify — Session Reminders" →
   enable workflow → **Run workflow**.
6. **Missed briefing today?** Re-send to one person or a whole bureau:
   ```bash
   node tests/send-preptech-briefing.mjs 2026-09-14      # bureau broadcast (dedup-aware)
   # or single user:
   curl -s "https://iium-tawe-pro.vercel.app/api/cron/notifications?briefing_for=<TELEGRAM_ID>"
   ```
   Dedup keys prevent double-sends; `briefing_for` bypasses dedup deliberately.

### 3.2 Supabase rate limits / 429s
**Symptom:** `api/rpc` returns "Internal server error"; Supabase logs show 429; leaderboard
or schedule pages hang.

1. Identify hot path: `/api/rpc` actions `schedule.list`, `leaderboard.fetch` are cached
   (30 s in-memory per function instance); bursts at check-in windows are expected.
2. Reduce pressure immediately:
   - Lower `RATE_LIMIT_MAX` (default 60/min/IP) in Vercel env → redeploy (takes ~1 min).
   - Temporarily pause the pinger (notifications stop; check-ins continue).
3. Check Supabase dashboard → **Database → Connections**: if near limit, restart the
   PostgREST pooler or upgrade the compute size (Supabase → Settings → Compute).
4. Confirm recovery: schedule page loads < 1 s; 429s stop in Supabase logs.

### 3.3 Telegram API throttling
**Symptom:** broadcasts partially delivered; `sendRichWithFallback` logs
`Too Many Requests: retry after N`.

1. The dispatcher already batches (25/batch, 8 concurrent, 1 s delay) and retries twice.
2. If broadcasts fail en masse: check Bot API status (`@BotNews`), then reduce broadcast
   volume (pause `notify.send` from Mainboard until stable).
3. Telegram limits: ~30 messages/second overall; ~20 messages/minute to the same group.
   Never script mass DMs outside the dispatcher.
4. Retry the failed audience: `notify.send` again from Mainboard (new dedup keys not
   applicable — sends are manual).

### 3.4 Vercel function failures / bad deploy
**Symptom:** 500s from `/api/*`; UI shows "Internal server error"; new deploy broke flows.

1. Vercel → Deployments → open latest → **Logs**; identify the failing function.
2. **Rollback (fastest):** Deployments → previous good deployment → **Promote to Production**.
3. Or via CLI:
   ```bash
   git log --oneline -5          # find last good commit
   git revert <bad_commit>
   git push origin main
   vercel --prod --yes           # if Git auto-deploy is unavailable
   ```
4. If the Git integration is silent (known issue), always use `vercel --prod --yes`.

### 3.5 Database outage / corruption
**Symptom:** all API calls 500; Supabase status page incident.

1. Check Supabase status. If platform incident: wait + communicate; the Mini App will show
   cached/mock fallbacks for schedule only.
2. **Point-in-time restore:** Supabase → Database → Backups → select timestamp before the
   incident → restore to a new project → update `SUPABASE_URL` + keys in Vercel → redeploy.
   Expect 15–30 min downtime.
3. After restore: re-run `supabase/rls-policies.sql` (verifies policies) and check
   `select count(*) from users;` sanity.

### 3.6 Cache staleness (schedule/announcements look old)
**Symptom:** Mainboard edits a schedule item; users still see the old one.

1. Server cache TTL is 30 s (`schedule.list`, `announcements.list`). Wait 30 s.
2. Client device cache: users can close/reopen the Mini App; Vercel serves immutable assets
   by hash so stale HTML is unlikely.
3. If a bad row is cached by a specific function instance, redeploy (new instances).

### 3.7 Duplicate notifications
**Symptom:** user receives the same briefing twice.

1. Check dedup claims:
   ```sql
   select * from public.notification_sends where send_key like '%:<user_id>:%' order by sent_at desc;
   ```
2. Cause is almost always a **manual** `briefing_for` send after the cron already sent.
   Dedup prevents cron duplicates; manual sends are intentional.
3. If a key is missing but messages duplicated, inspect the pinger for multiple monitors
   hitting the endpoint simultaneously (safe — `claimSend` is atomic).

### 3.8 Check-ins failing at the venue
**Symptom:** students see "This session's check-in window has closed" or "not currently
open" while the session is running.

1. Verify the current virtual date/cycle matches the schedule rows:
   ```sql
   select date, block, block_group, scheduled_start_time, scheduled_end_time
   from public.schedule_items
   where date = current_date and block is not null order by scheduled_start_time;
   ```
2. Confirm the block exists for **today** (programme window 10–25 Sep, identity mode).
3. If a session legitimately overruns, Mainboard → Bureau Ops → **Session delay** (+15/+30)
   extends all windows; then students can check in.
4. Emergency (dev-only): set `CHECKIN_SKIP_WINDOW=1` in Vercel env → redeploy. **Remove
   immediately after the incident** (this disables retroactive protection).

---

## 4. Scheduled Maintenance

| Task | When | Procedure |
|---|---|---|
| Rotate bot token | Post-event / on suspicion | BotFather → API Token → Revoke → update `TELEGRAM_BOT_TOKEN` → re-set webhook |
| Rotate Supabase service key | Post-event | Supabase → Settings → API → roll key → update Vercel env → redeploy |
| Data wipe (wellbeing) | Event end + 30 days | See `PDPA-COMPLIANCE.md §6` |
| Backup export | Weekly during event | Supabase → Database → Backups (verify PITR enabled) |
| Dependency updates | Post-event | `npm outdated` → update → `npm run build` → deploy |

---

## 5. Escalation Matrix

| Severity | Example | First responder | Escalation | Target |
|---|---|---|---|---|
| P1 | Mini App down / DB outage | ITD on-call | Supabase support + developer | 15 min ack, 2 h resolve |
| P2 | Notifications down / check-in failures | ITD on-call | Mainboard ops lead | 30 min ack, 4 h resolve |
| P3 | Single-user issues (role, missing task) | ITD helpdesk | Mainboard | Same day |
| P4 | Cosmetic / copy issues | ITD helpdesk | Backlog | Next maintenance |

**Contacts to fill at handover:** ITD on-call, Mainboard ops lead, original developer,
Supabase support plan reference.

---

## 6. Access & Credentials Inventory (no secrets in this file)

| System | Who has access | Where stored |
|---|---|---|
| Vercel project | ITD team + developer | Vercel → Team `puterasedis-projects` |
| Supabase project | ITD team + developer | Supabase org (project ref in `ASSET-TRANSFER.md`) |
| Telegram bot | ITD (after BotFather transfer) | BotFather ownership |
| GitHub repo | ITD + developer | `Rewsyaydee/IIUMTawePro` |
| UptimeRobot | ITD | UptimeRobot account |
| Env secrets | Vercel project settings | Vercel env vars (never in git) |

---

## 7. Known Operational Traps

1. **Silent pinger death** — check the heartbeat daily; monitors can pause without alerts.
2. **GitHub Actions schedules disable silently** — verify monthly.
3. **Vercel Git integration may not auto-deploy** — always confirm a deployment exists
   after push; otherwise `vercel --prod --yes`.
4. **`.vercelignore` is mandatory** — without it the CLI uploads `tests/` (400 MB) and
   fails at the 100 MB file limit.
5. **Never run `seed-real-schedule.sql` during the event day** without checking it deletes
   only the programme window first (it re-inserts rows; attendance references block ids,
   which remain stable).
6. **`CHECKIN_SKIP_WINDOW` must never stay enabled in production.**
