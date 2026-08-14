-- TawePro Production Refinement & Admin CMS — schema additions.
-- Run this file once in the Supabase SQL editor (or via supabase db push).
-- Assumes app_private.* JWT claim helpers from supabase/rls-policies.sql already exist.

-- ─────────────────────────────────────────────────────────────
-- 1. Wellbeing: multi-select medical conditions
-- ─────────────────────────────────────────────────────────────
alter table public.wellbeing_reports
  add column if not exists medical_conditions text[] not null default '{}';

-- ─────────────────────────────────────────────────────────────
-- 2. Guides: emergency contacts (inline CRUD by mainboard)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text not null,
  priority boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;

create policy "anyone can read emergency contacts"
on public.emergency_contacts
for select
using (true);

create policy "mainboard can manage emergency contacts"
on public.emergency_contacts
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

insert into public.emergency_contacts (name, role, phone, priority, sort_order) values
  ('Event Control Room', 'Mainboard Hotline', '+60123456789', true, 1),
  ('Welfare Lead', 'Medical and Sickbay', '+60198765432', true, 2),
  ('Security Desk', 'Venue Safety', '+60112223334', false, 3),
  ('PrepTech Standby', 'Walkie and AV Fallback', '+60115554444', false, 4)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. Guides: coupon locations (inline CRUD by mainboard)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coupon_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  accepts text not null,
  hours text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupon_locations enable row level security;

create policy "anyone can read coupon locations"
on public.coupon_locations
for select
using (true);

create policy "mainboard can manage coupon locations"
on public.coupon_locations
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

insert into public.coupon_locations (name, location, accepts, hours, sort_order) values
  ('Cafe A', 'Mahallah Ali', 'Breakfast & Lunch', '7:00 AM – 3:00 PM', 1),
  ('Cafe B', 'Near KICT', 'All meals', '7:00 AM – 9:00 PM', 2),
  ('Cafe C', 'ICC Ground Floor', 'Lunch only', '11:00 AM – 3:00 PM', 3),
  ('Cafe D', 'Mahallah Aminah', 'All meals', '7:00 AM – 9:00 PM', 4),
  ('Cafe E', 'SHAS Mosque area', 'Breakfast & Dinner', '7:00 AM – 10:00 AM, 5:00 PM – 9:00 PM', 5),
  ('Cafe F', 'Main Auditorium concourse', 'Lunch only', '12:00 PM – 2:30 PM', 6)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- 4. Ops settings: global session delay (key/value)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ops_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ops_settings enable row level security;

create policy "authenticated app users can read ops settings"
on public.ops_settings
for select
using (app_private.claim_role() <> '');

create policy "mainboard can manage ops settings"
on public.ops_settings
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

insert into public.ops_settings (key, value) values
  ('session_delay_minutes', '0'::jsonb)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 5. Launch readiness checklist (toggleable status badges)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.launch_checklist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Logistics',
  owner text not null default '',
  status text not null default 'pending' check (status in ('pending', 'ready', 'issue')),
  sort_order int not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.launch_checklist_items enable row level security;

create policy "committee and above can read launch checklist"
on public.launch_checklist_items
for select
using (app_private.claim_role() <> 'student');

create policy "heads and mainboard can manage launch checklist"
on public.launch_checklist_items
for all
using (app_private.is_mainboard() or app_private.claim_role() = 'head')
with check (app_private.is_mainboard() or app_private.claim_role() = 'head');

insert into public.launch_checklist_items (title, category, owner, sort_order) values
  ('Venue Access', 'Logistics', 'Logistics Team', 1),
  ('Audio System', 'PrepTech', 'PrepTech', 2),
  ('QR / GPS Active', 'PrepTech', 'PrepTech', 3),
  ('Welwel Standby', 'Welfare', 'Welfare', 4),
  ('Sick Bay Setup', 'Welfare', 'Welfare', 5),
  ('Registration Desk', 'Registration', 'Registration', 6)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- 6. Task notification dispatch logs
-- ─────────────────────────────────────────────────────────────
create table if not exists public.task_notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.poa_tasks (id) on delete cascade,
  assignee_user_id uuid,
  telegram_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.task_notifications enable row level security;

create policy "committee and above can read task notifications"
on public.task_notifications
for select
using (app_private.claim_role() <> 'student');

create policy "heads and mainboard can insert task notifications"
on public.task_notifications
for insert
with check (app_private.is_mainboard() or app_private.claim_role() = 'head');
