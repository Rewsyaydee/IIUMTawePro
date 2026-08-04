-- IIUM Ta'aruf Week Mini App production schema draft.
-- Run in a Supabase project after reviewing names, constraints, and policies.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  name text not null,
  role text not null check (role in ('student', 'committee', 'head', 'mainboard')),
  bureau text check (
    bureau is null
    or bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  role text not null check (role in ('committee', 'head', 'mainboard')),
  bureau text check (
    bureau is null
    or bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  expires_at timestamptz,
  used_by uuid references public.users(id),
  used_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  day text not null,
  week text not null check (week in ('preparation', 'event_week')),
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  title text not null,
  venue text not null,
  tag text not null,
  audience text not null check (audience in ('All', 'Students', 'Committee')),
  description text,
  is_live boolean not null default false,
  notify_minutes_before int not null default 30,
  responsible_bureau text check (
    responsible_bureau is null
    or responsible_bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  readiness_status text not null default 'pending' check (readiness_status in ('pending', 'ready', 'issues')),
  pre_session_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wellbeing_reports (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  submitted_by uuid references public.users(id),
  student_name text not null,
  phone text not null,
  category text not null,
  notes text not null,
  status text not null default 'submitted' check (status in ('submitted', 'responded', 'resolved', 'escalated')),
  assigned_to uuid references public.users(id),
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.poa_tasks (
  id uuid primary key default gen_random_uuid(),
  bureau text not null check (
    bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  title text not null,
  description text not null,
  due_date date not null,
  due_time time not null,
  assigned_to text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  notify_minutes_before int not null default 20,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_proofs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references public.users(id),
  telegram_id text not null,
  committee_name text not null,
  bureau text not null check (
    bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  selfie_path text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending_review' check (status in ('pending_review', 'sent_to_mainboard', 'rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  unique (date, user_id)
);

create table if not exists public.bureau_operations (
  id uuid primary key default gen_random_uuid(),
  bureau text not null check (
    bureau in (
      'Catering',
      'PrepTech',
      'Registration',
      'Program Coordinator',
      'Special Task',
      'Discipline',
      'Multimedia',
      'Welfare'
    )
  ),
  tool text not null,
  title text not null,
  detail text not null,
  owner text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'ready', 'issue', 'done')),
  metric text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null check (type in ('info', 'success', 'warning', 'emergency')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  tags text[] default '{}',
  links jsonb default '[]'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_role text not null,
  target_bureau text,
  title text not null,
  body text not null,
  type text not null,
  telegram_message_id text,
  send_status text not null default 'queued' check (send_status in ('queued', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  sent_by uuid references public.users(id),
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  actor_name text not null,
  action text not null,
  table_name text not null,
  record_id text,
  details text not null,
  timestamp timestamptz not null default now()
);

create index if not exists users_telegram_id_idx on public.users (telegram_id);
create index if not exists invite_codes_code_idx on public.invite_codes (code);
create index if not exists schedule_items_date_idx on public.schedule_items (date, scheduled_start_time);
create index if not exists wellbeing_reports_status_idx on public.wellbeing_reports (status);
create index if not exists poa_tasks_bureau_status_idx on public.poa_tasks (bureau, status);
create index if not exists attendance_proofs_status_date_idx on public.attendance_proofs (status, date);
create index if not exists bureau_operations_bureau_status_idx on public.bureau_operations (bureau, status);
create index if not exists notifications_target_idx on public.notifications (target_role, target_bureau);
create index if not exists audit_log_timestamp_idx on public.audit_log (timestamp desc);

insert into storage.buckets (id, name, public)
values ('attendance-selfies', 'attendance-selfies', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('story-cards', 'story-cards', true)
on conflict (id) do nothing;

create policy "Public read access for story cards"
  on storage.objects for select
  to anon
  using (bucket_id = 'story-cards');

create policy "Authenticated upload access for story cards"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'story-cards');

grant usage on schema app_private to anon;

-- Smart Schedule Navigator: static venue registry
create table if not exists public.static_locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  short_name text not null,
  description text not null,
  category text not null check (category in ('hall','mosque','clinic','mahallah','admin','open_area')),
  created_at timestamptz not null default now()
);

-- Smart Schedule Navigator: pre-computed routes between venues
create table if not exists public.static_routes (
  id uuid primary key default gen_random_uuid(),
  from_venue_code text not null references public.static_locations(code),
  to_venue_code text not null,
  map_asset_url text not null,
  duration_minutes int not null,
  distance_meters int not null,
  steps jsonb not null default '[]',
  transition_notes text,
  created_at timestamptz not null default now(),
  unique (from_venue_code, to_venue_code)
);

-- Extend schedule_items with venue code for navigation
alter table public.schedule_items add column if not exists venue_code text;

-- Student attendance: extend users table
alter table public.users add column if not exists matric_number text;
alter table public.users add column if not exists kulliyyah text check (
  kulliyyah is null
  or kulliyyah in ('KICT','KOE','KENMS','KOED','AIKOL','KAED','AHAS KIRKHS')
);
alter table public.users add column if not exists registration_step text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists telegram_username text;

-- Bureau members: task assignees stored as user id array
alter table public.poa_tasks add column if not exists assigned_to_ids uuid[] default '{}';

-- Recreate registration_step check with unlock_bureau:* values used by the Telegram bot
alter table public.users drop constraint if exists users_registration_step_check;
alter table public.users add constraint users_registration_step_check check (
  registration_step is null
  or registration_step in ('matric','kulliyyah','mahallah','change_matric','change_kulliyyah','change_mahallah','unlock_bureau:committee','unlock_bureau:head')
);

-- Student attendance: individual submissions
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  schedule_item_id text not null,
  event_title text not null,
  student_name text not null,
  matric_number text not null,
  kulliyyah text,
  latitude real not null,
  longitude real not null,
  status text not null default 'present' check (status in ('present','absent','excused')),
  excuse text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  unique (user_id, schedule_item_id)
);

create index if not exists student_attendance_user_idx on public.student_attendance (user_id);
create index if not exists student_attendance_schedule_idx on public.student_attendance (schedule_item_id);
create index if not exists student_attendance_status_idx on public.student_attendance (status);

create index if not exists static_locations_code_idx on public.static_locations (code);
create index if not exists static_routes_from_to_idx on public.static_routes (from_venue_code, to_venue_code);

-- Phase 8: extend banners with tags and links (production finalization)
alter table public.banners add column if not exists tags text[] default '{}';
alter table public.banners add column if not exists links jsonb default '[]';

-- Phase 8: add rejection reason to attendance proofs
alter table public.attendance_proofs add column if not exists rejection_reason text;

-- Phase 9: notification tier for bot-side session reminders
alter table public.users add column if not exists notify_tier text default 'off' check (notify_tier in ('off', 'daily', 'session', 'live'));

-- Phase 10: Leaderboard — mahallah assignment + scoring
alter table public.users add column if not exists mahallah text;
alter table public.schedule_items add column if not exists program_count int default 1;

alter table public.schedule_items add column if not exists is_attendance_required boolean not null default false;
alter table public.schedule_items add column if not exists block text;
alter table public.schedule_items add column if not exists block_group text;
alter table public.schedule_items add column if not exists is_concurrent boolean not null default false;
alter table public.schedule_items add column if not exists track text;

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  mahallah text not null,
  schedule_item_id text not null,
  score_date date not null default current_date,
  points int not null default 0,
  base_points int not null default 0,
  program_count int not null default 1,
  arrival_window text not null default 'standard',
  submitted_at timestamptz not null default now()
);

create index if not exists leaderboard_scores_date_idx on public.leaderboard_scores (score_date);
create index if not exists leaderboard_scores_mahallah_idx on public.leaderboard_scores (mahallah, score_date);
create index if not exists leaderboard_scores_user_idx on public.leaderboard_scores (user_id, score_date);

-- Notification dispatcher: one-row-per-send dedup + heartbeat
create table if not exists public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  send_key text unique not null,
  sent_at timestamptz not null default now()
);

create index if not exists notification_sends_sent_at_idx on public.notification_sends (sent_at);

alter table public.leaderboard_scores enable row level security;

create policy "anyone can read leaderboard scores"
on public.leaderboard_scores for select
using (true);

create policy "authenticated can insert own score"
on public.leaderboard_scores for insert
with check (user_id = app_private.claim_user_id() or app_private.claim_user_id() is not null);
