-- =====================================================================
-- Academic Summit - range tuning (SMALL, low-risk). Run in the Supabase SQL editor. Safe to re-run.
-- Replaces ONLY the range-check helper att_geo_reason (not the marking function) and adds admin-adjustable numbers:
--   geo_radius_m         widest class range a lecturer may pick (default 200, allowed 50-300)
--   geo_max_accuracy_m   worst GPS error the server accepts   (default 150, allowed 20-200; it was a fixed 100)
--   geo_warn_accuracy_m  the app asks the student to retry above this GPS error (default 50)
--   attendance_pass_pct  pass mark (default 70)
-- These apply only while the admin's range-check switch (geofence_enforced) is ON.
-- Needs 03_min_session_size.sql (adds app_settings.num_value) and 04 (pass mark row).
-- =====================================================================
begin;

insert into public.app_settings (key, value, num_value) values
  ('geo_radius_m', false, 200), ('geo_max_accuracy_m', false, 150), ('geo_warn_accuracy_m', false, 50)
on conflict (key) do update set num_value = coalesce(public.app_settings.num_value, excluded.num_value);

create or replace function public.att_num(k text, d integer)
returns integer language sql stable security definer set search_path to 'public' as
$$ select coalesce((select num_value from public.app_settings where key = k), d) $$;
grant execute on function public.att_num(text, integer) to authenticated;

create or replace function public.att_geo_reason(
  r_lat double precision, r_lng double precision, r_m integer,
  p_lat double precision, p_lng double precision, p_acc double precision)
returns text language plpgsql stable set search_path to 'public' as $function$
declare v_cap integer := public.att_num('geo_radius_m', 200); v_accmax integer := public.att_num('geo_max_accuracy_m', 150); v_r integer;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'no_location';
  end if;
  if p_acc is null or p_acc > v_accmax then return 'imprecise'; end if;
  v_r := greatest(least(coalesce(r_m, v_cap), v_cap), 50);
  if public.qa_dist(r_lat, r_lng, p_lat, p_lng) > v_r then return 'outside'; end if;
  return null;
end $function$;

create or replace function public.att_rules()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('geo_radius_m', public.att_num('geo_radius_m', 200), 'geo_max_accuracy_m', public.att_num('geo_max_accuracy_m', 150),
         'geo_warn_accuracy_m', public.att_num('geo_warn_accuracy_m', 50), 'attendance_pass_pct', public.att_num('attendance_pass_pct', 70)) $$;
grant execute on function public.att_rules() to authenticated;

create or replace function public.admin_set_att_rule(p_key text, p_n integer)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare lo integer; hi integer;
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  if p_key = 'geo_radius_m' then lo := 50; hi := 300;
  elsif p_key = 'geo_max_accuracy_m' then lo := 20; hi := 200;
  elsif p_key = 'geo_warn_accuracy_m' then lo := 10; hi := 150;
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
