-- ============================================================================
-- INTERESTALK - PERFILES DE APRENDIZAJE Y REPORTES
-- Migracion: 20261115_profiles_and_reports.sql
-- ============================================================================

-- 1. Tabla de perfiles de aprendizaje por usuario
create table if not exists public.user_learning_profiles (
  user_id text primary key,
  level text not null default 'B1',
  interests jsonb not null default '[]'::jsonb,
  custom_topics jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS para user_learning_profiles
alter table public.user_learning_profiles enable row level security;

drop policy if exists "Allow public read user learning profiles" on public.user_learning_profiles;
create policy "Allow public read user learning profiles"
  on public.user_learning_profiles
  for select
  to anon, authenticated, service_role
  using (true);

drop policy if exists "Service role manage user learning profiles" on public.user_learning_profiles;
create policy "Service role manage user learning profiles"
  on public.user_learning_profiles
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update on public.user_learning_profiles to anon, authenticated;
grant all on public.user_learning_profiles to service_role;

-- 2. Tabla de informes de Speaking
create table if not exists public.speaking_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),
  topic text not null,
  target_minutes int not null,
  duration_seconds int not null,
  turns_count int not null,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  corrections_log jsonb not null default '[]'::jsonb,
  summary_comment text not null
);

create index if not exists idx_speaking_reports_user_created 
  on public.speaking_reports (user_id, created_at desc);

alter table public.speaking_reports enable row level security;

drop policy if exists "Allow select speaking reports" on public.speaking_reports;
create policy "Allow select speaking reports"
  on public.speaking_reports
  for select
  to anon, authenticated, service_role
  using (true);

drop policy if exists "Service role manage speaking reports" on public.speaking_reports;
create policy "Service role manage speaking reports"
  on public.speaking_reports
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert on public.speaking_reports to anon, authenticated;
grant all on public.speaking_reports to service_role;
