-- =====================================================================
-- Academic Summit - range check that allows for GPS error. Run in the Supabase SQL editor. Safe to re-run.
-- Replaces ONLY the helper att_geo_reason (not the marking function). Changes from the earlier versions:
--   * Accuracy-aware distance: a student counts as inside if (distance - their GPS error) is within the range.
--     Without this, an honest student 40 m from the lecturer with a 60 m GPS error could be rejected.
--   * "Artificial location" is now narrow: an exact match to the lecturer's point AND a claimed accuracy under 10 m,
--     or a reported error of zero. (Indoor phones that share a Wi-Fi-based position are no longer caught by mistake.)
-- Needs att_num() from 09 or 09a (both create it).
-- =====================================================================
begin;

create or replace function public.att_geo_reason(
  r_lat double precision, r_lng double precision, r_m integer,
  p_lat double precision, p_lng double precision, p_acc double precision)
returns text language plpgsql stable set search_path to 'public' as $function$
declare v_cap integer := public.att_num('geo_radius_m', 200); v_accmax integer := public.att_num('geo_max_accuracy_m', 150); v_r integer;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'no_location';
  end if;
  if p_acc is null then return 'imprecise'; end if;
  if p_acc <= 0 then return 'artificial'; end if;
  if p_acc > v_accmax then return 'imprecise'; end if;
  if p_acc < 10 and abs(p_lat - r_lat) < 0.0000001 and abs(p_lng - r_lng) < 0.0000001 then return 'artificial'; end if;
  v_r := greatest(least(coalesce(r_m, v_cap), v_cap), 50);
  if public.qa_dist(r_lat, r_lng, p_lat, p_lng) - least(p_acc, 100) > v_r then return 'outside'; end if;
  return null;
end $function$;

commit;
notify pgrst, 'reload schema';
