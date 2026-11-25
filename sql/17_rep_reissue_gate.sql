-- Academic Summit - rep re-issue gate: ONE rep re-issue per session, and it
-- only rotates the code after the lecturer approves. Lecturer's own re-issue
-- is untouched. Run ONCE. Safe to re-run.
begin;
create table if not exists public.rep_reissue_requests(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  rep_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid, decided_at timestamptz
);
alter table public.rep_reissue_requests enable row level security;

create or replace function public.rep_request_reissue(p_session_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $f$
declare v_course text; v_n int;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  select course into v_course from public.sessions where id = p_session_id;
  if v_course is null then raise exception 'No such class'; end if;
  if not exists(select 1 from public.course_reps
                 where rep_id = auth.uid() and course = v_course and revoked_at is null) then
    raise exception 'You are not the class rep for this course';
  end if;
  select count(*) into v_n from public.rep_reissue_requests
   where session_id = p_session_id and rep_id = auth.uid() and status in ('pending','approved');
  if v_n >= 1 then
    raise exception 'You have used your one re-issue for this class. Your lecturer can re-issue directly.';
  end if;
  if exists(select 1 from public.rep_reissue_requests where session_id = p_session_id and status = 'pending') then
    return 'pending';
  end if;
  insert into public.rep_reissue_requests(session_id, rep_id) values (p_session_id, auth.uid());
  return 'pending';
end $f$;
revoke execute on function public.rep_request_reissue(uuid) from public, anon;
grant  execute on function public.rep_request_reissue(uuid) to authenticated;

create or replace function public.rep_reissue_status(p_session_id uuid)
returns text language sql stable security definer set search_path to 'public' as
$$ select coalesce((select status from public.rep_reissue_requests
                    where session_id = p_session_id and rep_id = auth.uid()
                    order by created_at desc limit 1), 'none') $$;
revoke execute on function public.rep_reissue_status(uuid) from public, anon;
grant  execute on function public.rep_reissue_status(uuid) to authenticated;

create or replace function public.lecturer_pending_reissues()
returns table(id uuid, course text, rep_name text, requested_at timestamptz)
language sql stable security definer set search_path to 'public' as
$$ select q.id, s.course, coalesce(p.name, ''), q.created_at
     from public.rep_reissue_requests q
     join public.sessions s on s.id = q.session_id
     left join public.profiles p on p.id = q.rep_id
    where q.status = 'pending' and s.lecturer_id = auth.uid()
    order by q.created_at desc limit 20 $$;
revoke execute on function public.lecturer_pending_reissues() from public, anon;
grant  execute on function public.lecturer_pending_reissues() to authenticated;

create or replace function public.decide_reissue(p_id uuid, p_ok boolean)
returns text language plpgsql security definer set search_path to 'public' as $f$
declare v_sid uuid; v_dur interval; v_code text; i int := 0;
begin
  select session_id into v_sid from public.rep_reissue_requests where id = p_id and status = 'pending';
  if v_sid is null then raise exception 'That request is no longer waiting'; end if;
  if not exists(select 1 from public.sessions where id = v_sid and lecturer_id = auth.uid()) then
    raise exception 'Not your class';
  end if;
  if not p_ok then
    update public.rep_reissue_requests set status='rejected', decided_by=auth.uid(), decided_at=now() where id=p_id;
    return 'rejected';
  end if;
  select greatest(coalesce(expires_at - created_at, interval '5 minutes'), interval '1 minute')
    into v_dur from public.sessions where id = v_sid;
  loop
    v_code := lpad(floor(random()*100000)::int::text, 5, '0');
    if not exists(select 1 from public.sessions where code = v_code and expires_at > now()) then exit; end if;
    i := i + 1; if i >= 5 then raise exception 'Could not mint a fresh code'; end if;
  end loop;
  update public.sessions set code = v_code, expires_at = now() + v_dur where id = v_sid;
  update public.rep_reissue_requests set status='approved', decided_by=auth.uid(), decided_at=now() where id = p_id;
  return v_code;
end $f$;
revoke execute on function public.decide_reissue(uuid, boolean) from public, anon;
grant  execute on function public.decide_reissue(uuid, boolean) to authenticated;

-- close the old unlimited path, whatever its exact signature is
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'rep_reissue' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
commit;
notify pgrst, 'reload schema';
