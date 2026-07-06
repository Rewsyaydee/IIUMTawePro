# Production Contract

This document describes the real backend shape needed before the IIUM Ta'aruf Week Mini App should be released publicly.

Companion files:

- `supabase/schema.sql`
- `supabase/rls-policies.sql`
- `docs/server-endpoints.md`
- `docs/backend-wiring-checklist.md`

## Launch Rules

- Never ship with `VITE_ENABLE_MOCKS=true`.
- Never expose `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_JWT_SECRET` to the browser.
- Validate Telegram `initData` on the server for every session.
- Map every Telegram user to exactly one app role: `student`, `committee`, `head`, or `mainboard`.
- Assign committee and head users to one fixed bureau.
- Keep Special Task attendance review separate from mainboard viewing.

## Required Tables

The canonical SQL draft now lives in `supabase/schema.sql`. Keep this section as a readable map for product review.

### users

- `id uuid primary key`
- `telegram_id text unique not null`
- `name text not null`
- `role text not null`
- `bureau text`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### invite_codes

- `id uuid primary key`
- `code text unique not null`
- `role text not null`
- `bureau text`
- `expires_at timestamptz`
- `used_by uuid references users(id)`
- `used_at timestamptz`
- `created_by uuid references users(id)`
- `created_at timestamptz not null default now()`

### schedule_items

- `id uuid primary key`
- `date date not null`
- `day text not null`
- `week text not null`
- `scheduled_start_time time not null`
- `scheduled_end_time time not null`
- `title text not null`
- `venue text not null`
- `tag text not null`
- `audience text not null`
- `description text`
- `is_live boolean not null default false`
- `notify_minutes_before int not null default 30`
- `responsible_bureau text`
- `readiness_status text not null default 'pending'`
- `pre_session_tasks jsonb not null default '[]'`

### wellbeing_reports

- `id uuid primary key`
- `reference text unique not null`
- `student_name text not null`
- `phone text not null`
- `category text not null`
- `notes text not null`
- `status text not null default 'submitted'`
- `assigned_to uuid references users(id)`
- `submitted_at timestamptz not null default now()`
- `resolved_at timestamptz`

### poa_tasks

- `id uuid primary key`
- `bureau text not null`
- `title text not null`
- `description text not null`
- `due_date date not null`
- `due_time time not null`
- `assigned_to text not null`
- `status text not null default 'todo'`
- `priority text not null default 'medium'`
- `notify_minutes_before int not null default 20`
- `is_recurring boolean not null default false`

### attendance_proofs

- `id uuid primary key`
- `date date not null`
- `user_id uuid references users(id)`
- `telegram_id text not null`
- `committee_name text not null`
- `bureau text not null`
- `selfie_path text not null`
- `submitted_at timestamptz not null default now()`
- `status text not null default 'pending_review'`
- `reviewed_by uuid references users(id)`
- `reviewed_at timestamptz`

### bureau_operations

- `id uuid primary key`
- `bureau text not null`
- `tool text not null`
- `title text not null`
- `detail text not null`
- `owner text not null`
- `status text not null default 'pending'`
- `metric text not null`
- `updated_at timestamptz not null default now()`

### banners

- `id uuid primary key`
- `title text not null`
- `body text not null`
- `type text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz`

### notifications

- `id uuid primary key`
- `target_role text not null`
- `target_bureau text`
- `title text not null`
- `body text not null`
- `type text not null`
- `telegram_message_id text`
- `send_status text not null default 'queued'`
- `sent_at timestamptz`
- `sent_by uuid references users(id)`
- `error text`

### audit_log

- `id uuid primary key`
- `actor_id uuid references users(id)`
- `actor_name text not null`
- `action text not null`
- `table_name text not null`
- `record_id text`
- `details text not null`
- `timestamp timestamptz not null default now()`

## RLS Policy Intent

- Students can read public schedule, resources, active banners, and their own wellbeing submissions.
- Committee can read their own bureau tasks, their own attendance proof, and their bureau operation records.
- Heads can read and update their bureau tasks and operation records.
- Special Task can review all attendance proofs, but cannot alter unrelated mainboard controls.
- Mainboard can administer users, invite codes, schedule items, banners, notifications, and audit views.
- Audit log is append-only from trusted server endpoints.

## API Endpoints

- `POST /api/auth/telegram` validates `initData`, returns app user profile and Supabase custom JWT.
- `POST /api/invites/redeem` consumes an invite code and creates or updates a user role.
- `POST /api/attendance/proofs` accepts selfie upload metadata and creates a pending proof.
- `POST /api/attendance/proofs/:id/review` lets Special Task approve or reject proof.
- `POST /api/notifications/send` sends official notices through Telegram Bot API.
- `POST /api/broadcasts/emergency` sends emergency broadcast and creates an active banner.
- `POST /api/schedule` creates a schedule item.
- `PATCH /api/schedule/:id` updates readiness or live state.
- `POST /api/audit` is server-only for append-only operational logs.

## Telegram Bot Requirements

- Bot token must live only in server environment variables.
- Store Telegram send result, message ID, and failure reason in `notifications`.
- Retry failed sends with a capped retry count.
- Keep emergency broadcast confirmation server-side audited.
- Use bot deep links only for invite or registration flows that are safe to expose.

## Release Rehearsal

1. Test student schedule, resources, and wellbeing submission.
2. Test committee task update, bureau operation update, and punch card selfie.
3. Test Special Task attendance review and rejection.
4. Test mainboard schedule publish, official notice, emergency broadcast, invite creation, and audit trail.
5. Confirm no mock role switcher or mock data source is visible in production.
