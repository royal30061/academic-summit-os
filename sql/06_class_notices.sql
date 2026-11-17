-- =====================================================================
-- Academic Summit - class notices (lecturer -> students), admin on/off switch
-- Run ONCE in the Supabase SQL editor AFTER 01 and 03. Safe to re-run. Changes no existing data.
-- Who receives a notice (all checked on the SERVER):
--   * same institution as the lecturer
--   * the student's uploaded course registration contains the course
--   * the student's level is one of the levels the lecturer ticked
--   * if the lecturer listed departments, the student's department matches one of them
--     (blank = every department registered for that course, e.g. shared GST classes)
-- A lecturer can only send for courses they registered in their teaching profile.
-- =====================================================================
begin;

insert into public.app_settings (key, value) values ('class_notices', true) on conflict (key) do nothing;

create table if not exists public.lecturer_courses (
  lecturer_id uuid not null references auth.users(id) on delete cascade,
  code  text not null,            -- normalised: upper case, no spaces
  label text not null,
  level text, dept text,
  primary key (lecturer_id, code)
);
alter table public.lecturer_courses enable row level security;

create table if not exists public.class_notices (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references auth.users(id) on delete cascade,
  course text not null, label text not null, uni text not null,
  kind text not null default 'class' check (kind in ('class', 'noclass')),
  levels integer[] not null, depts text[] not null default '{}',
  starts_at timestamptz not null, venue text, note text,
  created_at timestamptz not null default now()
);
create index if not exists class_notices_course_idx on public.class_notices (course, starts_at);
alter table public.class_notices enable row level security;   -- no policies: everything goes through the functions below

create or replace function public.class_notices_on()
returns boolean language sql stable security definer set search_path to 'public' as
$$ select coalesce((select value from public.app_settings where key = 'class_notices'), false) $$;
grant execute on function public.class_notices_on() to authenticated;

create or replace function public.admin_set_class_notices(p_on boolean)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  insert into public.app_settings (key, value) values ('class_notices', coalesce(p_on, false))
    on conflict (key) do update set value = coalesce(p_on, false);
  return public.class_notices_on();
end $function$;
revoke execute on function public.admin_set_class_notices(boolean) from public, anon;
grant  execute on function public.admin_set_class_notices(boolean) to authenticated;

-- the lecturer's registered courses, copied from their teaching profile
create or replace function public.sync_my_courses(p_courses jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare c jsonb; n integer := 0;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then raise exception 'Lecturers only'; end if;
  delete from public.lecturer_courses where lecturer_id = auth.uid();
  for c in select * from jsonb_array_elements(coalesce(p_courses, '[]'::jsonb)) limit 30 loop
    if coalesce(trim(c->>'code'), '') <> '' then
      insert into public.lecturer_courses (lecturer_id, code, label, level, dept)
      values (auth.uid(), upper(regexp_replace(c->>'code', '\s', '', 'g')), left(upper(trim(c->>'code')), 20), left(c->>'level', 10), left(c->>'dept', 80))
      on conflict (lecturer_id, code) do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;
revoke execute on function public.sync_my_courses(jsonb) from public, anon;
grant  execute on function public.sync_my_courses(jsonb) to authenticated;

create or replace function public.send_class_notice(
  p_course text, p_levels integer[], p_depts text[], p_starts timestamptz,
  p_venue text, p_note text, p_kind text default 'class')
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_code text := upper(regexp_replace(coalesce(p_course, ''), '\s', '', 'g')); v_uni text; v_label text; v_id uuid;
begin
  if not public.class_notices_on() then raise exception 'Class notices are switched off by the admin'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then raise exception 'Lecturers only'; end if;
  select uni into v_uni from public.profiles where id = auth.uid();
  if coalesce(trim(v_uni), '') = '' then raise exception 'Add your institution in your teaching profile first'; end if;
  select label into v_label from public.lecturer_courses where lecturer_id = auth.uid() and code = v_code;
  if v_label is null then raise exception 'Register this course in your teaching profile first'; end if;
  if p_levels is null or cardinality(p_levels) = 0 then raise exception 'Choose at least one level'; end if;
  if p_starts is null then raise exception 'Choose the date and time'; end if;
  if p_kind not in ('class', 'noclass') then p_kind := 'class'; end if;
  if (select count(*) from public.class_notices where lecturer_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Daily notice limit reached (20)'; end if;
  insert into public.class_notices (lecturer_id, course, label, uni, kind, levels, depts, starts_at, venue, note)
  values (auth.uid(), v_code, v_label, v_uni, p_kind, p_levels,
          coalesce((select array_agg(left(trim(d), 60)) from unnest(coalesce(p_depts, '{}')) d where trim(d) <> ''), '{}'),
          p_starts, left(p_venue, 80), left(p_note, 300))
  returning id into v_id;
  return v_id;
end $function$;
revoke execute on function public.send_class_notice(text, integer[], text[], timestamptz, text, text, text) from public, anon;
grant  execute on function public.send_class_notice(text, integer[], text[], timestamptz, text, text, text) to authenticated;

create or replace function public.delete_class_notice(p_id uuid)
returns void language sql security definer set search_path to 'public' as
$$ delete from public.class_notices where id = p_id and lecturer_id = auth.uid() $$;
revoke execute on function public.delete_class_notice(uuid) from public, anon;
grant  execute on function public.delete_class_notice(uuid) to authenticated;

-- what a student sees: only notices for courses in THEIR registration, their level, their institution
create or replace function public.my_class_notices(p_courses text[] default '{}')
returns table(id uuid, course text, label text, kind text, starts_at timestamptz, venue text, note text, lecturer text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uni text; v_lvl integer; v_dept text; v_norm text[];
begin
  if auth.uid() is null or not public.class_notices_on() then return; end if;
  select pr.uni, nullif(regexp_replace(coalesce(pr.level, ''), '\D', '', 'g'), '')::integer, lower(trim(coalesce(pr.program, '')))
    into v_uni, v_lvl, v_dept from public.profiles pr where pr.id = auth.uid();
  v_norm := coalesce((select array_agg(upper(regexp_replace(x, '\s', '', 'g'))) from unnest(coalesce(p_courses, '{}')) x), '{}');
  if cardinality(v_norm) = 0 or v_lvl is null then return; end if;
  return query
    select n.id, n.course, n.label, n.kind, n.starts_at, n.venue, n.note,
           trim(coalesce(to_jsonb(lp)->>'title', '') || ' ' || coalesce(lp.name, ''))
      from public.class_notices n join public.profiles lp on lp.id = n.lecturer_id
     where n.course = any(v_norm)
       and lower(trim(n.uni)) = lower(trim(coalesce(v_uni, '')))
       and v_lvl = any(n.levels)
       and (cardinality(n.depts) = 0 or exists (
              select 1 from unnest(n.depts) d where v_dept <> '' and (v_dept like '%' || lower(trim(d)) || '%' or lower(trim(d)) like '%' || v_dept || '%')))
       and n.starts_at >= now() - interval '3 hours' and n.starts_at <= now() + interval '30 days'
     order by n.starts_at asc limit 20;
end $function$;
revoke execute on function public.my_class_notices(text[]) from public, anon;
grant  execute on function public.my_class_notices(text[]) to authenticated;

commit;
notify pgrst, 'reload schema';
