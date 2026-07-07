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
  expires_at timestamptz
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

create index if not exists static_locations_code_idx on public.static_locations (code);
create index if not exists static_routes_from_to_idx on public.static_routes (from_venue_code, to_venue_code);
