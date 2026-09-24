-- ─────────────────────────────────────────────────────────────
-- Baiah takeover — exact-minute scheduled activation (pg_cron)
--
-- OPTIONAL but recommended. With this job, the takeover fires at
-- the scheduled minute even if no external pinger is alive.
-- Requires the pg_cron extension:
--   Dashboard → Database → Extensions → enable "pg_cron"
-- or run:  create extension if not exists pg_cron;
--
-- Safe to re-run: the old job is replaced.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'baiah-auto-activate') then
    perform cron.unschedule('baiah-auto-activate');
  end if;
end $$;

select cron.schedule(
  'baiah-auto-activate',
  '* * * * *',
  $job$
  with changed as (
    update public.app_settings
    set is_baiah_active = true,
        baiah_activated_at = now(),
        baiah_updated_by = 'system (pg_cron)',
        updated_at = now()
    where id = 1
      and is_baiah_active = false
      and baiah_start_at is not null
      and baiah_start_at <= now()
    returning id
  )
  insert into public.audit_log (actor_id, actor_name, action, table_name, record_id, details)
  select null,
         'system (pg_cron)',
         'baiah_auto_activated',
         'app_settings',
         '1',
         'Scheduled Baiah takeover activated at ' || to_char(now() at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI') || ' MYT'
  from changed;
  $job$
);

-- Verify the job exists:
select jobid, jobname, schedule, active from cron.job where jobname = 'baiah-auto-activate';
