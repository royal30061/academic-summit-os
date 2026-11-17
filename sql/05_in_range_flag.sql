-- =====================================================================
-- Academic Summit - "inside range" flag on every mark
-- Run ONCE in the Supabase SQL editor (any time after 01). Safe to re-run.
-- mark_attendance and qa_mark are NOT touched. A trigger stamps the flag on the student's own mark:
--   range check ON  -> true (the marking functions only get this far when the student was inside)
--   range check OFF -> true/false from the distance receipt, if one was captured
--   no lecturer position / lecturer-added marks / old marks -> left empty (unknown)
-- No GPS reading is stored when the range check is ON; only the yes/no result is.
-- =====================================================================
begin;

alter table public.attendance add column if not exists in_range boolean;

create or replace function public.att_stamp_in_range()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare r_lat double precision; r_rad integer;
begin
  if auth.uid() is null or auth.uid() is distinct from new.student_id then return new; end if;
  select ref_lat, radius_m into r_lat, r_rad from public.sessions where id = new.session_id;
  if r_lat is null then return new; end if;
  if public.att_setting('geofence_enforced') then new.in_range := true;
  elsif new.distance_m is not null then new.in_range := new.distance_m <= coalesce(r_rad, 100);
  end if;
  return new;
end $function$;

drop trigger if exists att_stamp_in_range on public.attendance;
create trigger att_stamp_in_range before insert on public.attendance
  for each row execute function public.att_stamp_in_range();

-- QR table: isolated so a naming difference there cannot undo the code-mode part above
do $qr$
begin
  alter table public.qa_marks add column if not exists in_range boolean;
  create or replace function public.qa_stamp_in_range()
  returns trigger language plpgsql security definer set search_path to 'public' as $f$
  declare r_lat double precision; r_rad integer;
  begin
    if auth.uid() is null or auth.uid() is distinct from new.student then return new; end if;
    select ref_lat, radius_m into r_lat, r_rad from public.qa_sessions where id = new.session_id;
    if r_lat is null then return new; end if;
    if public.att_setting('geofence_enforced') then new.in_range := true;
    elsif new.distance_m is not null then new.in_range := new.distance_m <= coalesce(r_rad, 100);
    end if;
    return new;
  end $f$;
  drop trigger if exists qa_stamp_in_range on public.qa_marks;
  create trigger qa_stamp_in_range before insert on public.qa_marks
    for each row execute function public.qa_stamp_in_range();
exception when others then
  raise notice 'QR in_range skipped: %', sqlerrm;
end $qr$;

commit;
notify pgrst, 'reload schema';
