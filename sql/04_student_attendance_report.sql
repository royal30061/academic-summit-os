-- =====================================================================
-- Academic Summit - student attendance record (per-course % against the pass mark)
-- Run ONCE in the Supabase SQL editor AFTER 03_min_session_size.sql. Safe to re-run. Changes no data.
-- A student only ever sees THEIR OWN marks plus the number of classes held for their courses.
-- Classes below the minimum class size (03) are ignored everywhere, so lecturer and student agree.
-- =====================================================================
begin;

insert into public.app_settings (key, value, num_value) values ('attendance_pass_pct', false, 70)
on conflict (key) do nothing;

create or replace function public.my_attendance_report(p_courses text[] default '{}')
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid(); v_uni text; v_min integer := greatest(public.att_min_size(), 1);
  v_pct integer; v_norm text[]; v_att text[];
  held jsonb := '[]'; marks jsonb := '[]'; heldq jsonb := '[]'; marksq jsonb := '[]';
begin
  if v_uid is null then raise exception 'Not logged in'; end if;
  select uni into v_uni from public.profiles where id = v_uid;
  v_pct := coalesce((select num_value from public.app_settings where key = 'attendance_pass_pct'), 70);

  select coalesce(array_agg(distinct upper(regexp_replace(s.course, '\s', '', 'g'))), '{}') into v_att
    from public.attendance a join public.sessions s on s.id = a.session_id where a.student_id = v_uid;
  v_norm := coalesce((select array_agg(upper(regexp_replace(x, '\s', '', 'g'))) from unnest(coalesce(p_courses, '{}')) x), '{}') || v_att;

  -- classes held (5-digit code mode) for this student's courses, same institution, big enough to count
  select coalesce(jsonb_agg(jsonb_build_object('course', k.c, 'at', k.at)), '[]') into held from (
    select upper(regexp_replace(s.course, '\s', '', 'g')) c, s.created_at at
      from public.sessions s join public.profiles lp on lp.id = s.lecturer_id
     where upper(regexp_replace(s.course, '\s', '', 'g')) = any(v_norm)
       and (v_uni is null or lp.uni is null or lower(trim(lp.uni)) = lower(trim(v_uni)))
       and (select count(*) from public.attendance a where a.session_id = s.id) >= v_min
     order by s.created_at desc limit 2000) k;

  select coalesce(jsonb_agg(jsonb_build_object('course', m.c, 'topic', m.topic, 'at', m.at,
         'distance_m', m.distance_m, 'accuracy_m', m.accuracy_m, 'method', m.method, 'in_range', m.in_range, 'kind', 'code') order by m.at desc), '[]') into marks from (
    select upper(regexp_replace(s.course, '\s', '', 'g')) c, s.topic, a.marked_at at, a.distance_m, a.accuracy_m, to_jsonb(a)->>'method' as method, (to_jsonb(a)->>'in_range')::boolean as in_range
      from public.attendance a join public.sessions s on s.id = a.session_id
     where a.student_id = v_uid
       and (select count(*) from public.attendance a2 where a2.session_id = s.id) >= v_min
     order by a.marked_at desc limit 500) m;

  -- QR mode: isolated so a naming difference there can never break the code-mode record above
  begin
    select coalesce(jsonb_agg(jsonb_build_object('course', k.c, 'at', k.at)), '[]') into heldq from (
      select upper(regexp_replace(q.course, '\s', '', 'g')) c, (select min(m.marked_at) from public.qa_marks m where m.session_id = q.id) at
        from public.qa_sessions q join public.profiles lp on lp.id = q.lecturer
       where q.closed_at is not null
         and upper(regexp_replace(q.course, '\s', '', 'g')) = any(v_norm)
         and (v_uni is null or lp.uni is null or lower(trim(lp.uni)) = lower(trim(v_uni)))
         and (select count(*) from public.qa_marks m where m.session_id = q.id) >= v_min
       limit 2000) k;
    select coalesce(jsonb_agg(jsonb_build_object('course', m.c, 'topic', null, 'at', m.at,
           'distance_m', m.distance_m, 'accuracy_m', m.accuracy_m, 'method', 'qr', 'in_range', m.in_range, 'kind', 'qr') order by m.at desc), '[]') into marksq from (
      select upper(regexp_replace(q.course, '\s', '', 'g')) c, k.marked_at at, k.distance_m, k.accuracy_m, (to_jsonb(k)->>'in_range')::boolean as in_range
        from public.qa_marks k join public.qa_sessions q on q.id = k.session_id
       where k.student = v_uid and q.closed_at is not null
         and (select count(*) from public.qa_marks m2 where m2.session_id = q.id) >= v_min
       order by k.marked_at desc limit 500) m;
  exception when others then
    heldq := '[]'; marksq := '[]';
  end;

  return jsonb_build_object('pct', v_pct, 'held', held || heldq, 'marks', marks || marksq);
end $function$;
revoke execute on function public.my_attendance_report(text[]) from public, anon;
grant  execute on function public.my_attendance_report(text[]) to authenticated;

commit;
notify pgrst, 'reload schema';
