# TawePro — Helpdesk Troubleshooting Guide

| Field | Value |
|---|---|
| Version | 1.0 |
| Audience | ITD helpdesk staff (first line) |
| Scope | Known issues, safe fixes, manual overrides |
| Escalation | See §7 |

> **Golden rules:** never share service keys, never edit RLS policies during the event,
> and always record manual data changes in `audit_log`.

---

## 1. Quick Reference

### 1.1 URLs & identities

| Item | Value |
|---|---|
| Mini App | `https://iium-tawe-pro.vercel.app` |
| Custom domain | `https://taweproapp.rewsyaydee.tech` |
| Bot | `@iiumtaweprobot` |
| Cron endpoint | `https://iium-tawe-pro.vercel.app/api/cron/notifications` |
| Vercel project | `puterasedis-projects/iium-tawe-pro` |
| Supabase | Project ref in `supabase/.temp/project-ref` |

### 1.2 Bot commands

| Command | Notes |
|---|---|
| `/start` | Profile + change buttons; resumes registration |
| `/unlock CODE` | Committee/head/mainboard access |
| `/unlock student` | Committee returns to student view (with confirm) |
| `/notifications` | Student tiers / committee menus |
| `/review` | Anonymous review flow |
| `/help` | Command list |

### 1.3 Role capabilities

| Role | Can do |
|---|---|
| student | Check in, wellbeing, leaderboard, stories |
| committee | + tasks, ops board, punch-card proofs |
| head | + create/edit/delete bureau tasks, launch checklist |
| mainboard | + CMS, users, moderation, announcements, live ops |

---

## 2. Known Issues & Fixes

### 2.1 iOS: "Map image cannot load in Mini App"
**Cause:** iOS WKWebView refused relative/CORS-less image loads (older builds).
**Status:** Fixed — images now load from absolute HTTPS URLs with `Access-Control-Allow-Origin: *`
and one cache-bust retry.
**If a user still reports it:**
1. Ask them to close and reopen the Mini App (cache refresh).
2. Tap **"Open in browser"** on the map fallback (opens the image externally).
3. Verify headers are live:
   ```bash
   curl -sI https://iium-tawe-pro.vercel.app/assets/maps/campus-overview.webp | grep -i access-control
   # expect: access-control-allow-origin: *
   ```
4. If missing, the `vercel.json` headers block did not deploy → redeploy.

### 2.2 Mini App shows old content after an admin edit
Server cache TTL is 30 s. Wait 30 s and pull-to-refresh. If still stale, redeploy (new
function instances).

### 2.3 "This session's check-in window has closed" / "not currently open"
**Cause:** server enforces the block window (first event start → final event end). Retroactive
and future check-ins are rejected by design.
1. Confirm the block exists today (SQL in §3.1).
2. If the session is running late → Mainboard → Bureau Ops → **Session delay +15/+30**
   (extends windows + broadcasts).
3. Emergency only: set `CHECKIN_SKIP_WINDOW=1` in Vercel env → redeploy → **remove
   immediately after** and redeploy again.

### 2.4 "You've already checked in for this session" (409)
Expected — one check-in per block per user. Verify:
```sql
select schedule_item_id, status, submitted_at from public.student_attendance
where user_id = '<USER_UUID>' order by submitted_at desc limit 5;
```

### 2.5 GPS note
The current production build submits the venue coordinates rather than a live GPS fix
(`SKIP_GPS` flag in the check-in form). Attendance validation is **time-window based**
server-side. If GPS enforcement is required later, remove the flag in
`src/components/CheckInForm.tsx` and redeploy.

### 2.6 Bot not responding
1. Check webhook:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
   Expect the production URL and `pending_update_count: 0`.
2. If pending count grows: re-set the webhook (§2.6 in `ASSET-TRANSFER.md`).
3. If the bot replies with nothing at all: verify `TELEGRAM_BOT_TOKEN` in Vercel and
   redeploy; check Vercel function logs for `/api/telegram/webhook`.

### 2.7 Notifications not arriving
Work through in order:
1. **Student:** `/notifications` — tier must be `daily`/`session`/`live` (not `off`).
2. **Committee:** `/notifications` → Session Notifications / Masterplan Reminders must be ON.
3. **Pinger:** heartbeat query (§1 of the runbook). If stale → restart the monitor.
4. **Already sent:** dedup keys prevent duplicates; check:
   ```sql
   select send_key, sent_at from public.notification_sends
   where send_key like '%<DATE>%' order by sent_at desc limit 20;
   ```
5. **Manual resend (single user):**
   ```
   https://iium-tawe-pro.vercel.app/api/cron/notifications?briefing_for=<TELEGRAM_ID>
   ```
6. **Manual bureau broadcast:**
   ```bash
   node tests/send-preptech-briefing.mjs 2026-09-14
   ```

### 2.8 Schedule shows wrong/too many dates
**Cause (historical):** stale placeholder rows. Fixed by `supabase/fix-schedule.sql` (keeps
only 10–25 Sep). If it recurs:
```sql
delete from public.schedule_items where date < '2026-09-10' or date > '2026-09-25';
```
The client also filters the date nav to the programme window.

### 2.9 Leaderboard empty or all zeros
1. Confirm attendance exists:
   ```sql
   select count(*) from public.student_attendance where status = 'present';
   ```
2. Block ids must match `block-<date>-<before_break|after_break>-w0` (production cycle 0).
3. Mahallah names are canonicalised (bot display names ↔ codes); if a user shows under the
   wrong Mahallah, fix `users.mahallah` to the canonical short name and ask them to re-open
   the app.

### 2.10 Wellbeing report not visible to Welfare
1. Confirm the reporter's role (students see their own; Welfare + Mainboard see all).
2. Verify the Welfare member's `users.bureau = 'Welfare'` and `status = 'active'`.
3. Check the report exists:
   ```sql
   select reference, status, submitted_at from public.wellbeing_reports order by submitted_at desc limit 10;
   ```

### 2.11 Review flow stuck
The flow stores state in `review_sessions` (one row per Telegram ID). If a user is stuck:
```sql
delete from public.review_sessions where telegram_id = '<TELEGRAM_ID>';
```
Then ask them to run `/review` again.

### 2.12 "You're not authorized to moderate reviews"
The tapping account's Telegram ID must equal `REVIEW_ADMIN_TELEGRAM_ID` in Vercel env.
Update the env var and redeploy if the moderator changes.

### 2.13 Registration stuck mid-step
`users.registration_step` drives the flow (`matric`, `kulliyyah`, `mahallah`, `change_*`,
`unlock_bureau:<role>`, `student_downgrade`). To reset:
```sql
update public.users set registration_step = null where telegram_id = '<TELEGRAM_ID>';
```
Then `/start`.

### 2.14 Committee sees the student notification menu
Their `users.role` is still `student`. Fix via Mainboard users tab, or SQL:
```sql
update public.users set role = 'committee', bureau = '<Bureau>' where telegram_id = '<TELEGRAM_ID>';
```
Ask them to send `/notifications` again.

### 2.15 Baiah confetti takeover stuck on (or won't appear)
The takeover is driven by the single row `public.app_settings` (`is_baiah_active`).
Each user's overlay auto-hides 30 minutes after activation, so this is rarely blocking —
but to force it off for everyone immediately:
```sql
update public.app_settings
set is_baiah_active = false, baiah_start_at = null, updated_at = now()
where id = 1;

insert into public.audit_log (actor_id, actor_name, action, table_name, record_id, details)
values (null, 'ITD Helpdesk', 'force_baiah_off', 'app_settings', '1',
        'Forced Baiah takeover off via helpdesk SQL');
```
If it **won't appear** at a scheduled time: check the row (`select * from app_settings where id = 1;`),
confirm the pg_cron job exists (`select * from cron.job where jobname = 'baiah-auto-activate';`),
and verify the Realtime publication includes the table:

```sql
select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_settings';
```

If that returns 0 rows, re-run `supabase/baiah-takeover.sql` Section 4. Mainboard can always
activate manually from Bureau Ops → Live → Baiah takeover, or with the bot remote `/baiah`.

**User-side controls:** every user gets a **Skip** button (hides it for that activation;
`baiah_skip_enabled = false` removes it) and a sound mute toggle. Music plays from
`/audio/baiah.mp3` (or `baiah_song_url`); when mobile autoplay is blocked the user sees a
"🔊 Tap for sound" chip — this is normal, not a bug. At event scale (Supabase Free = 200
concurrent Realtime connections) most devices get the takeover via the local scheduled
trigger + 10s poll, so a few seconds of skew is expected.

---

## 3. Manual Overrides

### 3.1 Verify today's attendance blocks
```sql
select date, block, block_group, scheduled_start_time, scheduled_end_time, title
from public.schedule_items
where date = current_date and block is not null
order by block, scheduled_start_time;
```

### 3.2 Manual attendance override (helpdesk with Mainboard approval only)
Use the block id format `block-<YYYY-MM-DD>-<before_break|after_break>-w0`:

```sql
insert into public.student_attendance
  (user_id, schedule_item_id, event_title, student_name, matric_number, kulliyyah, mahallah,
   latitude, longitude, status, reviewed_by, reviewed_at)
select u.id,
       'block-2026-09-21-before_break-w0',
       'Manual override by ITD',
       u.name,
       coalesce(u.matric_number, ''),
       u.kulliyyah,
       u.mahallah,
       null, null, 'present', null, now()
from public.users u
where u.telegram_id = '<TELEGRAM_ID>'
on conflict (user_id, schedule_item_id)
do update set status = 'present', reviewed_at = now();

-- Audit the override (always)
insert into public.audit_log (actor_id, actor_name, action, table_name, record_id, details)
values (null, 'ITD Helpdesk', 'manual_attendance_override', 'student_attendance', '',
        'Manual check-in for telegram <TELEGRAM_ID> block 2026-09-21-before_break-w0');
```

### 3.3 Manual role fixes
| Situation | Action |
|---|---|
| Committee wants student view | They run `/unlock student` (self-service) |
| Student needs committee access | Mainboard issues/uses an access code (`/unlock CODE`) |
| Wrong bureau | Mainboard users tab, or `users.update` RPC |
| Revoke access | Mainboard → revoke user (sets `status = 'revoked'`) |

### 3.4 Notification tests
| Goal | Command |
|---|---|
| Single-user briefing | `GET /api/cron/notifications?briefing_for=<TELEGRAM_ID>` |
| Bureau broadcast | `node tests/send-preptech-briefing.mjs <YYYY-MM-DD>` |
| Rich message test | `node tests/test-rich-message.cjs` |
| Cron dry-run (all tiers) | `GET /api/cron/notifications?date=<YYYY-MM-DD>&hour=<H>&minute=<M>&force=1` — **sends to everyone in that window; use only in a controlled test** |

### 3.5 Find a user
```sql
select id, telegram_id, name, role, bureau, status, matric_number, mahallah
from public.users
where name ilike '%<NAME>%' or telegram_id = '<ID>' or matric_number = '<MATRIC>';
```

---

## 4. Wellbeing / Medical Escalation

If a report indicates immediate danger or severe medical need:
1. Alert the Welfare lead directly (Telegram) — do not rely on the bot queue alone.
2. Follow the report's reference number (`WEL-XXXX`) through to resolution in the Welfare
   dashboard.
3. Record the outcome; never discuss medical details in group chats.

---

## 5. Data Requests

Refer access/correction/deletion requests to the ITD DPO and follow
`PDPA-COMPLIANCE.md §7`. Do not export medical data to unapproved channels.

---

## 6. Do-Not-Do List

1. Never paste service keys, tokens, or `.env` contents into chat, tickets, or docs.
2. Never disable RLS or create permissive policies during the event.
3. Never set `CHECKIN_SKIP_WINDOW=1` and leave it on.
4. Never run `seed-real-schedule.sql` or wipe scripts without checking the date guard first.
5. Never point the production bot webhook at a dev machine.
6. Never mass-DM outside the notification dispatcher (Telegram rate limits).

---

## 7. Escalation Matrix

| Symptom | First action | Escalate to | SLA |
|---|---|---|---|
| Single user can't check in | §2.3 / §2.4 checks | Mainboard ops | 30 min |
| Whole venue can't check in | Session delay toggle | ITD on-call | 15 min |
| Notifications silent | Heartbeat + pinger | ITD on-call | 30 min |
| Mini App/API down | Runbook §3.4 rollback | ITD on-call + developer | 15 min |
| Medical emergency report | §4 direct alert | Welfare lead | Immediate |
| Suspected data breach | Runbook §3 + PDPA §8 | ITD DPO | Immediate |

---

## 8. Useful Test Accounts & Fixtures

- Committee tester: Telegram ID used during development (`605353966`) — verify role before
  using it in production tests.
- Seed scripts in `tests/` are **not** deployed to production (`.vercelignore`), so run
  them only from the repository checkout.
