-- Academic Summit - matric guard: one account per matric + verified tag.
-- Run ONCE in Supabase SQL editor. Safe to re-run.
-- FIRST check for existing duplicates; if any, clean them before the index:
--   select lower(btrim(matric)) m, count(*) from public.profiles
--    where matric is not null and btrim(matric)<>'' group by 1 having count(*)>1;
begin;
alter table public.profiles add column if not exists verified boolean not null default false;
create unique index if not exists profiles_matric_uniq
  on public.profiles (lower(btrim(matric)))
  where matric is not null and btrim(matric) <> '';
create or replace function public.set_my_matric(p_matric text)
returns text language plpgsql security definer set search_path to 'public' as $f$
declare v text;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  v := upper(btrim(coalesce(p_matric,'')));
  if v = '' then return 'empty'; end if;
  if exists(select 1 from public.profiles where id <> auth.uid() and lower(btrim(matric)) = lower(v)) then
    return 'taken';
  end if;
  update public.profiles set matric = v where id = auth.uid();
  return 'ok';
end $f$;
revoke execute on function public.set_my_matric(text) from public, anon;
grant  execute on function public.set_my_matric(text) to authenticated;
create or replace function public.mark_matric_verified(p_portal_matric text)
returns boolean language plpgsql security definer set search_path to 'public' as $f$
declare v text; m text;
begin
  if auth.uid() is null then return false; end if;
  select matric into m from public.profiles where id = auth.uid();
  v := upper(btrim(coalesce(p_portal_matric,'')));
  if m is null or v = '' or v <> upper(btrim(m)) then return false; end if;
  update public.profiles set verified = true where id = auth.uid();
  return true;
end $f$;
revoke execute on function public.mark_matric_verified(text) from public, anon;
grant  execute on function public.mark_matric_verified(text) to authenticated;
commit;
notify pgrst, 'reload schema';
