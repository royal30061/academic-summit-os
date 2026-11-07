-- =====================================================================
-- Academic Summit - minimum class size (ghost-session fix)
-- Run ONCE in the Supabase SQL editor AFTER 01_attendance_protections.sql. Safe to re-run.
-- Nothing is deleted by running this file. Sessions below the minimum are only HIDDEN
-- from the lecturer's records until an admin presses "Clean up" in the Admin Panel.
-- =====================================================================
begin;

alter table public.app_settings add column if not exists num_value integer;
insert into public.app_settings (key, value, num_value) values ('min_session_size', false, 5)
on conflict (key) do update set num_value = coalesce(public.app_settings.num_value, 5);

create or replace function public.att_min_size()
returns integer language sql stable security definer set search_path to 'public' as
$$ select coalesce((select num_value from public.app_settings where key = 'min_session_size'), 0) $$;
grant execute on function public.att_min_size() to authenticated;

-- admin sets the minimum (0 = keep every session)
create or replace function public.admin_set_min_session(p_n integer)
returns integer language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  update public.app_settings set num_value = least(greatest(coalesce(p_n, 0), 0), 200),
         updated_at = now(), updated_by = auth.uid() where key = 'min_session_size';
  return public.att_min_size();
end $function$;
revoke execute on function public.admin_set_min_session(integer) from public, anon;
grant  execute on function public.admin_set_min_session(integer) to authenticated;

-- lecturer's own sessions with head-count; only those that reached the minimum
create or replace function public.my_kept_sessions(p_limit integer default 20)
returns table(id uuid, course text, topic text, code text, created_at timestamptz, present bigint)
language sql stable security definer set search_path to 'public' as $function$
  select s.id, s.course, s.topic, s.code, s.created_at,
         (select count(*) from public.attendance a where a.session_id = s.id) as present
    from public.sessions s
   where s.lecturer_id = auth.uid()
     and (select count(*) from public.attendance a where a.session_id = s.id) >= greatest(public.att_min_size(), 1)
   order by s.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 200)
$function$;
grant execute on function public.my_kept_sessions(integer) to authenticated;

-- admin clean-up. p_dry_run = true only counts. Never touches a session that is still open.
create or replace function public.admin_purge_thin_sessions(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_min integer := greatest(public.att_min_size(), 1); v_ids uuid[]; v_qids uuid[];
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  select coalesce(array_agg(s.id), '{}') into v_ids from public.sessions s
   where s.expires_at < now() - interval '10 minutes'
     and (select count(*) from public.attendance a where a.session_id = s.id) < v_min;
  select coalesce(array_agg(q.id), '{}') into v_qids from public.qa_sessions q
   where q.closed_at is not null
     and (select count(*) from public.qa_marks m where m.session_id = q.id) < v_min;
  if not p_dry_run then
    delete from public.attendance where session_id = any(v_ids);
    delete from public.sessions   where id = any(v_ids);
    delete from public.qa_marks   where session_id = any(v_qids);
    delete from public.qa_sessions where id = any(v_qids);
  end if;
  return jsonb_build_object('min', v_min, 'code_sessions', cardinality(v_ids),
                            'qr_sessions', cardinality(v_qids), 'deleted', not p_dry_run);
end $function$;
revoke execute on function public.admin_purge_thin_sessions(boolean) from public, anon;
grant  execute on function public.admin_purge_thin_sessions(boolean) to authenticated;

commit;
notify pgrst, 'reload schema';
