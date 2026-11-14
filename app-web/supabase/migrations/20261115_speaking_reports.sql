-- ============================================================================
-- INTERESTALK - INFORMES DE FEEDBACK PEDAGOGICO DE SPEAKING
-- Almacena el historial de sesiones orales y analisis pedagogico.
-- ============================================================================

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

-- Indice para consultar rapidamente el historial de informes por usuario
create index if not exists idx_speaking_reports_user_created 
  on public.speaking_reports (user_id, created_at desc);

-- Row Level Security (RLS)
alter table public.speaking_reports enable row level security;

drop policy if exists "Allow select speaking reports" on public.speaking_reports;
create policy "Allow select speaking reports"
  on public.speaking_reports
  for select
  to public, authenticated, service_role
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
