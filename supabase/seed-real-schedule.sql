-- Seed schedule_items for the REAL Ta'aruf Week Semester 1 2026/2027 programme.
-- Source of truth: REAL TAWE SCHEDULE.md (Appendix 1 programme schedule, 13 July 2026).
-- Schedule period: 10 - 25 September 2026. Replaces the old Aug 1-9 placeholder loop.
--
-- Conventions:
--   * Attendance scheme = 10 required blocks: Mon 21 - Fri 25 Sep, one
--     before_break + one after_break block per day. Exactly ONE flagship item
--     per block carries is_attendance_required = true.
--   * Blocks follow the programme sessions (window = first item start -> last
--     item end of that block's non-concurrent items).
--   * Break / prayer / ambient rows never get a block (block = null) so they do
--     not extend attendance windows; their tag is 'Break' or 'Prayer'.
--   * Truly parallel activities from the document's Concurrent columns are
--     seeded is_concurrent = true, block = null (excluded from attendance).
--   * "Time not stated" housekeeping rows (Self Management etc.) are omitted —
--     no end time exists in the source, so none is fabricated.
--   * TBD venue -> venue_code 'tbc'. "TBD" end times are never invented.

delete from public.schedule_items where date between '2026-09-10' and '2026-09-25';

insert into public.schedule_items (date, day, week, scheduled_start_time, scheduled_end_time, title, venue, tag, audience, responsible_bureau, description, venue_code, is_attendance_required, block, block_group, is_concurrent, track, program_count) values
-- ── PREPARATION ──────────────────────────────────────────────────────────────
-- Thursday, 10 Sep 2026
('2026-09-10', 'Thursday', 'preparation', '09:00', '13:00', 'Mahallah Registration (International Students)', 'Wadi Budi', 'Registration', 'All', 'Registration', 'For international students.', null, false, null, null, false, null, 1),
-- Friday, 11 Sep 2026
('2026-09-11', 'Friday', 'preparation', '09:00', '13:00', 'Special Programme for International Student', 'Experimental Hall', 'Programme', 'All', 'Program Coordinator', null, null, false, null, null, false, null, 1),
-- Tuesday, 15 Sep 2026
('2026-09-15', 'Tuesday', 'preparation', '09:00', '13:00', 'Medical Checkup for International Students', 'TBD', 'Programme', 'All', 'Welfare', 'Priority to International students of Pagoh and Kuantan Campus. Venue = TBD', 'tbc', false, null, null, false, null, 1),
('2026-09-15', 'Tuesday', 'preparation', '13:00', '14:00', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-15', 'Tuesday', 'preparation', '14:00', '17:00', 'Medical Checkup for International Students', 'TBD', 'Programme', 'All', 'Welfare', 'Priority to International students of Pagoh and Kuantan Campus. Venue = TBD', 'tbc', false, null, null, false, null, 1),
-- Thursday, 17 Sep 2026
('2026-09-17', 'Thursday', 'preparation', '09:00', '13:00', 'Medical Checkup for International Students', 'TBD', 'Programme', 'All', 'Welfare', 'Priority to International students of Pagoh and Kuantan Campus. Venue = TBD', 'tbc', false, null, null, false, null, 1),
('2026-09-17', 'Thursday', 'preparation', '13:00', '14:30', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-17', 'Thursday', 'preparation', '14:30', '15:30', 'Bus to Pagoh and Kuantan Campus', 'Bus Stop', 'Departure', 'Students', 'Special Task', '14:30 at bus stop. For direct intake International Students only. Departure end time not stated in source.', 'bus-stop', false, null, null, false, null, 1),
-- Friday, 18 Sep 2026
('2026-09-18', 'Friday', 'preparation', '09:00', '13:00', 'Mahallah Registration (Non-Former CFS students)', 'Respective Mahallah', 'Registration', 'All', 'Registration', 'Direct Intake - UPU/Malaysian.', 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-18', 'Friday', 'preparation', '13:00', '14:45', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-18', 'Friday', 'preparation', '14:45', '16:30', 'Briefing by CELPAD - On EPT, APT', 'Online', 'Briefing', 'All', 'Program Coordinator', 'Broadcast.', 'online', false, null, null, false, null, 1),
('2026-09-18', 'Friday', 'preparation', '16:30', '17:00', 'Briefing by CCC on Fardhu Ain Test (FAT)', 'Online', 'Briefing', 'All', 'Program Coordinator', 'Broadcast.', 'online', false, null, null, false, null, 1),
-- Saturday, 19 Sep 2026
('2026-09-19', 'Saturday', 'preparation', '09:00', '13:00', 'Mahallah Registration for Former-CFS', 'Respective Mahallah', 'Registration', 'All', 'Registration', 'List of Mahallahs: Aminah, Ruqayyah, Maryam, Asma, Sumayyah, Faruq, Bilal and Ali.', 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-19', 'Saturday', 'preparation', '13:00', '14:00', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-19', 'Saturday', 'preparation', '14:00', '16:00', 'Mahallah Registration for Former-CFS', 'Respective Mahallah', 'Registration', 'All', 'Registration', 'List of Mahallahs: Aminah, Ruqayyah, Maryam, Asma, Sumayyah, Faruq, Bilal and Ali.', 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-19', 'Saturday', 'preparation', '08:30', '12:00', 'English Proficiency Test (EPT)', 'TBD', 'Placement Test', 'Students', 'Program Coordinator', 'KAED & KOE. Non-Former CFS students.', 'tbc', false, null, null, true, 'KAED & KOE', 1),
('2026-09-19', 'Saturday', 'preparation', '12:00', '13:00', 'Fardhu Ain Test (FAT)', 'TBD', 'Placement Test', 'Students', 'Program Coordinator', 'KAED & KOE. For International Students only.', 'tbc', false, null, null, true, 'KAED & KOE', 1),
('2026-09-19', 'Saturday', 'preparation', '14:30', '17:00', 'Arabic Proficiency Test (APT)', 'TBD', 'Placement Test', 'Students', 'Program Coordinator', 'KAED & KOE. Non-Former CFS students.', 'tbc', false, null, null, true, 'KAED & KOE', 1),
-- Sunday, 20 Sep 2026
('2026-09-20', 'Sunday', 'preparation', '09:00', '13:00', 'Mahallah Registration - Former CFS', 'Respective Mahallah', 'Registration', 'All', 'Registration', 'List of Mahallahs: Asiah, Halimah, Hafsah, Nusaibah, Safiyyah, Salahuddin, Uthman, Siddiq and Zubair.', 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-20', 'Sunday', 'preparation', '13:00', '14:00', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-20', 'Sunday', 'preparation', '14:00', '16:00', 'Mahallah Registration - Former CFS', 'Respective Mahallah', 'Registration', 'All', 'Registration', 'List of Mahallahs: Asiah, Halimah, Hafsah, Nusaibah, Safiyyah, Salahuddin, Uthman, Siddiq and Zubair.', 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-20', 'Sunday', 'preparation', '17:00', '20:00', 'Maghrib & Isya'' Congregational Prayer', 'Respective Mahallah', 'Prayer', 'All', null, null, 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-20', 'Sunday', 'preparation', '20:00', '21:00', 'My Mahallah My Second Home', 'Respective Mahallah', 'Programme', 'All', 'Discipline', null, 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-20', 'Sunday', 'preparation', '08:30', '12:00', 'English Proficiency Test (EPT) (SPEAKING)', 'TBD', 'Placement Test', 'Students', 'Program Coordinator', 'KAED & KOE. Non-Former CFS students.', 'tbc', false, null, null, true, 'KAED & KOE', 1),
('2026-09-20', 'Sunday', 'preparation', '14:30', '17:00', 'English Proficiency Test (EPT) (SPEAKING)', 'TBD', 'Placement Test', 'Students', 'Program Coordinator', 'KAED & KOE. Non-Former CFS students.', 'tbc', false, null, null, true, 'KAED & KOE', 1),

-- ── EVENT WEEK ───────────────────────────────────────────────────────────────
-- Monday, 21 Sep 2026
('2026-09-21', 'Monday', 'event_week', '08:30', '09:30', 'Briefing from STADD', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '09:30', '10:30', 'Welcoming Session with Prof. Dato'' Dr. Mohamad Fauzan Noordin (Deputy Rector Student Development and Community Engagement)', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', '(MY IIUM). Broadcast.', 'shas-mosque', true, 'before_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '10:30', '11:00', 'Briefing on Ta''aruf Week', 'Main Prayer Hall, SHAS Mosque', 'Briefing', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '11:00', '12:00', 'Forum Session with KCDIO AMAD & CCC', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '12:00', '12:45', 'Forum Session with KCDIO FINANCE Division & IIUM Endowment Fund', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '12:45', '14:00', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-21', 'Monday', 'event_week', '14:00', '15:15', 'Forum Session with KCDIO OLA, OSHBE, & OSEM', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', true, 'after_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '15:15', '16:15', 'Forum Session with KCDIO RSD & ITD', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'after_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '16:15', '17:00', 'Asr Congregational Prayer', 'Respective Mahallah', 'Prayer', 'All', null, null, 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-21', 'Monday', 'event_week', '17:00', '18:00', 'Murabbi Session', 'IIUM SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'after_break', '2026-09-21', false, null, 1),
('2026-09-21', 'Monday', 'event_week', '18:00', '20:00', 'Maghrib & Isya'' Congregational Prayer', 'Respective Mahallah', 'Prayer', 'All', null, null, 'mahallah-zone', false, null, null, false, null, 1),
('2026-09-21', 'Monday', 'event_week', '08:30', '17:00', 'Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM', 'Foyer, SHAS Mosque', 'Exhibition', 'All', 'Program Coordinator', null, null, false, null, null, true, null, 1),
-- Tuesday, 22 Sep 2026
('2026-09-22', 'Tuesday', 'event_week', '08:30', '09:15', 'Session with Leaders Prime Minister Office', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', true, 'before_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '09:15', '10:00', 'KPT SLOT Akademi Kenegaraan Malaysia MADANI', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', false, 'before_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '10:00', '10:45', 'KPT SLOT Literasi Undi 18', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', false, 'before_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '10:45', '11:45', 'Forum Session with KCDIO DSU & STADD Welfare Unit', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '11:45', '12:45', 'Forum Session with CCSC & ISC', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, 'before_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '12:45', '14:30', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '14:30', '15:15', 'KPT SLOT Slot Literasi Artificial Intelligence', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', true, 'after_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '15:15', '16:00', 'KPT SLOT Literasi Kewangan by ASNB', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', false, 'after_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '16:00', '17:00', 'Break for Asr'' Congregational Prayer', 'Main Prayer Hall, SHAS Mosque', 'Prayer', 'All', null, 'Broadcast.', 'shas-mosque', false, null, null, false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '17:00', '17:30', 'Forum Session with Student Union, Mahallah Representative and Kulliyyah Based Society', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', false, 'after_break', '2026-09-22', false, null, 1),
('2026-09-22', 'Tuesday', 'event_week', '08:30', '17:00', 'Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM', 'Foyer, SHAS Mosque', 'Exhibition', 'All', 'Program Coordinator', null, null, false, null, null, true, null, 1),
-- Wednesday, 23 Sep 2026
('2026-09-23', 'Wednesday', 'event_week', '09:00', '12:30', 'Insan Madani Session', 'Respective Kulliyyah', 'Programme', 'All', 'Program Coordinator', null, 'kulliyyah-zone', true, 'before_break', '2026-09-23', false, null, 1),
('2026-09-23', 'Wednesday', 'event_week', '12:30', '14:30', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-23', 'Wednesday', 'event_week', '14:30', '17:00', 'Insan Madani Session', 'Respective Kulliyyah', 'Programme', 'All', 'Program Coordinator', null, 'kulliyyah-zone', true, 'after_break', '2026-09-23', false, null, 1),
('2026-09-23', 'Wednesday', 'event_week', '17:00', '21:00', 'Break for Asr'' Congregational Prayer', 'Main Prayer Hall, SHAS Mosque', 'Prayer', 'All', null, 'Broadcast.', 'shas-mosque', false, null, null, false, null, 1),
('2026-09-23', 'Wednesday', 'event_week', '21:00', '22:00', 'Syarahan Madani Abad ke-21', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', null, 'shas-mosque', false, null, null, false, null, 1),
('2026-09-23', 'Wednesday', 'event_week', '08:30', '17:00', 'Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM', 'Foyer, SHAS Mosque', 'Exhibition', 'All', 'Program Coordinator', null, null, false, null, null, true, null, 1),
-- Thursday, 24 Sep 2026
('2026-09-24', 'Thursday', 'event_week', '09:00', '12:30', 'Insan Madani Session', 'Respective Kulliyyah', 'Programme', 'All', 'Program Coordinator', null, 'kulliyyah-zone', true, 'before_break', '2026-09-24', false, null, 1),
('2026-09-24', 'Thursday', 'event_week', '12:30', '14:30', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-24', 'Thursday', 'event_week', '14:30', '17:00', 'Insan Madani Session', 'Respective Kulliyyah', 'Programme', 'All', 'Program Coordinator', null, 'kulliyyah-zone', true, 'after_break', '2026-09-24', false, null, 1),
('2026-09-24', 'Thursday', 'event_week', '08:30', '17:00', 'Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM', 'Foyer, SHAS Mosque', 'Exhibition', 'All', 'Program Coordinator', null, null, false, null, null, true, null, 1),
-- Friday, 25 Sep 2026
('2026-09-25', 'Friday', 'event_week', '08:30', '09:30', 'KPT SLOT Cakna Pertahanan (MINDEF)', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', true, 'before_break', '2026-09-25', false, null, 1),
('2026-09-25', 'Friday', 'event_week', '08:30', '09:30', 'KPT SLOT MySiswa Place (YPS)', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Program Coordinator', 'Broadcast.', 'shas-mosque', false, 'before_break', '2026-09-25', false, null, 1),
('2026-09-25', 'Friday', 'event_week', '11:00', '11:45', 'Bai''ah Rehearsal', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Discipline', 'Broadcast.', 'shas-mosque', false, 'before_break', '2026-09-25', false, null, 1),
('2026-09-25', 'Friday', 'event_week', '11:45', '15:00', 'Break for Lunch and Zuhr', 'Around Campus', 'Break', 'All', null, null, null, false, null, null, false, null, 1),
('2026-09-25', 'Friday', 'event_week', '15:00', '16:00', 'Bai''ah Ceremony', 'Main Prayer Hall, SHAS Mosque', 'Programme', 'All', 'Discipline', 'Broadcast.', 'shas-mosque', true, 'after_break', '2026-09-25', false, null, 1),
('2026-09-25', 'Friday', 'event_week', '08:30', '17:00', 'Exhibition and Activation of RHB Card & ASNB Account', 'Foyer, SHAS Mosque', 'Exhibition', 'All', 'Program Coordinator', null, null, false, null, null, true, null, 1);

-- Sanity: 10 attendance blocks (5 days x 2). Expected distinct required block_group+block = 10.
select count(distinct block_group || '|' || block) as required_blocks
from public.schedule_items
where is_attendance_required = true;
