-- =====================================================================
-- Academic Summit - attendance protections (geofence + device lock)
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Both switches start OFF, so attendance behaves exactly as before
-- until an admin turns a switch ON in the Admin Panel.
-- Deploy order: this SQL first, then the app files.
-- =====================================================================
begin;

-- ---------- 1. settings (only the admin function below can change them) ----------
create table if not exists public.app_settings (
  key        text primary key,
  value      boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.app_settings (key, value) values
  ('geofence_enforced', false),
  ('device_lock_enforced', false)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;     -- read only; no insert/update/delete policy exists

create or replace function public.att_setting(k text)
returns boolean language sql stable security definer set search_path to 'public' as
$$ select coalesce((select value from public.app_settings where key = k), false) $$;

create or replace function public.att_is_lecturer()
returns boolean language sql stable security definer set search_path to 'public' as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') $$;

create or replace function public.admin_set_setting(p_key text, p_value boolean)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  if p_key not in ('geofence_enforced', 'device_lock_enforced') then raise exception 'Unknown setting'; end if;
  update public.app_settings
     set value = coalesce(p_value, false), updated_at = now(), updated_by = auth.uid()
   where key = p_key;
end $function$;
revoke execute on function public.admin_set_setting(text, boolean) from public, anon;
grant  execute on function public.admin_set_setting(text, boolean) to authenticated;

-- ---------- 2. columns (radius per session, hashed device id per mark) ----------
alter table public.sessions    add column if not exists radius_m    integer;
alter table public.qa_sessions add column if not exists radius_m    integer;
alter table public.attendance  add column if not exists device_hash text;
alter table public.qa_marks    add column if not exists device_hash text;
create index if not exists attendance_session_device_ix on public.attendance (session_id, device_hash) where device_hash is not null;
create index if not exists qa_marks_session_device_ix   on public.qa_marks   (session_id, device_hash) where device_hash is not null;

-- ---------- 3. one shared range check. Returns NULL when the student is inside. ----------
-- Rejects: no position, position worse than +/-100 m, or farther than the lecturer's range.
create or replace function public.att_geo_reason(
  r_lat double precision, r_lng double precision, r_m integer,
  p_lat double precision, p_lng double precision, p_acc double precision)
returns text language plpgsql stable set search_path to 'public' as $function$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'no_location';
  end if;
  if p_acc is null or p_acc > 100 then return 'imprecise'; end if;
  if public.qa_dist(r_lat, r_lng, p_lat, p_lng) > r_m then return 'outside'; end if;
  return null;
end $function$;

-- ---------- 4. 5-DIGIT CODE MODE ----------
drop function if exists public.start_session(text, text, double precision, double precision, double precision);
create or replace function public.start_session(
  p_course text, p_topic text,
  p_lat double precision default null, p_lng double precision default null, p_acc double precision default null,
  p_radius integer default 100)
returns table(id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare v_code text; v_id uuid; v_exp timestamptz := now() + interval '90 seconds'; v_rad integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'lecturer') then
    raise exception 'Lecturers only';
  end if;
  v_rad := least(greatest(coalesce(p_radius, 100), 50), 700);
  if public.att_setting('geofence_enforced') then
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'Location is required to start a class while the range check is on. Turn on location and try again.';
    end if;
    if p_acc is null or p_acc > 100 then
      raise exception 'Your location is too imprecise to set the class range. Step near a window and try again.';
    end if;
  end if;
  loop
    v_code := lpad(floor(random()*100000)::int::text, 5, '0');
    exit when not exists (select 1 from public.sessions where code = v_code and expires_at > now());
  end loop;
  insert into public.sessions (lecturer_id, course, topic, code, expires_at, ref_lat, ref_lng, ref_acc, radius_m)
    values (auth.uid(), p_course, p_topic, v_code, v_exp, p_lat, p_lng, p_acc, v_rad)
    returning sessions.id into v_id;
  return query select v_id, v_code, v_exp;
end $function$;

drop function if exists public.mark_attendance(text, double precision, double precision, double precision);
create or replace function public.mark_attendance(
  p_code text,
  p_lat double precision default null, p_lng double precision default null, p_acc double precision default null,
  p_device text default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_sid uuid; v_course text;
  v_rlat double precision; v_rlng double precision; v_rad integer;
  v_dist integer; v_acc integer; v_reason text; v_dev text;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if public.att_is_lecturer() then raise exception 'Lecturers cannot mark attendance'; end if;

  -- tier 1 (yours, proven): burst limit
  if (select count(*) from public.attempt_log
        where student_id = auth.uid() and at > now() - interval '1 minute') >= 5 then
    raise exception 'Too many attempts. Wait a minute.';
  end if;
  insert into public.attempt_log (student_id) values (auth.uid());

  -- tier 2 (hardening): sustained wrong-code limit
  perform public.att_guard();

  select id, course, ref_lat, ref_lng, radius_m into v_sid, v_course, v_rlat, v_rlng, v_rad
    from public.sessions
   where code = p_code and expires_at > now()
   order by created_at desc limit 1;

  if v_sid is null then raise exception 'Invalid or expired code'; end if;

  -- RANGE CHECK (only when the admin switch is ON and the lecturer's position was captured)
  if public.att_setting('geofence_enforced') and v_rlat is not null and v_rlng is not null then
    v_reason := public.att_geo_reason(v_rlat, v_rlng, coalesce(v_rad, 100), p_lat, p_lng, p_acc);
    if v_reason = 'no_location' then
      raise exception 'Location is required. Allow location for this site and try again.';
    elsif v_reason = 'imprecise' then
      raise exception 'Your location is too imprecise. Step near a window, turn on high-accuracy location and try again.';
    elsif v_reason = 'outside' then
      raise exception 'You are outside the class range set by your lecturer.';
    end if;
    v_dist := null; v_acc := null;          -- measured, then dropped: never stored
  elsif p_lat is not null and p_lng is not null and v_rlat is not null and v_rlng is not null then
    v_dist := round(public.att_distance_m(p_lat, p_lng, v_rlat, v_rlng));   -- legacy receipt (switch OFF)
    v_acc  := coalesce(round(p_acc), 0);
  end if;

  -- DEVICE LOCK (only when the admin switch is ON)
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

  insert into public.attendance (session_id, student_id, distance_m, accuracy_m, device_hash)
    values (v_sid, auth.uid(), v_dist, v_acc, v_dev)
    on conflict do nothing;

  -- success: keep the failure counter honest
  update public.att_attempts set ok = true
   where uid = auth.uid()
     and at = (select max(at) from public.att_attempts where uid = auth.uid());

  return v_course;
end $function$;

-- ---------- 5. QR MODE ----------
drop function if exists public.qa_open(text, double precision, double precision, integer);
create or replace function public.qa_open(
  p_course text,
  p_lat double precision default null, p_lng double precision default null, p_acc integer default null,
  p_radius integer default 100)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare sid uuid; v_ok boolean; v_rad integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.att_is_lecturer() then raise exception 'Lecturers only'; end if;
  v_ok := coalesce(p_lat between -90 and 90 and p_lng between -180 and 180, false);
  if public.att_setting('geofence_enforced') then
    if not v_ok then
      raise exception 'Location is required to start a class while the range check is on. Turn on location and try again.';
    end if;
    if p_acc is null or p_acc > 100 then
      raise exception 'Your location is too imprecise to set the class range. Step near a window and try again.';
    end if;
  end if;
  v_rad := least(greatest(coalesce(p_radius, 100), 50), 700);
  insert into qa_sessions (lecturer, course, ref_lat, ref_lng, ref_acc, radius_m)
    values (auth.uid(), trim(p_course),
            case when v_ok then p_lat end, case when v_ok then p_lng end, p_acc, v_rad)
    returning id into sid;
  return sid;
end $function$;

drop function if exists public.qa_mark(text, text, text, double precision, double precision, integer);
create or replace function public.qa_mark(
  p_token text, p_name text default null, p_matric text default null,
  p_lat double precision default null, p_lng double precision default null, p_acc integer default null,
  p_device text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare s qa_sessions; k qa_tokens; n int; d int; a int; v_geo boolean := false; v_reason text; v_dev text;
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
    if v_reason is not null then return jsonb_build_object('ok', false, 'reason', v_reason); end if;
    v_geo := true;                           -- inside the range; the reading is dropped here
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

  insert into qa_marks (session_id, student, name, matric, distance_m, accuracy_m, device_hash)
    values (s.id, auth.uid(), left(p_name, 80), left(p_matric, 40), d, a, v_dev) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    select m.distance_m, m.accuracy_m into d, a from qa_marks m where m.session_id = s.id and m.student = auth.uid();
  end if;
  return jsonb_build_object('ok', true, 'course', s.course, 'already', n = 0, 'geo', v_geo,
                            'distance', d, 'accuracy', a, 'ref_acc', s.ref_acc, 'at', now());
end $function$;

-- QR token life: 90 seconds (the screen still rotates every 20)
create or replace function public.qa_token(p_session uuid)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare t text;
begin
  if not exists (select 1 from qa_sessions where id = p_session and lecturer = auth.uid() and closed_at is null) then
    raise exception 'not your open session';
  end if;
  delete from qa_tokens where session_id = p_session and expires_at < now() - interval '2 minutes';
  t := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into qa_tokens (token, session_id, expires_at) values (t, p_session, now() + interval '90 seconds');
  return t;
end $function$;

commit;
notify pgrst, 'reload schema';
