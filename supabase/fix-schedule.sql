-- Fix the live schedule after the production switch:
--   1) Remove stale placeholder rows (old Aug 1-9 template) and any row
--      outside the real programme window (10-25 Sep 2026).
--   2) Placement tests (19-20 Sep): single clean venue "KAED & KOE" and drop
--      the redundant KAED & KOE track chip (cards show one venue line).
--   3) Medical checkups (15 & 17 Sep): venue -> IIUM Sejahtera Clinic
--      (the doc's "Venue = TBD" note is preserved in the description).
-- Run once in the Supabase SQL editor.

delete from public.schedule_items
where date < '2026-09-10' or date > '2026-09-25';

update public.schedule_items
set venue = 'KAED & KOE',
    venue_code = null,
    track = null,
    updated_at = now()
where date in ('2026-09-19', '2026-09-20')
  and tag = 'Placement Test';

update public.schedule_items
set venue = 'IIUM Sejahtera Clinic',
    venue_code = 'sejahtera-clinic',
    updated_at = now()
where date in ('2026-09-15', '2026-09-17')
  and title ilike 'Medical Checkup%';
