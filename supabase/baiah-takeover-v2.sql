-- ─────────────────────────────────────────────────────────────
-- Baiah takeover v2 additions
-- Run once in the Supabase SQL Editor (safe to re-run).
-- Adds: custom song, announcement lead time, skip button toggle.
-- ─────────────────────────────────────────────────────────────

alter table public.app_settings
  add column if not exists baiah_song_url text,
  add column if not exists baiah_song_enabled boolean not null default false,
  add column if not exists baiah_notify_lead_minutes integer not null default 2,
  add column if not exists baiah_skip_enabled boolean not null default true;

-- Sanity check
select id, is_baiah_active, baiah_song_url, baiah_song_enabled,
       baiah_notify_lead_minutes, baiah_skip_enabled
from public.app_settings;
