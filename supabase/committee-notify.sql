-- Committee notification preferences (TawePro production).
-- Run once in the Supabase SQL editor.
--
-- committee_prefs (jsonb) keys:
--   briefing   'on' | 'off'  — daily 07:00 morning briefing. Missing = ON for non-students.
--   masterplan 'on' | 'off'  — reminders before assigned task due times. Missing = ON.
-- Students ignore this column entirely (student tiers live in notify_tier).

alter table public.users
  add column if not exists committee_prefs jsonb not null default '{}'::jsonb;
