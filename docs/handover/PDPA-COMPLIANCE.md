# TawePro — PDPA & Data Privacy Compliance

| Field | Value |
|---|---|
| Version | 1.0 |
| Regulatory frame | Malaysia Personal Data Protection Act 2010 (PDPA), as amended |
| Audience | ITD Data Protection Officer (DPO), Welfare bureau lead, Mainboard |
| Event end | 25 September 2026 |
| Medical/wellbeing wipe deadline | **25 October 2026** (event end + 30 days) |

> This document is the operational data-lifecycle reference for TawePro. It covers what is
> collected, why, who can access it, how long it is kept, and the exact wipe procedure.

---

## 1. Data Inventory

### 1.1 Personal data (identifiable)

| Data | Source | Table.column | Purpose |
|---|---|---|---|
| Telegram ID / username | Telegram auth | `users.telegram_id`, `users.telegram_username` | Identity, messaging |
| Full name | Telegram profile | `users.name` | Rosters, leaderboards, ops |
| Profile photo URL | Telegram (if public) | `users.photo_url` | Avatars (with initials fallback) |
| Matric number | Student registration | `users.matric_number` | Identity, attendance records |
| Kulliyyah | Student registration | `users.kulliyyah` | Session routing, records |
| Mahallah | Student registration | `users.mahallah` | Leaderboards, logistics |
| Phone number | Wellbeing form (optional prefill) | `users.phone`, `wellbeing_reports.phone` | Welfare follow-up |
| Role / bureau | Access code redemption | `users.role`, `users.bureau` | RBAC |

### 1.2 Sensitive data (special care)

| Data | Table | Notes |
|---|---|---|
| Wellbeing category (e.g. Injury, Anxiety) | `wellbeing_reports.category` | Health-related |
| Medical conditions (Asthma, Food Allergies, Physical Disabilities, Chronic Illnesses, Mental Health Considerations) | `wellbeing_reports.medical_conditions` (text[]) | Explicit health data |
| Free-text notes | `wellbeing_reports.notes` | May contain health details |
| Check-in coordinates (lat/lng) | `student_attendance.latitude/longitude` | Location data (GPS-adjacent) |
| Attendance selfies | Supabase Storage (private bucket) + `attendance_proofs.selfie_path` | Biometric-adjacent imagery |

### 1.3 Operational data

Attendance status, task records, ops board, audit logs, notifications, reviews (anonymous),
and notification dedup keys.

---

## 2. Lawful Basis & Consent

| Processing | Basis | Notice |
|---|---|---|
| Registration (matric, kulliyyah, mahallah) | Consent + legitimate event administration | `/start` onboarding text + Mini App registration screen |
| Attendance + coordinates | Legitimate interest (compulsory programme attendance) | Check-in screen states location is used to verify attendance |
| Wellbeing/medical intake | **Explicit consent** | Form notice: "Your report is visible only to the Welfare bureau and Mainboard for response purposes" |
| Notifications | Consent (opt-in tiers / committee defaults with opt-out) | `/notifications` menu |

**Consent withdrawal:** users can message the ITD helpdesk to withdraw; medical reports can
be deleted on request (see §7), notification tiers are self-service (`/notifications`).

---

## 3. Data Lifecycle

```
Collection ──▶ Processing ──▶ Storage ──▶ Access ──▶ Retention ──▶ Disposal
   │               │              │           │           │            │
   │               │              │           │           │            └─ Wipe §6
   │               │              │           │           └─ §5 schedule
   │               │              │           └─ §4 restrictions
   │               │              └─ Supabase (Postgres + private Storage)
   │               └─ Server-side only (service role); RLS on all tables
   └─ Telegram initData, forms, check-ins, punch cards
```

---

## 4. Access Restrictions

| Data | Who can access | Enforcement |
|---|---|---|
| Own profile / own reports | The user | RLS: `claim_user_id()` |
| Wellbeing reports (all) | Welfare bureau + Mainboard only | RLS + server guard (`wellbeing.update`) |
| Attendance records | Owner; Mainboard for review | RLS + server guards |
| Attendance selfies | Owner; Special Task + Mainboard review | Private bucket + signed URLs (15 min) |
| Tasks / ops | Same bureau + heads + Mainboard | RLS + server guards |
| Users admin | Mainboard only | `users.list/update/revoke` |
| Audit trail | Mainboard | `audit_log` |

**Engineering guarantees**
- Phone numbers and medical data are **never** bundled into the frontend; they are fetched
  per-user through the authenticated API only.
- Service role keys exist only in Vercel env (server-side). The browser uses the anon key
  with RLS.
- The review flow stores **no user identifier** (`reviews` has no user column; only a
  display name chosen by the submitter).
- The bot never echoes medical details into public channels; Welfare alerts go to the
  Welfare bureau DM targets only.

---

## 5. Retention Schedule

| Data | Retention | Action at expiry |
|---|---|---|
| Wellbeing reports (incl. medical conditions, notes, phone) | **Event end + 30 days** (by 25 Oct 2026) | Export for Welfare records (if required) → delete rows |
| Attendance selfies (Storage) | Event end + 30 days | Delete bucket objects + `attendance_proofs` rows |
| Check-in coordinates | Event end + 30 days (recommended) | Null out `latitude`/`longitude` on historical rows (keep attendance status) |
| Attendance status records | 1 academic year (institutional record) | Archive/delete per IIUM policy |
| Users (name, matric, kulliyyah, mahallah) | 1 academic year | Archive/delete per IIUM policy |
| Notification dedup keys + heartbeat | 90 days | Delete rows older than 90 days |
| Audit log | 1 academic year | Archive per IIUM policy |
| Reviews (anonymous) | Until landing page retired | Delete with content takedown |

---

## 6. Post-Event Wipe Protocol (Wellbeing & Medical)

**Owner:** ITD DPO with Welfare bureau lead. **Deadline:** 25 October 2026.

### 6.1 Pre-wipe export (only if required for institutional records)
```sql
-- Run in Supabase SQL Editor; download the result as CSV and store in IIUM's
-- access-controlled records system (NOT in the repo, NOT in chat).
copy (
  select reference, submitted_at, category, medical_conditions, status, resolved_at
  from public.wellbeing_reports
  order by submitted_at
) to stdout with (format csv, header true);
```
> Do **not** export free-text notes unless explicitly required and approved by the DPO.

### 6.2 Wipe
```sql
-- 1) Wellbeing reports (all reports created during the event window)
delete from public.wellbeing_reports
where submitted_at < timestamptz '2026-10-26 00:00:00+08';

-- 2) Attendance selfie metadata (storage objects deleted via dashboard/API separately)
delete from public.attendance_proofs
where date < date '2026-10-26';

-- 3) Location minimisation (keep attendance status, drop coordinates)
update public.student_attendance
set latitude = null, longitude = null
where submitted_at < timestamptz '2026-10-26 00:00:00+08';

-- 4) Phone numbers collected for wellbeing prefill
update public.users set phone = null where phone is not null;
```

### 6.3 Storage bucket wipe
Supabase → Storage → attendance bucket → select all objects older than the event window →
**Delete**. Verify object count is 0 for the event period.

### 6.4 Audit + verification
```sql
-- Record the wipe in the audit trail (actor = the ITD operator account)
insert into public.audit_log (actor_id, actor_name, action, table_name, record_id, details)
values (null, 'ITD DPO', 'pdpa_wipe', 'wellbeing_reports', '', 'Post-event wellbeing wipe executed 2026-10-25');

-- Verify
select count(*) from public.wellbeing_reports;          -- expect 0 (or only post-event rows)
select count(*) from public.attendance_proofs where date < date '2026-10-26'; -- expect 0
select count(*) from public.student_attendance where latitude is not null;    -- expect 0
```

---

## 7. Data Subject Rights Procedure

| Right | How to fulfil |
|---|---|
| Access | ITD helpdesk verifies the Telegram identity, exports the user's rows (`users`, `student_attendance`, `wellbeing_reports`) and delivers via an approved channel |
| Correction | User edits matric/kulliyyah/mahallah themselves (`/start`); ITD corrects role/bureau via Mainboard tooling or SQL with an audit entry |
| Deletion | Delete the user's wellbeing reports immediately; anonymise attendance if institutional record must remain (replace name/matric with `DELETED`) |
| Withdraw consent | Stop notifications (`/notifications` → Off); for medical processing, deletion as above |
| Portability | Provide a JSON/CSV export of the user's own data |

Response SLA: **14 calendar days** from verified request.

---

## 8. Breach Response

1. **Contain** (0–1 h): revoke exposed keys, disable the affected endpoint, preserve logs.
2. **Assess** (1–24 h): scope of data, number of subjects, sensitivity (medical = high).
3. **Notify** (≤ 72 h): IIUM DPO + affected data subjects where required by PDPA.
4. **Remediate**: rotate secrets, patch, re-verify RLS, document in the audit trail.
5. **Post-mortem** within 7 days; update this document and the runbook.

---

## 9. Sub-processors & Cross-Border

| Processor | Role | Data location |
|---|---|---|
| Vercel | Hosting + serverless API | Global edge; project pinned region configurable |
| Supabase | Database, Storage, Realtime | Project region (verify in dashboard; default nearest available) |
| Telegram | Bot platform, Mini App delivery | Global (messages stored in Telegram) |
| UptimeRobot | Uptime pinging only | No personal data transmitted (bare GET) |

**Note:** Telegram itself processes user identity per its own privacy policy; TawePro stores
only the identifiers required for event operations. Avoid sending medical details in
Telegram messages — the Welfare alert intentionally contains only reference, name, category,
optional condition tags, and a short note excerpt.

---

## 10. DPIA Summary (Lightweight)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Medical data exposure | Low | High | RLS + server guards + 30-day wipe + no frontend bundling |
| Location data misuse | Low | Medium | Coordinates nulled post-event; used only for check-in |
| Selfie imagery exposure | Low | Medium | Private bucket + short-lived signed URLs + post-event wipe |
| Telegram identifier leakage | Medium | Low | Identifiers used only for messaging; no public display beyond chosen name |
| Unauthorised admin access | Low | High | Mainboard-only endpoints + audit log + token rotation at handover |
