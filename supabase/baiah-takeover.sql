-- ─────────────────────────────────────────────────────────────
-- Baiah Realtime Confetti Takeover — core setup
-- Run once in the Supabase SQL Editor (safe to re-run).
--
-- Optional next step: supabase/baiah-pg-cron.sql (exact-minute
-- scheduled activation without depending on external pingers).
-- ─────────────────────────────────────────────────────────────

-- 1. Single-row settings table
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  is_baiah_active boolean not null default false,
  baiah_start_at timestamptz,
  baiah_message text not null default 'BAIAH 2026: WELCOME TO IIUM',
  baiah_notify boolean not null default true,
  baiah_activated_at timestamptz,
  baiah_updated_by text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

-- 2. RLS
alter table public.app_settings enable row level security;

drop policy if exists "anyone can read app settings" on public.app_settings;
create policy "anyone can read app settings"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "mainboard can manage app settings" on public.app_settings;
create policy "mainboard can manage app settings"
on public.app_settings
for all
to authenticated
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

-- 3. Grants (explicit so Realtime can deliver to anon + authenticated)
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;

-- 4. Realtime: publish UPDATE events for this table
alter table public.app_settings replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- 5. Sanity check (expect exactly 1 row, is_baiah_active = false)
select id, is_baiah_active, baiah_start_at, baiah_message, baiah_notify
from public.app_settings;
