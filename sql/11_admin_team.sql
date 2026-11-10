-- =====================================================================
-- Academic Summit - admin team (owner + co-founders), tied to ACCOUNT IDS, not email text
-- Run ONCE in the Supabase SQL editor. Safe to re-run. The owner keeps working exactly as before.
-- Why ids: sign-up email verification is off, so an email address alone proves nothing. A list of
-- account ids cannot be claimed by someone who merely registers a matching address.
-- Only the OWNER can add or remove admins; co-founders get the full Admin Panel but cannot change the team.
-- =====================================================================
begin;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text, added_by uuid, added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;     -- no policies: only the functions below can touch it

insert into public.app_admins (user_id, note)
  select id, 'owner' from auth.users where lower(email) = 'royal30061@gmail.com'
on conflict (user_id) do nothing;

-- admin = on the list, OR the owner's email (kept as a safety net so the owner can never be locked out)
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path to 'public' as
$$ select exists (select 1 from public.app_admins where user_id = auth.uid())
       or lower(coalesce(auth.jwt()->>'email', '')) = 'royal30061@gmail.com' $$;

create or replace function public.admin_team()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'me_owner', lower(coalesce(auth.jwt()->>'email', '')) = 'royal30061@gmail.com',
    'admins', coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'note', a.note,
                'owner', lower(u.email) = 'royal30061@gmail.com') order by a.added_at)
                from public.app_admins a join auth.users u on u.id = a.user_id), '[]'::jsonb));
end $function$;

create or replace function public.admin_add_admin(p_email text, p_note text default null)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid;
begin
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'royal30061@gmail.com' then raise exception 'Only the owner can manage admins'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'No account with that email. Create the account first.'; end if;
  insert into public.app_admins (user_id, note, added_by) values (v_id, left(p_note, 60), auth.uid()) on conflict (user_id) do nothing;
  return true;
end $function$;

create or replace function public.admin_remove_admin(p_email text)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
begin
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'royal30061@gmail.com' then raise exception 'Only the owner can manage admins'; end if;
  if lower(trim(p_email)) = 'royal30061@gmail.com' then raise exception 'The owner cannot be removed'; end if;
  delete from public.app_admins where user_id = (select id from auth.users where lower(email) = lower(trim(p_email)));
  return true;
end $function$;

revoke execute on function public.admin_team(), public.admin_add_admin(text, text), public.admin_remove_admin(text) from public, anon;
grant  execute on function public.admin_team(), public.admin_add_admin(text, text), public.admin_remove_admin(text) to authenticated;

-- the two admin-only tables that checked the owner's email directly now ask is_app_admin()
drop policy if exists pins_admin_insert on public.lecturer_pins;
create policy pins_admin_insert on public.lecturer_pins for insert to authenticated with check (public.is_app_admin());
drop policy if exists pins_admin_read on public.lecturer_pins;
create policy pins_admin_read on public.lecturer_pins for select to authenticated using (public.is_app_admin());
drop policy if exists flags_admin_update on public.app_flags;
create policy flags_admin_update on public.app_flags for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists flags_admin_write on public.app_flags;
create policy flags_admin_write on public.app_flags for insert to authenticated with check (public.is_app_admin());

commit;
notify pgrst, 'reload schema';
