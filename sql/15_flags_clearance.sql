-- =====================================================================
-- Academic Summit - (1) consent + first-visit flags on the profile, (2) exam clearance reports
-- Run ONCE in the Supabase SQL editor. Safe to re-run. Needs 03 (min class size), 08 (student_courses).
-- (1) Server-side flags (the profile is the source of truth, so they follow the student across phones):
--       consent_at / marketing_opt_in (marketing is OFF unless the student ticks it)
--       first_visit_done  - new accounts are dropped straight onto the attendance screen once
--       has_seen_glow_cue - on the second visit the Attend tab glows until they open it
--     Everyone who already has an account is marked as done, so only NEW sign-ups see the first-time flow.
-- (2) Exam clearance: a lecturer picks a course and a cutoff (30-100%, default 75) PER REPORT. It never touches
--     the school-wide pass mark (attendance_pass_pct). Every report generated is saved as an audit snapshot.
-- =====================================================================
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'first_visit_done') then
    alter table public.profiles add column first_visit_done boolean not null default false;
    alter table public.profiles add column has_seen_glow_cue boolean not null default false;
    update public.profiles set first_visit_done = true, has_seen_glow_cue = true;       -- existing users: not "first time"
  end if;
end $$;
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;

create or replace function public.my_flags()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('consent', consent_at is not null, 'marketing', marketing_opt_in,
                            'first_visit_done', first_visit_done, 'glow_seen', has_seen_glow_cue)
    from public.profiles where id = auth.uid()
$$;
create or replace function public.record_consent(p_marketing boolean default false)
returns boolean language sql security definer set search_path to 'public' as $$
  update public.profiles set consent_at = now(), marketing_opt_in = coalesce(p_marketing, false) where id = auth.uid() returning true
$$;
create or replace function public.mark_first_visit()
returns boolean language sql security definer set search_path to 'public' as $$
  update public.profiles set first_visit_done = true where id = auth.uid() returning true
$$;
create or replace function public.mark_glow_seen()
returns boolean language sql security definer set search_path to 'public' as $$
  update public.profiles set has_seen_glow_cue = true where id = auth.uid() returning true
$$;
revoke execute on function public.my_flags(), public.record_consent(boolean), public.mark_first_visit(), public.mark_glow_seen() from public, anon;
grant  execute on function public.my_flags(), public.record_consent(boolean), public.mark_first_visit(), public.mark_glow_seen() to authenticated;

-- ---------- exam clearance ----------
create table if not exists public.exam_clearance_reports (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  cutoff integer not null check (cutoff between 30 and 100),
  held integer not null,
  rows jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ecr_lecturer_idx on public.exam_clearance_reports (lecturer_id, created_at desc);
alter table public.exam_clearance_reports enable row level security;
drop policy if exists ecr_own_read on public.exam_clearance_reports;
create policy ecr_own_read on public.exam_clearance_reports for select to authenticated using (lecturer_id = auth.uid());
revoke insert, update, delete, truncate on public.exam_clearance_reports from anon, authenticated;   -- written only by the function below
revoke all on public.exam_clearance_reports from anon;

create or replace function public.clearance_report(p_course text, p_cutoff integer default 75)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_code text := upper(regexp_replace(coalesce(p_course, ''), '\s', '', 'g'));
  v_cut integer := least(greatest(coalesce(p_cutoff, 75), 30), 100);
  v_min integer := greatest(public.att_min_size(), 1);
  v_held integer; v_uni text; v_rows jsonb; v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then raise exception 'Lecturers only'; end if;
  if v_code = '' then raise exception 'Choose a course'; end if;
  select pr.uni into v_uni from public.profiles pr where pr.id = auth.uid();

  select count(*) into v_held from public.sessions s
   where s.lecturer_id = auth.uid() and upper(regexp_replace(s.course, '\s', '', 'g')) = v_code
     and (select count(*) from public.attendance a where a.session_id = s.id) >= v_min;

  with kept as (
    select s.id from public.sessions s
     where s.lecturer_id = auth.uid() and upper(regexp_replace(s.course, '\s', '', 'g')) = v_code
       and (select count(*) from public.attendance a where a.session_id = s.id) >= v_min
  ), people as (
    select a.student_id as sid from public.attendance a where a.session_id in (select id from kept)
    union
    select sc.student_id from public.student_courses sc join public.profiles q on q.id = sc.student_id
     where sc.code = v_code and lower(trim(coalesce(q.uni, ''))) = lower(trim(coalesce(v_uni, '')))
  ), counted as (
    select p.id, coalesce(p.name, '') as nm, coalesce(p.matric, '') as mt,
           (select count(*) from public.attendance a where a.student_id = p.id and a.session_id in (select id from kept)) as att
      from public.profiles p where p.id in (select sid from people)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', c.nm, 'matric', c.mt, 'attended', c.att, 'held', v_held,
           'pct', case when v_held > 0 then round(100.0 * c.att / v_held) else 0 end,
           'eligible', v_held > 0 and 100.0 * c.att >= v_cut * v_held) order by c.mt, c.nm), '[]'::jsonb)
    into v_rows from counted c;

  insert into public.exam_clearance_reports (lecturer_id, course, cutoff, held, rows)
    values (auth.uid(), v_code, v_cut, v_held, v_rows) returning id into v_id;
  return jsonb_build_object('id', v_id, 'course', v_code, 'cutoff', v_cut, 'held', v_held, 'rows', v_rows, 'generated_at', now());
end $function$;
revoke execute on function public.clearance_report(text, integer) from public, anon;
grant  execute on function public.clearance_report(text, integer) to authenticated;

commit;
notify pgrst, 'reload schema';
