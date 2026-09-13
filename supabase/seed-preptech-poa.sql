-- Preptech POA masterplan (Preparation & Technical Committee), 13-17 Sep 2026.
-- Source: mainboard-ingested Preptech schedule (tagline #techkitojangeypecoh).
--
-- One row per time slot. Multi-task slots keep their bullets in description
-- (newline-separated). PIC labels live in assigned_to; assigned_to_ids stays
-- empty so the morning briefing broadcasts to all active PrepTech members.
-- notify_minutes_before = 0 -> briefing-only (no per-slot pings).
--
-- Safe to re-run: replaces only PrepTech rows in the 13-17 Sep window.

delete from public.poa_tasks
where bureau = 'PrepTech'
  and due_date between '2026-09-13' and '2026-09-17';

insert into public.poa_tasks (bureau, title, description, due_date, due_time, assigned_to, status, priority, notify_minutes_before, is_recurring) values
-- Sunday, 13 September 2026
('PrepTech', 'OR Opening & Inspection', 'Open & check Operations Room (OR), clean up OR, inspect other bureaus'' ORs', '2026-09-13', '08:00', 'PIC OR', 'todo', 'medium', 0, false),
('PrepTech', 'POA Presentation Prep', 'Prepare for POA presentation', '2026-09-13', '09:00', '5 persons', 'todo', 'medium', 0, false),
('PrepTech', 'POA Presentation', 'POA presentation', '2026-09-13', '10:30', 'ALL', 'todo', 'high', 0, false),
('PrepTech', 'KYKM Voice Recording & Storyboard', 'Voice recording KYKM and finalize storyboard (until 4:00 PM)', '2026-09-13', '14:00', '5 persons', 'todo', 'medium', 0, false),
('PrepTech', 'Store Opening & Inventory Sort', 'Open store, observe item claims, pick up Preptech items, sort inventory', '2026-09-13', '15:00', 'ALL', 'todo', 'medium', 0, false),
-- Monday, 14 September 2026
('PrepTech', 'OR Opening & Cleanup', 'Open & check OR, clean up OR', '2026-09-14', '08:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Shooting KYKM', 'SHOOTING KYKM (until 11:00 AM)', '2026-09-14', '09:00', 'ALL with MM', 'todo', 'high', 0, false),
('PrepTech', 'Bureau OR Sweep & STADD Follow-up', 'Bureau OR sweep (check issues, list items needed to purchase)
STADD follow-up (walkie-talkie, standing fan, coffee table, venue booking)', '2026-09-14', '11:00', 'ALL (Sweep) / 3 persons (STADD)', 'todo', 'high', 0, false),
('PrepTech', 'DBSB & OCAP Settlements', 'Settle chairs/tables with DBSB
Settle AV equipment & booking schedules with OCAP', '2026-09-14', '12:00', 'Head & Assistant', 'todo', 'high', 0, false),
('PrepTech', 'Walkie-Talkie Testing', 'Test walkie-talkies (Workshop)', '2026-09-14', '14:30', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Daily Post-Mortem', 'Daily Post-Mortem', '2026-09-14', '17:00', 'ALL', 'todo', 'medium', 0, false),
-- Tuesday, 15 September 2026
('PrepTech', 'Bureau OR Inspections', 'Inspect other bureaus'' ORs, list required items', '2026-09-15', '08:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Coordination Meeting with PC', 'Coordination meeting with PC', '2026-09-15', '09:00', 'ALL', 'todo', 'high', 0, false),
('PrepTech', 'OCAP Meeting with Br. Zahurin', 'Meeting with Br. Zahurin (OCAP AV equipment & booking follow-up)', '2026-09-15', '09:30', 'Head & Assistant', 'todo', 'high', 0, false),
('PrepTech', 'Nametag Photoshoot', 'NAMETAG PHOTOSHOOT (until 5:00 PM)', '2026-09-15', '14:00', 'ALL', 'todo', 'high', 0, false),
('PrepTech', 'Daily Post-Mortem', 'Daily Post-Mortem', '2026-09-15', '17:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Logistics & Supplies Shopping', 'Logistics & supplies shopping', '2026-09-15', '20:00', '2 persons', 'todo', 'medium', 0, false),
-- Wednesday, 16 September 2026 (Malaysia Day)
('PrepTech', 'Bureau Sweeps', 'Bureau sweeps (problem checks, collect finished confetti, purchase checks)', '2026-09-16', '08:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Real Session Simulation at SHAS Mosque', 'REAL SESSION SIMULATION AT SHAS MOSQUE', '2026-09-16', '09:30', 'ALL', 'todo', 'critical', 0, false),
('PrepTech', 'STADD Follow-up (Bai''ah Ceremony)', 'Follow up with STADD (Abg Jai / Abg Wan) regarding BAIAH CEREMONY', '2026-09-16', '14:00', 'Head & Assistant', 'todo', 'high', 0, false),
('PrepTech', 'Daily Post-Mortem', 'Daily Post-Mortem', '2026-09-16', '17:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Finalize Master Plan', 'Finalize Master Plan', '2026-09-16', '18:00', 'Head & Assistant', 'todo', 'high', 0, false),
-- Thursday, 17 September 2026
('PrepTech', 'Venue Final Touch-ups', 'Venue preparation for final touch-ups
Final touch-up presentation', '2026-09-17', '08:00', 'ALL', 'todo', 'high', 0, false),
('PrepTech', 'Bureau Sweeps', 'Bureau sweeps (problem checks, collect confetti, purchase queries)', '2026-09-17', '11:00', 'ALL', 'todo', 'medium', 0, false),
('PrepTech', 'Follow-up with DBSB', 'Follow-up with DBSB', '2026-09-17', '11:30', 'Head & Assistant', 'todo', 'high', 0, false),
('PrepTech', 'Final Confirmation with Abang Zai', 'Meeting with Abang Zai for final confirmation (floor plan, AV, booking schedule)', '2026-09-17', '14:00', 'Head & Assistant', 'todo', 'high', 0, false),
('PrepTech', 'Daily Post-Mortem', 'Daily Post-Mortem', '2026-09-17', '18:00', 'ALL', 'todo', 'medium', 0, false);

-- Sanity: expected 27 slots across 13-17 Sep.
select due_date, count(*) as slots from public.poa_tasks
where bureau = 'PrepTech' and due_date between '2026-09-13' and '2026-09-17'
group by due_date order by due_date;
