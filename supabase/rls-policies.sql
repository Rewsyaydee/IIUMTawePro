-- Supabase RLS policy draft for IIUM Ta'aruf Week Mini App.
-- Assumes the server issues JWT claims:
-- app_user_id, app_role, bureau, telegram_id.

create schema if not exists app_private;

create or replace function app_private.claim_user_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'app_user_id', '')::uuid
$$;

create or replace function app_private.claim_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', '')
$$;

create or replace function app_private.claim_bureau()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'bureau', '')
$$;

create or replace function app_private.is_mainboard()
returns boolean
language sql
stable
as $$
  select app_private.claim_role() = 'mainboard'
$$;

create or replace function app_private.is_special_task()
returns boolean
language sql
stable
as $$
  select app_private.claim_bureau() = 'Special Task'
$$;

alter table public.users enable row level security;
alter table public.invite_codes enable row level security;
alter table public.schedule_items enable row level security;
alter table public.wellbeing_reports enable row level security;
alter table public.poa_tasks enable row level security;
alter table public.attendance_proofs enable row level security;
alter table public.bureau_operations enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

create policy "users can read own profile"
on public.users
for select
using (id = app_private.claim_user_id() or app_private.is_mainboard());

create policy "mainboard can administer users"
on public.users
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

create policy "mainboard can administer invites"
on public.invite_codes
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

create policy "everyone can read visible schedule"
on public.schedule_items
for select
using (
  audience = 'All'
  or (audience = 'Students' and app_private.claim_role() = 'student')
  or (audience = 'Committee' and app_private.claim_role() in ('committee', 'head', 'mainboard'))
  or app_private.is_mainboard()
);

create policy "mainboard can administer schedule"
on public.schedule_items
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

create policy "students can create wellbeing reports"
on public.wellbeing_reports
for insert
with check (
  app_private.claim_role() = 'student'
  and submitted_by = app_private.claim_user_id()
);

create policy "students read own wellbeing reports"
on public.wellbeing_reports
for select
using (
  submitted_by = app_private.claim_user_id()
  or app_private.claim_bureau() = 'Welfare'
  or app_private.is_mainboard()
);

create policy "welfare updates wellbeing reports"
on public.wellbeing_reports
for update
using (app_private.claim_bureau() = 'Welfare' or app_private.is_mainboard())
with check (app_private.claim_bureau() = 'Welfare' or app_private.is_mainboard());

create policy "committee reads own bureau tasks"
on public.poa_tasks
for select
using (
  bureau = app_private.claim_bureau()
  or app_private.is_mainboard()
);

create policy "heads and mainboard update tasks"
on public.poa_tasks
for update
using (
  app_private.is_mainboard()
  or (app_private.claim_role() = 'head' and bureau = app_private.claim_bureau())
  or (app_private.claim_role() = 'committee' and bureau = app_private.claim_bureau())
)
with check (
  app_private.is_mainboard()
  or bureau = app_private.claim_bureau()
);

create policy "mainboard creates tasks"
on public.poa_tasks
for insert
with check (app_private.is_mainboard());

create policy "committee creates own attendance proof"
on public.attendance_proofs
for insert
with check (
  app_private.claim_role() in ('committee', 'head')
  and user_id = app_private.claim_user_id()
  and bureau = app_private.claim_bureau()
);

create policy "attendance visibility by duty"
on public.attendance_proofs
for select
using (
  user_id = app_private.claim_user_id()
  or app_private.is_special_task()
  or (app_private.is_mainboard() and status = 'sent_to_mainboard')
);

create policy "special task reviews attendance"
on public.attendance_proofs
for update
using (app_private.is_special_task())
with check (app_private.is_special_task());

create policy "bureau reads own operations"
on public.bureau_operations
for select
using (
  bureau = app_private.claim_bureau()
  or app_private.is_mainboard()
);

create policy "bureau updates own operations"
on public.bureau_operations
for update
using (
  app_private.is_mainboard()
  or bureau = app_private.claim_bureau()
)
with check (
  app_private.is_mainboard()
  or bureau = app_private.claim_bureau()
);

create policy "mainboard creates bureau operations"
on public.bureau_operations
for insert
with check (app_private.is_mainboard());

create policy "everyone reads active banners"
on public.banners
for select
using (is_active = true or app_private.is_mainboard());

create policy "mainboard administers banners"
on public.banners
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

create policy "users read targeted notifications"
on public.notifications
for select
using (
  app_private.is_mainboard()
  or target_role = 'all'
  or target_role = app_private.claim_role()
  or target_bureau = app_private.claim_bureau()
);

create policy "mainboard creates notifications"
on public.notifications
for insert
with check (app_private.is_mainboard());

create policy "mainboard reads audit log"
on public.audit_log
for select
using (app_private.is_mainboard());

create policy "attendance selfie owner can read object"
on storage.objects
for select
using (
  bucket_id = 'attendance-selfies'
  and (
    owner = auth.uid()
    or app_private.is_special_task()
    or app_private.is_mainboard()
  )
);

create policy "committee can upload attendance selfie"
on storage.objects
for insert
with check (
  bucket_id = 'attendance-selfies'
  and app_private.claim_role() in ('committee', 'head')
);

-- Smart Schedule Navigator RLS
alter table public.static_locations enable row level security;
alter table public.static_routes enable row level security;

create policy "anyone can read locations"
on public.static_locations
for select
using (true);

create policy "anyone can read routes"
on public.static_routes
for select
using (true);

create policy "mainboard can administer locations"
on public.static_locations
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());

create policy "mainboard can administer routes"
on public.static_routes
for all
using (app_private.is_mainboard())
with check (app_private.is_mainboard());
