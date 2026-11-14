-- ============================================================================
-- INTERESTALK - CUOTAS DIARIAS DE VOZ Y CACHE DE LISTENING
-- Limite estricto: 1.200 segundos/dia (20 minutos) de Speaking por usuario.
-- ============================================================================

-- 1. Tabla de cuotas diarias por usuario
create table if not exists public.daily_usage_quotas (
  user_id uuid not null,
  usage_date date not null default current_date,
  speaking_seconds int not null default 0 check (speaking_seconds >= 0 and speaking_seconds <= 1200),
  tts_characters int not null default 0 check (tts_characters >= 0),
  primary key (user_id, usage_date)
);

-- 2. Row Level Security (RLS)
alter table public.daily_usage_quotas enable row level security;

drop policy if exists "Users can read own daily usage quota" on public.daily_usage_quotas;
create policy "Users can read own daily usage quota"
  on public.daily_usage_quotas
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage daily usage quotas" on public.daily_usage_quotas;
create policy "Service role can manage daily usage quotas"
  on public.daily_usage_quotas
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.daily_usage_quotas to authenticated;
grant all on public.daily_usage_quotas to service_role;

-- 3. RPC atomica para incrementar segundos de Speaking (maximo 1.200 s/dia)
create or replace function public.increment_speaking_seconds(
  p_user_id uuid,
  p_seconds int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_seconds int;
  v_remaining_seconds int;
begin
  if p_user_id is null then
    raise exception 'INVALID_USER_ID' using errcode = '22023';
  end if;

  if p_seconds is null or p_seconds < 0 then
    raise exception 'INVALID_SPEAKING_SECONDS' using errcode = '22023';
  end if;

  insert into public.daily_usage_quotas (user_id, usage_date, speaking_seconds, tts_characters)
  values (p_user_id, current_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  select speaking_seconds
    into v_current_seconds
    from public.daily_usage_quotas
   where user_id = p_user_id
     and usage_date = current_date
     for update;

  if v_current_seconds + p_seconds > 1200 then
    raise exception 'DAILY_SPEAKING_LIMIT_REACHED'
      using errcode = 'P0001',
            detail = format('remaining_seconds=%s', greatest(0, 1200 - v_current_seconds));
  end if;

  update public.daily_usage_quotas
     set speaking_seconds = v_current_seconds + p_seconds
   where user_id = p_user_id
     and usage_date = current_date
  returning (1200 - speaking_seconds) into v_remaining_seconds;

  return v_remaining_seconds;
end;
$$;

revoke all on function public.increment_speaking_seconds(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_speaking_seconds(uuid, int) to service_role;

-- 4. RPC atomica auxiliar para acumular caracteres de TTS consumidos en el dia
create or replace function public.increment_tts_characters(
  p_user_id uuid,
  p_characters int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_characters int;
begin
  if p_user_id is null then
    raise exception 'INVALID_USER_ID' using errcode = '22023';
  end if;

  if p_characters is null or p_characters < 0 then
    raise exception 'INVALID_TTS_CHARACTERS' using errcode = '22023';
  end if;

  insert into public.daily_usage_quotas (user_id, usage_date, speaking_seconds, tts_characters)
  values (p_user_id, current_date, 0, p_characters)
  on conflict (user_id, usage_date)
  do update set tts_characters = public.daily_usage_quotas.tts_characters + excluded.tts_characters
  returning tts_characters into v_total_characters;

  return v_total_characters;
end;
$$;

revoke all on function public.increment_tts_characters(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_tts_characters(uuid, int) to service_role;

-- 5. Bucket publico de cache para audios de Listening
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listening-audio', 'listening-audio', true, 10485760, array['audio/mpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['audio/mpeg'];

drop policy if exists "Public read access for listening-audio" on storage.objects;
create policy "Public read access for listening-audio"
  on storage.objects
  for select
  to public
  using (bucket_id = 'listening-audio');

drop policy if exists "Service role write access for listening-audio" on storage.objects;
create policy "Service role write access for listening-audio"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'listening-audio')
  with check (bucket_id = 'listening-audio');
