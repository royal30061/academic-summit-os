-- Geofence fix: location = evidence, never a gate. Removes the false "artificial" rejections.
begin;

create or replace function public.att_geo_reason(
  r_lat double precision, r_lng double precision, r_m integer,
  p_lat double precision, p_lng double precision, p_acc double precision)
returns text language plpgsql stable set search_path to 'public' as $function$
declare v_cap integer := public.att_num('geo_radius_m', 200);
        v_accmax integer := public.att_num('geo_max_accuracy_m', 150); v_r integer;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'no_location';
  end if;
  if p_acc is null or p_acc > v_accmax then return 'imprecise'; end if;
  v_r := greatest(least(coalesce(r_m, v_cap), v_cap), 50);
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

  select id, course, ref_lat, ref_lng, radius_m into v_sid, v_course, v_rlat, v_rlng, v_rad
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

  insert into public.attendance (session_id, student_id, distance_m, accuracy_m, device_hash, in_range)
    values (v_sid, auth.uid(), v_dist, v_acc, v_dev, v_inrange)
    on conflict do nothing;

  update public.att_attempts set ok = true
   where uid = auth.uid()
     and at = (select max(at) from public.att_attempts where uid = auth.uid());

  return v_course;
end $function$;

create or replace function public.att_stamp_in_range()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare r_rad integer;
begin
  if auth.uid() is null or auth.uid() is distinct from new.student_id then return new; end if;
  if new.in_range is not null then return new; end if;
  if new.distance_m is not null then
    select radius_m into r_rad from public.sessions where id = new.session_id;
    new.in_range := new.distance_m <= coalesce(r_rad, 100);
  end if;
  return new;
end $function$;

commit;
notify pgrst, 'reload schema';
