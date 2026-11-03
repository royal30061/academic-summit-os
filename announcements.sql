-- Academic Summit: admin-controlled announcements and student notifications.
-- Run this whole file once in the Supabase SQL editor. It is safe to run again.
-- It adds two tables and a few functions. It does not touch profiles, results, attendance or any existing data.
-- Needs the existing function public.is_app_admin() (your Role-lock trigger already uses it).

-- 1. The announcements the administrator publishes -------------------------------------------------
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'custom' check (kind in ('results_released','result_detective','custom')),
  title         text not null check (char_length(title) between 3 and 80),
  body          text not null check (char_length(body) between 10 and 600),
  action_label  text check (action_label is null or char_length(action_label) between 2 and 40),
  action_target text check (action_target is null or action_target in ('results','upload','record','target','detective','home','study','attend','finance')),
  audience      text not null default 'all_students' check (audience in ('all_students','lecturers','everyone')),
  status        text not null default 'active' check (status in ('active','inactive','archived')),
  version       int  not null default 1,
  published_at  timestamptz not null default now(),
  created_by    uuid not null default auth.uid(),
  updated_at    timestamptz not null default now()
);

-- Results Released and Result Detective each have exactly one row, so they can never be duplicated.
create unique index if not exists announcements_one_row_per_fixed_kind on public.announcements (kind) where kind <> 'custom';

-- 2. One receipt per person per announcement version (this is what makes delivery happen once) ------
create table if not exists public.announcement_receipts (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  version         int  not null,
  uid             uuid not null default auth.uid(),
  delivered_at    timestamptz not null default now(),
  read_at         timestamptz,
  primary key (announcement_id, version, uid)
);

-- 3. Who can see what ----------------------------------------------------------------------------
alter table public.announcements         enable row level security;
alter table public.announcement_receipts enable row level security;

drop policy if exists ann_admin_all       on public.announcements;
drop policy if exists ann_read_delivered  on public.announcements;
drop policy if exists rcpt_select         on public.announcement_receipts;

-- the administrator can read and change everything
create policy ann_admin_all on public.announcements for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- a student can read only announcements that were delivered to them (so history survives disabling)
create policy ann_read_delivered on public.announcements for select to authenticated
  using (exists (select 1 from public.announcement_receipts r where r.announcement_id = announcements.id and r.uid = auth.uid()));

-- receipts are readable by their owner or the administrator; nobody writes them directly (the functions below do)
create policy rcpt_select on public.announcement_receipts for select to authenticated
  using (uid = auth.uid() or public.is_app_admin());

-- 4. Student functions -----------------------------------------------------------------------------
-- Delivers any active announcement for the caller's role exactly once, then returns their notification list.
create or replace function public.my_announcements()
returns table (id uuid, kind text, title text, body text, action_label text, action_target text,
               status text, version int, published_at timestamptz, delivered_at timestamptz, read_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r text;
begin
  if auth.uid() is null then return; end if;
  select p.role into r from public.profiles p where p.id = auth.uid();
  
  insert into public.announcement_receipts (announcement_id, version, uid)
  select a.id, a.version, auth.uid()
  from public.announcements a
  where a.status = 'active'
    and ( a.audience = 'everyone'
       or (a.audience = 'all_students' and r in ('student','admin'))
       or (a.audience = 'lecturers'    and r = 'lecturer') )
  on conflict do nothing;

  return query
  select a.id, a.kind, a.title, a.body, a.action_label, a.action_target, a.status, a.version, a.published_at, c.delivered_at, c.read_at
  from public.announcement_receipts c
  join public.announcements a on a.id = c.announcement_id
  where c.uid = auth.uid()
    and c.version = (select max(c2.version) from public.announcement_receipts c2 where c2.announcement_id = c.announcement_id and c2.uid = c.uid)
  order by a.published_at desc
  limit 100;
end; $$;

create or replace function public.mark_announcement_read(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.announcement_receipts r set read_at = coalesce(r.read_at, now())
  where r.announcement_id = p_id and r.uid = auth.uid()
    and r.version = (select a.version from public.announcements a where a.id = p_id);
$$;

create or replace function public.mark_all_announcements_read()
returns void language sql security definer set search_path = public as $$
  update public.announcement_receipts set read_at = now() where uid = auth.uid() and read_at is null;
$$;

-- 5. Administrator functions (every one checks is_app_admin first) -------------------------------------
-- Publish a new announcement, or republish an existing one. Republishing bumps the version, so everyone gets it again.
create or replace function public.publish_announcement(
  p_kind text, p_title text, p_body text, p_action_label text, p_action_target text, p_audience text, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; t text := btrim(coalesce(p_title,'')); b text := btrim(coalesce(p_body,''));
begin
  if not public.is_app_admin() then raise exception 'not allowed'; end if;
  if p_kind not in ('results_released','result_detective','custom') then raise exception 'Unknown announcement type'; end if;
  if char_length(t) not between 3 and 80 then raise exception 'The title must be 3 to 80 characters'; end if;
  if char_length(b) not between 10 and 600 then raise exception 'The message must be 10 to 600 characters'; end if;
  if p_audience not in ('all_students','lecturers','everyone') then raise exception 'Choose who should receive it'; end if;
  if p_action_target is not null and p_action_target not in ('results','upload','record','target','detective','home','study','attend','finance') then raise exception 'Unknown action'; end if;

  if p_kind <> 'custom' then
    select a.id into v_id from public.announcements a where a.kind = p_kind;
  elsif p_id is not null then
    v_id := p_id;
  elsif exists (select 1 from public.announcements a where a.kind = 'custom' and a.title = t and a.body = b and a.published_at > now() - interval '10 minutes') then
    raise exception 'This announcement was already sent a moment ago';
  end if;

  if v_id is null then
    insert into public.announcements (kind, title, body, action_label, action_target, audience)
    values (p_kind, t, b, nullif(btrim(p_action_label),''), p_action_target, p_audience) returning id into v_id;
  else
    update public.announcements set title = t, body = b, action_label = nullif(btrim(p_action_label),''), action_target = p_action_target,
      audience = p_audience, status = 'active', version = version + 1, published_at = now(), updated_at = now()
    where id = v_id;
  end if;

  return v_id;
end; $$;

-- Fix a typo or reword without sending it again (no new version, no new notification).
create or replace function public.update_announcement(
  p_id uuid, p_title text, p_body text, p_action_label text, p_action_target text, p_audience text)
returns void language plpgsql security definer set search_path = public as $$
declare t text := btrim(coalesce(p_title,'')); b text := btrim(coalesce(p_body,''));
begin
  if not public.is_app_admin() then raise exception 'not allowed'; end if;
  if char_length(t) not between 3 and 80 then raise exception 'The title must be 3 to 80 characters'; end if;
  if char_length(b) not between 10 and 600 then raise exception 'The message must be 10 to 600 characters'; end if;
  if p_audience not in ('all_students','lecturers','everyone') then raise exception 'Choose who should receive it'; end if;

  update public.announcements set title = t, body = b, action_label = nullif(btrim(p_action_label),''), action_target = p_action_target,
    audience = p_audience, updated_at = now() where id = p_id;
end; $$;

-- Disable (inactive) or archive. This never deletes anyone's receipts or the announcement itself.
create or replace function public.set_announcement_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('active','inactive','archived') then raise exception 'Unknown status'; end if;
  update public.announcements set status = p_status, updated_at = now() where id = p_id;
end; $$;

-- Delivered, read and audience size for the current version.
create or replace function public.announcement_stats(p_id uuid)
returns table (delivered bigint, reads bigint, audience_size bigint)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare a public.announcements%rowtype;
begin
  if not public.is_app_admin() then raise exception 'not allowed'; end if;
  select * into a from public.announcements where announcements.id = p_id;
  if not found then return; end if;
  return query select
    (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.version = a.version),
    (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.version = a.version and r.read_at is not null),
    (select count(*) from public.profiles p where case a.audience when 'everyone' then true when 'lecturers' then p.role = 'lecturer' else p.role in ('student','admin') end);
end; $$;

-- 6. Permissions -----------------------------------------------------------------------------------
revoke all on function public.my_announcements()                                   from public, anon;
revoke all on function public.mark_announcement_read(uuid)                          from public, anon;
revoke all on function public.mark_all_announcements_read()                         from public, anon;
revoke all on function public.publish_announcement(text,text,text,text,text,text,uuid) from public, anon;
revoke all on function public.update_announcement(uuid,text,text,text,text,text)     from public, anon;
revoke all on function public.set_announcement_status(uuid,text)                    from public, anon;
revoke all on function public.announcement_stats(uuid)                              from public, anon;

grant execute on function public.my_announcements()                                   to authenticated;
grant execute on function public.mark_announcement_read(uuid)                          to authenticated;
grant execute on function public.mark_all_announcements_read()                         to authenticated;
grant execute on function public.publish_announcement(text,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.update_announcement(uuid,text,text,text,text,text)     to authenticated;
grant execute on function public.set_announcement_status(uuid,text)                    to authenticated;
grant execute on function public.announcement_stats(uuid)                              to authenticated;

-- 7. Check it worked (should return one row per line, no errors) ------------------------------------
select 'tables' as check, count(*)::text as result from information_schema.tables where table_name in ('announcements','announcement_receipts')
union all select 'functions', count(*)::text from pg_proc where proname in ('my_announcements','mark_announcement_read','mark_all_announcements_read','publish_announcement','update_announcement','set_announcement_status','announcement_stats')
union all select 'admin check exists', (exists (select 1 from pg_proc where proname = 'is_app_admin'))::text;
