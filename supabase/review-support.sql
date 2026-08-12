-- Reviews + /review bot flow support (run once in Supabase SQL editor)

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  content text not null,
  rating smallint check (rating is null or rating between 1 and 5),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Multi-step /review flow state (kept OUT of users.registration_step so no
-- CHECK-constraint migration is needed, and anonymous reviewers are never
-- linked to a user row).
create table if not exists public.review_sessions (
  telegram_id text primary key,
  display_name text not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
alter table public.review_sessions enable row level security;

-- Only approved reviews are readable by clients (future review wall).
-- Writes (submit + moderation) go through the bot using the service role.
create policy "anyone can read approved reviews"
  on public.reviews for select
  using (is_approved = true);

-- review_sessions has no policies: bot-only (service role).

-- Verify:
--   select * from public.reviews order by created_at desc limit 10;
