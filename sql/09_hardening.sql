-- =====================================================================
-- Academic Summit - hardening: tighter range, artificial-location check, 3-attempts-a-minute limiter,
-- admin-adjustable rules. Run ONCE in the Supabase SQL editor AFTER 01 and 03. Safe to re-run.
-- It REPLACES two live functions (att_geo_reason, mark_attendance). Rollback: 99_rollback.sql restores the originals
-- by re-running sections 3 and 4 of 01_attendance_protections.sql.
-- TEST WITH ONE STUDENT AND ONE LECTURER BEFORE A REAL CLASS.
-- Rules (admin changes them in the Admin Panel, no code needed):
--   geo_radius_m        class range cap in metres (default 20). A lecturer's chosen range can never exceed it.
--   geo_max_accuracy_m  worst GPS error the server will accept (default 50). The app warns students at 20.
--   att_max_attempts    code attempts per student per minute (default 3), then a wait of up to 60 s.
-- Range and accuracy only apply while the admin's range-check switch (geofence_enforced) is ON.
-- =====================================================================
begin;

insert into public.app_settings (key, value, num_value) values
  ('geo_radius_m', false, 20), ('geo_max_accuracy_m', false, 50), ('att_max_attempts', false, 3)
on conflict (key) do update set num_value = coalesce(public.app_settings.num_value, excluded.num_value);

create or replace function public.att_num(k text, d integer)
returns integer language sql stable security definer set search_path to 'public' as
$$ select coalesce((select num_value from public.app_settings where key = k), d) $$;
grant execute on function public.att_num(text, integer) to authenticated;

-- one range check shared by code mode and QR mode. Returns NULL when the student is inside.
create or replace function public.att_geo_reason(
  r_lat double precision, r_lng double precision, r_m integer,
  p_lat double precision, p_lng double precision, p_acc double precision)
returns text language plpgsql stable set search_path to 'public' as $function$
declare v_cap integer := public.att_num('geo_radius_m', 20); v_accmax integer := public.att_num('geo_max_accuracy_m', 50); v_r integer;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'no_location';
  end if;
  if p_acc is null then return 'imprecise'; end if;
  if p_acc <= 0 then return 'artificial'; end if;                                   -- a real GPS never reports zero error
  if p_acc > v_accmax then return 'imprecise'; end if;
  if abs(p_lat - r_lat) < 0.0000001 and abs(p_lng - r_lng) < 0.0000001 then return 'artificial'; end if;   -- identical to the lecturer's point (about 1 cm)
  v_r := greatest(least(coalesce(r_m, v_cap), v_cap), 10);                         -- never wider than the admin cap, never under 10 m
  if public.qa_dist(r_lat, r_lng, p_lat, p_lng) > v_r then return 'outside'; end if;
  return null;
end $function$;

create or replace function public.mark_attendance(
  p_code text,
  p_lat double precision default null, p_lng double precision default null, p_acc double precision default null,
  p_device text default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_sid uuid; v_course text;
  v_rlat double precision; v_rlng double precision; v_rad integer;
  v_dist integer; v_acc integer; v_reason text; v_dev text;
  v_max integer := greatest(public.att_num('att_max_attempts', 3), 1); v_n integer; v_wait integer;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if public.att_is_lecturer() then raise exception 'Lecturers cannot mark attendance'; end if;

  -- tier 1: attempts per minute, tracked here in the database (clearing the app or reinstalling changes nothing)
  select count(*) into v_n from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute';
  if v_n >= v_max then
    select greatest(1, ceil(60 - extract(epoch from (now() - t.at))))::integer into v_wait
      from (select at from public.attempt_log where student_id = auth.uid() and at > now() - interval '1 minute'
             order by at desc offset v_max - 1 limit 1) t;
    raise exception 'Too many attempts. Try again in % seconds.', coalesce(v_wait, 60);
  end if;
  insert into public.attempt_log (student_id) values (auth.uid());

  -- tier 2: sustained wrong-code limit
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
      raise exception 'Weak GPS signal. Step closer to the centre of the room or near a window, turn on high-accuracy location and retry.';
    elsif v_reason = 'artificial' then
      raise exception 'Your location looks artificial. Turn off any fake-GPS app and try again.';
    elsif v_reason = 'outside' then
      raise exception 'You are outside the class range set by your lecturer.';
    elsif v_reason is not null then
      raise exception 'Location check failed. Try again.';
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

-- admin: read and change the four rules (the pass mark lives here too)
create or replace function public.att_rules()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('geo_radius_m', public.att_num('geo_radius_m', 20), 'geo_max_accuracy_m', public.att_num('geo_max_accuracy_m', 50),
         'att_max_attempts', public.att_num('att_max_attempts', 3), 'attendance_pass_pct', public.att_num('attendance_pass_pct', 70)) $$;
grant execute on function public.att_rules() to authenticated;

create or replace function public.admin_set_att_rule(p_key text, p_n integer)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare lo integer; hi integer;
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  if p_key = 'geo_radius_m' then lo := 10; hi := 700;
  elsif p_key = 'geo_max_accuracy_m' then lo := 10; hi := 100;
  elsif p_key = 'att_max_attempts' then lo := 1; hi := 10;
  elsif p_key = 'attendance_pass_pct' then lo := 50; hi := 100;
  else raise exception 'Unknown rule'; end if;
  insert into public.app_settings (key, value, num_value) values (p_key, false, least(greatest(coalesce(p_n, lo), lo), hi))
    on conflict (key) do update set num_value = least(greatest(coalesce(p_n, lo), lo), hi), updated_at = now(), updated_by = auth.uid();
  return public.att_num(p_key, lo);
end $function$;
revoke execute on function public.admin_set_att_rule(text, integer) from public, anon;
grant  execute on function public.admin_set_att_rule(text, integer) to authenticated;

commit;
notify pgrst, 'reload schema';
