-- =====================================================================
-- Academic Summit - (1) every attendance row records WHICH LECTURER and WHICH COURSE, (2) Bluetooth (BLE) marks.
-- Run ONCE in the Supabase SQL editor, after 15_flags_clearance.sql. Safe to re-run.
--
-- (1) attendance.lecturer_id / course_code / class_level / method are filled by the SERVER from the lecturer's session,
--     never typed by the student. Two lecturers teaching the same course code can no longer be mixed up: each mark
--     points at one lecturer. Existing rows are back-filled from their session.
--     mark_attendance is re-created with the SAME logic as 14_soft_geofence.sql; only the insert gained 4 columns.
-- (2) BLE marks are written to the SAME attendance table (method = 'ble'), so student percentages, class records and
--     exam clearance lists count them with no further change. ble_marks keeps the signal strength for auditing.
--     The lecturer phone rotates a short token; the server accepts the current and the previous one for 90 seconds.
--     The signal-strength limit is checked on the student's phone only (the server cannot verify a phone's own
--     reading); the rotating token is the server-side gate.
-- (3) QR marks (qa_marks) get the same lecturer/course columns, and the QR range check now records position as evidence instead of
--     rejecting weak indoor GPS (same rule as the 5-digit path since sql/14).
-- No setting is changed.
-- =====================================================================
begin;

alter table public.attendance add column if not exists lecturer_id uuid;
alter table public.attendance add column if not exists course_code text;
alter table public.attendance add column if not exists class_level text;
alter table public.attendance add column if not exists method text;
alter table public.sessions   add column if not exists class_level text;
alter table public.sessions   add column if not exists ble_token text;
alter table public.sessions   add column if not exists ble_token_at timestamptz;
alter table public.sessions   add column if not exists ble_prev_token text;
alter table public.sessions   add column if not exists ble_prev_at timestamptz;

update public.attendance a
   set lecturer_id = s.lecturer_id,
       course_code = upper(regexp_replace(coalesce(s.course, ''), '\s', '', 'g')),
       class_level = coalesce(a.class_level, s.class_level),
       method      = coalesce(a.method, 'code')
  from public.sessions s
 where s.id = a.session_id and a.lecturer_id is null;

create index if not exists attendance_lecturer_course_ix on public.attendance (lecturer_id, course_code);

-- the lecturer's level is sent right after the class starts (start_session itself is untouched)
create or replace function public.set_session_level(p_session uuid, p_level text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  update public.sessions set class_level = nullif(left(trim(coalesce(p_level, '')), 12), '')
   where id = p_session and lecturer_id = auth.uid();
end $function$;
revoke execute on function public.set_session_level(uuid, text) from public, anon;
grant  execute on function public.set_session_level(uuid, text) to authenticated;

-- ---------- mark_attendance: identical to 14_soft_geofence.sql except the lecturer/course/level binding ----------
create or replace function public.mark_attendance(
  p_code text,
  p_lat double precision default null, p_lng double precision default null, p_acc double precision default null,
  p_device text default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_sid uuid; v_course text; v_lid uuid; v_level text;
  v_rlat double precision; v_rlng double precision; v_rad integer;
  v_dist integer; v_acc integer; v_reason text; v_dev text;
  v_max integer := greatest(public.att_num('att_max_attempts', 3), 1); v_n integer; v_wait integer;
  v_inrange boolean;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if public.att_is_lecturer() then raise exception 'Lecturers cannot mark attendance'; end if;

  select count(*) into v_n from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute';
  if v_n >= v_max then
    select greatest(1, ceil(60 - extract(epoch from (now() - t.at))))::integer into v_wait
      from (select at from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute'
             order by at desc offset v_max - 1 limit 1) t;
    raise exception 'Too many attempts. Try again in % seconds.', coalesce(v_wait, 60);
  end if;
  insert into public.attempt_log (student_id) values (auth.uid());

  perform public.att_guard();

  select id, course, lecturer_id, class_level, ref_lat, ref_lng, radius_m
    into v_sid, v_course, v_lid, v_level, v_rlat, v_rlng, v_rad
    from public.sessions
   where code = p_code and expires_at > now()
   order by created_at desc limit 1;

  if v_sid is null then raise exception 'Invalid or expired code'; end if;

  v_dist := null; v_acc := null; v_inrange := null;
  if public.att_setting('geofence_enforced') and v_rlat is not null and v_rlng is not null then
    v_reason := public.att_geo_reason(v_rlat, v_rlng, coalesce(v_rad, 100), p_lat, p_lng, p_acc);
    if v_reason is null then v_inrange := true;
    elsif v_reason = 'outside' then v_inrange := false;
    else v_inrange := null;
    end if;
  elsif p_lat is not null and p_lng is not null and v_rlat is not null and v_rlng is not null then
    v_dist := round(public.att_distance_m(p_lat, p_lng, v_rlat, v_rlng));
    v_acc  := coalesce(round(p_acc), 0);
  end if;

  if public.att_setting('device_lock_enforced') then
    if p_device is null or length(p_device) < 16 then
      raise exception 'Device check failed. Refresh the app and try again.';
    end if;
    v_dev := encode(sha256(convert_to(p_device, 'utf8')), 'hex');
    perform pg_advisory_xact_lock(hashtext(v_sid::text || v_dev));
    if exists (select 1 from public.attendance
                where session_id = v_sid and device_hash = v_dev and student_id <> auth.uid()) then
      raise exception 'This phone has already marked attendance for this class. Each student must use their own phone.';
    end if;
  end if;

  insert into public.attendance (session_id, student_id, distance_m, accuracy_m, device_hash, in_range,
                                 lecturer_id, course_code, class_level, method)
    values (v_sid, auth.uid(), v_dist, v_acc, v_dev, v_inrange,
            v_lid, upper(regexp_replace(coalesce(v_course, ''), '\s', '', 'g')), v_level, 'code')
    on conflict do nothing;

  update public.att_attempts set ok = true
   where uid = auth.uid()
     and at = (select max(at) from public.att_attempts where uid = auth.uid());

  return v_course;
end $function$;

-- ---------- BLE ----------
create table if not exists public.ble_marks (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  rssi integer,
  device_hash text,
  created_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.ble_marks enable row level security;      -- no policies: reachable only through the functions below

create or replace function public.ble_rotate_token(p_session uuid, p_token text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if p_token is null or p_token !~ '^[A-Z2-9]{4,8}$' then raise exception 'Bad token'; end if;
  update public.sessions
     set ble_prev_token = ble_token, ble_prev_at = ble_token_at,
         ble_token = p_token, ble_token_at = now()
   where id = p_session and lecturer_id = auth.uid();
  if not found then raise exception 'Not your class'; end if;
end $function$;
revoke execute on function public.ble_rotate_token(uuid, text) from public, anon;
grant  execute on function public.ble_rotate_token(uuid, text) to authenticated;

create or replace function public.ble_mark(
  p_token text, p_rssi integer default null, p_device text default null, p_session uuid default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_sid uuid; v_course text; v_lid uuid; v_level text; v_dev text;
  v_max integer := greatest(public.att_num('att_max_attempts', 3), 1); v_n integer; v_wait integer;
  v_rssi integer := case when p_rssi between -127 and 0 then p_rssi else null end;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if public.att_is_lecturer() then raise exception 'Lecturers cannot mark attendance'; end if;
  if p_token is null or p_token !~ '^[A-Z2-9]{4,8}$' then raise exception 'Bluetooth code not recognised. Try again.'; end if;

  -- same 3-a-minute limiter as the 5-digit code
  select count(*) into v_n from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute';
  if v_n >= v_max then
    select greatest(1, ceil(60 - extract(epoch from (now() - t.at))))::integer into v_wait
      from (select at from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute'
             order by at desc offset v_max - 1 limit 1) t;
    raise exception 'Too many attempts. Try again in % seconds.', coalesce(v_wait, 60);
  end if;
  insert into public.attempt_log (student_id) values (auth.uid());
  perform public.att_guard();

  select id, course, lecturer_id, class_level into v_sid, v_course, v_lid, v_level
    from public.sessions
   where (p_session is null or id = p_session)
     and ((ble_token = p_token and ble_token_at > now() - interval '90 seconds')
       or (ble_prev_token = p_token and ble_prev_at > now() - interval '90 seconds'))
   order by created_at desc limit 1;
  if v_sid is null then raise exception 'Bluetooth code expired. Stay near the lecturer and try again.'; end if;

  if public.att_setting('device_lock_enforced') then
    if p_device is null or length(p_device) < 16 then
      raise exception 'Device check failed. Refresh the app and try again.';
    end if;
    v_dev := encode(sha256(convert_to(p_device, 'utf8')), 'hex');
    perform pg_advisory_xact_lock(hashtext(v_sid::text || v_dev));
    if exists (select 1 from public.attendance
                where session_id = v_sid and device_hash = v_dev and student_id <> auth.uid()) then
      raise exception 'This phone has already marked attendance for this class. Each student must use their own phone.';
    end if;
  end if;

  insert into public.attendance (session_id, student_id, device_hash, in_range, lecturer_id, course_code, class_level, method)
    values (v_sid, auth.uid(), v_dev, true, v_lid, upper(regexp_replace(coalesce(v_course, ''), '\s', '', 'g')), v_level, 'ble')
    on conflict do nothing;

  insert into public.ble_marks (session_id, student_id, rssi, device_hash)
    values (v_sid, auth.uid(), v_rssi, v_dev)
    on conflict (session_id, student_id)
    do update set rssi = greatest(coalesce(public.ble_marks.rssi, -127), coalesce(excluded.rssi, -127));

  return v_course;
end $function$;
revoke execute on function public.ble_mark(text, integer, text, uuid) from public, anon;
grant  execute on function public.ble_mark(text, integer, text, uuid) to authenticated;

-- ---------- QR attendance: same lecturer/course binding + same soft range rule as the code path ----------
-- Isolated in its own block (like sql/05) so a naming difference in the QR tables can never undo the parts above.
-- Behaviour change to know about: before, the QR path REJECTED a student whose GPS was weak or missing indoors
-- (reasons imprecise / no_location / outside). Now, like the 5-digit path since sql/14, the position is recorded as
-- evidence (in_range true / false / unknown) and the mark is accepted.
do $qr$
begin
  alter table public.qa_marks add column if not exists lecturer_id uuid;
  alter table public.qa_marks add column if not exists course_code text;
  alter table public.qa_marks add column if not exists method text;
  alter table public.qa_marks add column if not exists in_range boolean;

  update public.qa_marks m
     set lecturer_id = q.lecturer,
         course_code = upper(regexp_replace(coalesce(q.course, ''), '\s', '', 'g')),
         method = coalesce(m.method, 'qr')
    from public.qa_sessions q
   where q.id = m.session_id and m.lecturer_id is null;
  create index if not exists qa_marks_lecturer_course_ix on public.qa_marks (lecturer_id, course_code);

  execute $mk$
  create or replace function public.qa_mark(
    p_token text, p_name text default null, p_matric text default null,
    p_lat double precision default null, p_lng double precision default null, p_acc integer default null,
    p_device text default null)
  returns jsonb language plpgsql security definer set search_path to 'public' as $function$
  declare s qa_sessions; k qa_tokens; n int; d int; a int; v_geo boolean := false; v_inr boolean; v_reason text; v_dev text;
  begin
    if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
    if public.att_is_lecturer() then return jsonb_build_object('ok', false, 'reason', 'not_student'); end if;
    select * into k from qa_tokens where token = upper(trim(p_token));
    if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
    if k.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
    select * into s from qa_sessions where id = k.session_id;
    if s.closed_at is not null then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;

    if public.att_setting('geofence_enforced') and s.ref_lat is not null and s.ref_lng is not null then
      v_reason := public.att_geo_reason(s.ref_lat, s.ref_lng, coalesce(s.radius_m, 100), p_lat, p_lng, p_acc);
      if v_reason is null then v_geo := true; v_inr := true;
      elsif v_reason = 'outside' then v_inr := false;
      else v_inr := null;
      end if;                                -- the reading itself is dropped here, never stored
    elsif s.ref_lat is not null and p_lat between -90 and 90 and p_lng between -180 and 180 then
      d := qa_dist(s.ref_lat, s.ref_lng, p_lat, p_lng);
      a := greatest(0, least(coalesce(p_acc, 0), 5000));
    end if;

    if public.att_setting('device_lock_enforced') then
      if p_device is null or length(p_device) < 16 then
        return jsonb_build_object('ok', false, 'reason', 'device');
      end if;
      v_dev := encode(sha256(convert_to(p_device, 'utf8')), 'hex');
      perform pg_advisory_xact_lock(hashtext(s.id::text || v_dev));
      if exists (select 1 from qa_marks where session_id = s.id and device_hash = v_dev and student <> auth.uid()) then
        return jsonb_build_object('ok', false, 'reason', 'device_used');
      end if;
    end if;

    insert into qa_marks (session_id, student, name, matric, distance_m, accuracy_m, device_hash, in_range,
                          lecturer_id, course_code, method)
      values (s.id, auth.uid(), left(p_name, 80), left(p_matric, 40), d, a, v_dev, v_inr,
              s.lecturer, upper(regexp_replace(coalesce(s.course, ''), '\s', '', 'g')), 'qr')
      on conflict do nothing;
    get diagnostics n = row_count;
    if n = 0 then
      select m.distance_m, m.accuracy_m into d, a from qa_marks m where m.session_id = s.id and m.student = auth.uid();
    end if;
    return jsonb_build_object('ok', true, 'course', s.course, 'already', n = 0, 'geo', v_geo,
                              'distance', d, 'accuracy', a, 'ref_acc', s.ref_acc, 'at', now());
  end $function$;
  $mk$;

  execute $mk$
  create or replace function public.qa_stamp_in_range()
  returns trigger language plpgsql security definer set search_path to 'public' as $function$
  declare r_rad integer;
  begin
    if auth.uid() is null or auth.uid() is distinct from new.student then return new; end if;
    if new.in_range is not null then return new; end if;
    if new.distance_m is not null then
      select radius_m into r_rad from public.qa_sessions where id = new.session_id;
      new.in_range := new.distance_m <= coalesce(r_rad, 100);
    end if;
    return new;
  end $function$;
  $mk$;
exception when others then
  raise notice 'QR binding skipped: %', sqlerrm;
end $qr$;

commit;
notify pgrst, 'reload schema';

-- Undo (keeps all data): restore the previous mark_attendance by re-running sql/14_soft_geofence.sql, restore qa_mark from
-- sql/01_attendance_protections.sql and qa_stamp_in_range from sql/05_in_range_flag.sql, then
--   drop function if exists public.ble_mark(text, integer, text, uuid);
--   drop function if exists public.ble_rotate_token(uuid, text);
--   drop function if exists public.set_session_level(uuid, text);
