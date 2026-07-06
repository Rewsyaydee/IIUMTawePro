-- Paste this into the Supabase SQL Editor after running schema.sql and rls-policies.sql.
-- It verifies that RLS is enabled and that the expected policies/functions exist.

-- 1) RLS should be true for every app table.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'users',
    'invite_codes',
    'schedule_items',
    'wellbeing_reports',
    'poa_tasks',
    'attendance_proofs',
    'bureau_operations',
    'banners',
    'notifications',
    'audit_log'
  )
order by c.relname;

-- 2) Policies should appear here. Expect app table policies plus storage.objects policies.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where (
    schemaname = 'public'
    and tablename in (
      'users',
      'invite_codes',
      'schedule_items',
      'wellbeing_reports',
      'poa_tasks',
      'attendance_proofs',
      'bureau_operations',
      'banners',
      'notifications',
      'audit_log'
    )
  )
  or (
    schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'attendance selfie owner can read object',
      'committee can upload attendance selfie'
    )
  )
order by schemaname, tablename, policyname;

-- 3) Helper functions used by the policies should exist in app_private.
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in (
    'claim_user_id',
    'claim_role',
    'claim_bureau',
    'is_mainboard',
    'is_special_task'
  )
order by p.proname;

-- 4) Private storage bucket for attendance selfies should exist.
select
  id,
  name,
  public
from storage.buckets
where id = 'attendance-selfies';

-- 5) One-screen summary. Supabase may only show the last SELECT result,
-- so this final checklist is the easiest result to read.
with
expected_tables(table_name) as (
  values
    ('users'),
    ('invite_codes'),
    ('schedule_items'),
    ('wellbeing_reports'),
    ('poa_tasks'),
    ('attendance_proofs'),
    ('bureau_operations'),
    ('banners'),
    ('notifications'),
    ('audit_log')
),
expected_functions(function_name) as (
  values
    ('claim_user_id'),
    ('claim_role'),
    ('claim_bureau'),
    ('is_mainboard'),
    ('is_special_task')
),
expected_storage_policies(policyname) as (
  values
    ('attendance selfie owner can read object'),
    ('committee can upload attendance selfie')
),
summary as (
  select
    'app tables with RLS enabled' as check_name,
    count(*)::text as actual,
    '10' as expected,
    count(*) = 10 as passed
  from expected_tables et
  join pg_class c on c.relname::text = et.table_name
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true

  union all

  select
    'public table policies' as check_name,
    count(*)::text as actual,
    '22' as expected,
    count(*) = 22 as passed
  from pg_policies
  where schemaname = 'public'
    and tablename::text in (select table_name from expected_tables)

  union all

  select
    'storage selfie policies' as check_name,
    count(*)::text as actual,
    '2' as expected,
    count(*) = 2 as passed
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname::text in (select policyname from expected_storage_policies)

  union all

  select
    'app_private helper functions' as check_name,
    count(*)::text as actual,
    '5' as expected,
    count(*) = 5 as passed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'app_private'
    and p.proname::text in (select function_name from expected_functions)

  union all

  select
    'attendance selfie bucket is private' as check_name,
    coalesce(bool_or(public = false)::text, 'false') as actual,
    'true' as expected,
    coalesce(bool_or(public = false), false) as passed
  from storage.buckets
  where id = 'attendance-selfies'
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  actual,
  expected
from summary
order by check_name;
