-- Notification dispatcher support table (run once in Supabase SQL editor)
-- Used by /api/cron/notifications for:
--   1. Send dedup (one row per morning/evening/live send key per day)
--   2. Heartbeat row (send_key = 'ping') to verify server-driven pings land
create table if not exists public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  send_key text unique not null,
  sent_at timestamptz not null default now()
);

create index if not exists notification_sends_sent_at_idx on public.notification_sends (sent_at);

-- Verify pings are landing (run anytime):
--   select * from public.notification_sends order by sent_at desc limit 10;
