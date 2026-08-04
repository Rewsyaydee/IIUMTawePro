# Notifications Runbook (server-driven)

The dispatcher is `GET /api/cron/notifications` (Vercel + Supabase). It must be pinged
by something that does NOT depend on the Mini App being open. Self-pings from the app
(`App.tsx`) and the bot webhook are only fallbacks.

## Required

1. Run `supabase/notification-sends.sql` once in the Supabase SQL editor (adds the
   `notification_sends` dedup/heartbeat table).

## Triggers (keep all three)

| Trigger | Cadence | Role |
|---|---|---|
| External cron pinger (below) | every 1 min | **Primary — must be set up** |
| GitHub Actions `.github/workflows/notify.yml` | every 5 min | Backup (delayed 5–15 min, can skip) |
| Vercel cron `vercel.json` | 1×/day 23:30 UTC | Backup |
| Self-ping on Mini App open / bot interaction | on demand | Fallback only |

### Set up the external pinger (free)

Pick one service and create a monitor for:
`https://iium-tawe-pro.vercel.app/api/cron/notifications`

- **UptimeRobot** (free, 50 monitors): create an HTTP monitor, interval 1 minute.
- **cron-job.org** (free tier): create a job with `GET` and a 1-minute schedule.
- **Betterstack Uptime** (free tier): same idea; verify the free check interval.

Any 200 response is a successful ping.

## Verification

- Heartbeat: `select sent_at from public.notification_sends where send_key = 'ping' order by sent_at desc limit 1;`
  should be within the last few minutes if a pinger is running.
- Sent records: `select send_key, sent_at from public.notification_sends where send_key != 'ping' order by sent_at desc limit 20;`

## Dry-run testing

`node tests/test-notify.cjs HH MM YYYY-MM-DD` appends `force=1`, which bypasses dedup
so repeated tests re-send. Real pings never pass `force`, so production sends are
deduped per key (`morning:<date>`, `evening:<date>`, `live:<date>:<start>`).

## Tier behaviour

- `daily` + `session` → morning digest (first session − 30 min, ±15 min window).
- `session` → 1:40 PM digest (±15 min window).
- `live` → per-session "starting soon" (5–15 min before start).
- `off` → nothing.
