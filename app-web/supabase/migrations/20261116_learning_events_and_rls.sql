-- Persist educational events and restrict direct access to per-user data.

alter table public.user_learning_profiles
  add column if not exists diagnostic_completed boolean not null default false;

alter table public.user_learning_profiles enable row level security;
drop policy if exists "Allow public read user learning profiles"
  on public.user_learning_profiles;
drop policy if exists "Users can manage own learning profile"
  on public.user_learning_profiles;
create policy "Users can manage own learning profile"
  on public.user_learning_profiles
  for all
  to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

revoke all on public.user_learning_profiles from anon;
grant select, insert, update on public.user_learning_profiles to authenticated;
grant all on public.user_learning_profiles to service_role;

alter table public.speaking_reports enable row level security;
drop policy if exists "Allow select speaking reports"
  on public.speaking_reports;
drop policy if exists "Users can read own speaking reports"
  on public.speaking_reports;
create policy "Users can read own speaking reports"
  on public.speaking_reports
  for select
  to authenticated
  using (auth.uid()::text = user_id);

revoke all on public.speaking_reports from anon, authenticated;
grant select on public.speaking_reports to authenticated;
grant all on public.speaking_reports to service_role;

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  skill text not null check (
    skill in ('grammar', 'listening', 'speaking', 'diagnostic')
  ),
  topic text,
  level text,
  score numeric,
  duration_seconds integer not null default 0
    check (duration_seconds >= 0),
  errors_detected jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_events_user_created
  on public.learning_events (user_id, created_at desc);

alter table public.learning_events enable row level security;
drop policy if exists "Users can read own learning events"
  on public.learning_events;
create policy "Users can read own learning events"
  on public.learning_events
  for select
  to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own learning events"
  on public.learning_events;
create policy "Users can insert own learning events"
  on public.learning_events
  for insert
  to authenticated
  with check (auth.uid()::text = user_id);

revoke all on public.learning_events from anon;
grant select, insert on public.learning_events to authenticated;
grant all on public.learning_events to service_role;
