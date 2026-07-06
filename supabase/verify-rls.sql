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
