-- =====================================================================
-- Academic Summit - registrations on the server, so the app can infer a student's courses from classmates
-- Run ONCE in the Supabase SQL editor (any time after 01). Safe to re-run. Changes no existing data.
-- The server keeps ONLY course codes per student. Others only ever see COUNTS ("7 students in your
-- department and level offer POS 204"), never who they are.
-- =====================================================================
begin;

create table if not exists public.student_courses (
  student_id uuid not null references auth.users(id) on delete cascade,
  code text not null,                       -- normalised: upper case, no spaces
  updated_at timestamptz not null default now(),
  primary key (student_id, code)
);
create index if not exists student_courses_code_idx on public.student_courses (code);
alter table public.student_courses enable row level security;   -- no policies: functions below only

-- a student's own registration (replaces their previous list)
create or replace function public.sync_my_registration(p_courses text[])
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare c text; n integer := 0;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then raise exception 'Students only'; end if;
  delete from public.student_courses where student_id = auth.uid();
  foreach c in array coalesce(p_courses, '{}') loop
    c := upper(regexp_replace(coalesce(c, ''), '\s', '', 'g'));
    if c ~ '^[A-Z0-9-]{5,12}$' and n < 30 then
      insert into public.student_courses (student_id, code) values (auth.uid(), c) on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;
revoke execute on function public.sync_my_registration(text[]) from public, anon;
grant  execute on function public.sync_my_registration(text[]) to authenticated;

-- courses that at least p_min classmates (same institution, department and level) have registered
create or replace function public.cohort_courses(p_min integer default 3)
returns table(code text, n bigint)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uni text; v_prog text; v_lvl text;
begin
  if auth.uid() is null then return; end if;
  select lower(trim(coalesce(pr.uni, ''))), lower(trim(coalesce(pr.program, ''))), regexp_replace(coalesce(pr.level, ''), '\D', '', 'g')
    into v_uni, v_prog, v_lvl from public.profiles pr where pr.id = auth.uid();
  if v_uni = '' or v_prog = '' or v_lvl = '' then return; end if;
  return query
    select sc.code, count(distinct sc.student_id)
      from public.student_courses sc join public.profiles p on p.id = sc.student_id
     where lower(trim(coalesce(p.uni, ''))) = v_uni and lower(trim(coalesce(p.program, ''))) = v_prog
       and regexp_replace(coalesce(p.level, ''), '\D', '', 'g') = v_lvl
     group by sc.code
    having count(distinct sc.student_id) >= greatest(coalesce(p_min, 3), 2)
     order by 2 desc, 1 limit 40;
end $function$;
revoke execute on function public.cohort_courses(integer) from public, anon;
grant  execute on function public.cohort_courses(integer) to authenticated;

commit;
notify pgrst, 'reload schema';
