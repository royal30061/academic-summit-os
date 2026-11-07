-- =====================================================================
-- ROLLBACK. You almost never need this: the fastest "undo" is to flip both
-- switches OFF in the Admin Panel (takes effect instantly, no SQL).
-- This restores the ORIGINAL versions of the five functions exactly as they
-- were before the protections. The new columns and the settings table are
-- harmless and are left in place.
-- If you roll back, also put the previous attend-qr.js back and delete attend-guard.js.
-- =====================================================================
begin;

drop function if exists public.start_session(text, text, double precision, double precision, double precision, integer);
drop function if exists public.mark_attendance(text, double precision, double precision, double precision, text);
drop function if exists public.qa_open(text, double precision, double precision, integer, integer);
drop function if exists public.qa_mark(text, text, text, double precision, double precision, integer, text);

create or replace function public.start_session(p_course text, p_topic text, p_lat double precision default null, p_lng double precision default null, p_acc double precision default null)
returns table(id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare v_code text; v_id uuid; v_exp timestamptz := now() + interval '90 seconds';
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then
    raise exception 'Lecturers only';
  end if;
  loop
    v_code := lpad(floor(random()*100000)::int::text, 5, '0');
    exit when not exists (select 1 from public.sessions where code = v_code and expires_at > now());
  end loop;
  insert into public.sessions (lecturer_id, course, topic, code, expires_at, ref_lat, ref_lng, ref_acc)
    values (auth.uid(), p_course, p_topic, v_code, v_exp, p_lat, p_lng, p_acc)
    returning sessions.id into v_id;
  return query select v_id, v_code, v_exp;
end $function$;

create or replace function public.mark_attendance(p_code text, p_lat double precision default null, p_lng double precision default null, p_acc double precision default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_sid uuid; v_course text;
  v_rlat double precision; v_rlng double precision;
  v_dist integer; v_acc integer;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if (select count(*) from public.attempt_log
        where student_id = auth.uid() and at > now() - interval '1 minute') >= 5 then
    raise exception 'Too many attempts. Wait a minute.';
  end if;
  insert into public.attempt_log (student_id) values (auth.uid());
  perform public.att_guard();
  select id, course, ref_lat, ref_lng into v_sid, v_course, v_rlat, v_rlng
    from public.sessions
   where code = p_code and expires_at > now()
   order by created_at desc limit 1;
  if v_sid is null then raise exception 'Invalid or expired code'; end if;
  if p_lat is not null and p_lng is not null and v_rlat is not null and v_rlng is not null then
    v_dist := round(public.att_distance_m(p_lat, p_lng, v_rlat, v_rlng));
    v_acc  := coalesce(round(p_acc), 0);
  end if;
  insert into public.attendance (session_id, student_id, distance_m, accuracy_m)
    values (v_sid, auth.uid(), v_dist, v_acc)
    on conflict do nothing;
  update public.att_attempts set ok = true
   where uid = auth.uid()
     and at = (select max(at) from public.att_attempts where uid = auth.uid());
  return v_course;
end $function$;

create or replace function public.qa_open(p_course text, p_lat double precision default null, p_lng double precision default null, p_acc integer default null)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into qa_sessions (lecturer, course, ref_lat, ref_lng, ref_acc)
    values (auth.uid(), trim(p_course),
            case when p_lat between -90 and 90 and p_lng between -180 and 180 then p_lat end,
            case when p_lat between -90 and 90 and p_lng between -180 and 180 then p_lng end,
            p_acc)
    returning id into sid;
  return sid;
end $function$;

create or replace function public.qa_mark(p_token text, p_name text default null, p_matric text default null, p_lat double precision default null, p_lng double precision default null, p_acc integer default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare s qa_sessions; k qa_tokens; n int; d int; a int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  select * into k from qa_tokens where token = upper(trim(p_token));
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if k.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  select * into s from qa_sessions where id = k.session_id;
  if s.closed_at is not null then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  if s.ref_lat is not null and p_lat between -90 and 90 and p_lng between -180 and 180 then
    d := qa_dist(s.ref_lat, s.ref_lng, p_lat, p_lng);
    a := greatest(0, least(coalesce(p_acc, 0), 5000));
  end if;
  insert into qa_marks (session_id, student, name, matric, distance_m, accuracy_m)
    values (s.id, auth.uid(), left(p_name, 80), left(p_matric, 40), d, a) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    select m.distance_m, m.accuracy_m into d, a from qa_marks m where m.session_id = s.id and m.student = auth.uid();
  end if;
  return jsonb_build_object('ok', true, 'course', s.course, 'already', n = 0,
                            'distance', d, 'accuracy', a, 'ref_acc', s.ref_acc, 'at', now());
end $function$;

create or replace function public.qa_token(p_session uuid)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare t text;
begin
  if not exists (select 1 from qa_sessions where id = p_session and lecturer = auth.uid() and closed_at is null) then
    raise exception 'not your open session';
  end if;
  delete from qa_tokens where session_id = p_session and expires_at < now() - interval '2 minutes';
  t := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into qa_tokens (token, session_id, expires_at) values (t, p_session, now() + interval '45 seconds');
  return t;
end $function$;

commit;
notify pgrst, 'reload schema';

-- ---- rollback of 03_min_session_size.sql (does not restore purged sessions) ----
drop function if exists public.admin_purge_thin_sessions(boolean);
drop function if exists public.my_kept_sessions(integer);
drop function if exists public.admin_set_min_session(integer);
drop function if exists public.att_min_size();
delete from public.app_settings where key = 'min_session_size';

-- ---- rollback of 04_student_attendance_report.sql ----
drop function if exists public.my_attendance_report(text[]);
delete from public.app_settings where key = 'attendance_pass_pct';

-- ---- rollback of 05_in_range_flag.sql ----
drop trigger if exists att_stamp_in_range on public.attendance;
drop function if exists public.att_stamp_in_range();
drop trigger if exists qa_stamp_in_range on public.qa_marks;
drop function if exists public.qa_stamp_in_range();
-- (the in_range columns are harmless; drop them only if you want: alter table ... drop column in_range;)

-- ---- rollback of 06_class_notices.sql ----
drop function if exists public.my_class_notices(text[]);
drop function if exists public.delete_class_notice(uuid);
drop function if exists public.send_class_notice(text, integer[], text[], timestamptz, text, text, text);
drop function if exists public.sync_my_courses(jsonb);
drop function if exists public.admin_set_class_notices(boolean);
drop function if exists public.class_notices_on();
-- tables kept on purpose (drop table public.class_notices; drop table public.lecturer_courses; to remove data)
delete from public.app_settings where key = 'class_notices';
