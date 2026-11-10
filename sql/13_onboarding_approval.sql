-- =====================================================================
-- Academic Summit - lecturer onboarding with owner approval ("2 of 2")
-- Run ONCE in the Supabase SQL editor AFTER 11_admin_team.sql. Safe to re-run.
--   * The OWNER issues lecturer PINs instantly, as before. No approval, no scrutiny.
--   * A CO-FOUNDER's request waits until the owner approves it, then the PIN appears for the co-founder.
--   * The owner can switch the approval rule off (co-founders then get PINs instantly, e.g. for pitches) and on again.
--   * Only the owner can create or read raw lecturer PINs directly; every other admin goes through the request function.
-- =====================================================================
begin;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path to 'public' as
$$ select lower(coalesce(auth.jwt()->>'email', '')) = 'royal30061@gmail.com' $$;
revoke execute on function public.is_owner() from public, anon;
grant  execute on function public.is_owner() to authenticated;

insert into public.app_settings (key, value) values ('onboard_needs_ok', true) on conflict (key) do nothing;

create table if not exists public.pin_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  requester_email text, note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  pin text, decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pin_requests enable row level security;      -- no policies: functions only

-- internal: create one real PIN (retries on the rare duplicate). Nobody can call it directly.
create or replace function public.mint_pin()
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v text; i integer := 0;
begin
  loop
    v := 'PIN-' || (100000 + floor(random() * 900000))::integer::text;
    begin
      insert into public.lecturer_pins (pin) values (v);
      return v;
    exception when unique_violation then
      i := i + 1; if i >= 5 then raise; end if;
    end;
  end loop;
end $function$;
revoke all on function public.mint_pin() from public, anon, authenticated;

create or replace function public.onboard_rule()
returns boolean language sql stable security definer set search_path to 'public' as
$$ select coalesce((select value from public.app_settings where key = 'onboard_needs_ok'), true) $$;
revoke execute on function public.onboard_rule() from public, anon;
grant  execute on function public.onboard_rule() to authenticated;

create or replace function public.admin_set_onboard_rule(p_on boolean)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_owner() then raise exception 'Only the owner can change this'; end if;
  insert into public.app_settings (key, value) values ('onboard_needs_ok', coalesce(p_on, true))
    on conflict (key) do update set value = coalesce(p_on, true);
  return public.onboard_rule();
end $function$;
revoke execute on function public.admin_set_onboard_rule(boolean) from public, anon;
grant  execute on function public.admin_set_onboard_rule(boolean) to authenticated;

-- any admin asks for a PIN. Owner (or rule OFF): issued at once. Co-founder with rule ON: waits for the owner.
create or replace function public.request_lecturer_pin(p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_pin text; v_id uuid; v_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if not public.is_app_admin() then raise exception 'Admins only'; end if;
  if public.is_owner() or not public.onboard_rule() then
    v_pin := public.mint_pin();
    insert into public.pin_requests (requested_by, requester_email, note, status, pin, decided_by, decided_at)
      values (auth.uid(), v_email, left(p_note, 80), 'approved', v_pin, auth.uid(), now());
    return jsonb_build_object('status', 'approved', 'pin', v_pin);
  end if;
  if (select count(*) from public.pin_requests where requested_by = auth.uid() and status = 'pending') >= 5 then
    raise exception 'You already have 5 requests waiting for the owner';
  end if;
  insert into public.pin_requests (requested_by, requester_email, note) values (auth.uid(), v_email, left(p_note, 80)) returning id into v_id;
  return jsonb_build_object('status', 'pending', 'id', v_id);
end $function$;
revoke execute on function public.request_lecturer_pin(text) from public, anon;
grant  execute on function public.request_lecturer_pin(text) to authenticated;

-- owner approves or rejects
create or replace function public.decide_pin_request(p_id uuid, p_ok boolean)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_pin text;
begin
  if not public.is_owner() then raise exception 'Only the owner can approve'; end if;
  if not exists (select 1 from public.pin_requests where id = p_id and status = 'pending') then raise exception 'That request is no longer waiting'; end if;
  if p_ok then
    v_pin := public.mint_pin();
    update public.pin_requests set status = 'approved', pin = v_pin, decided_by = auth.uid(), decided_at = now() where id = p_id;
    return 'approved';
  end if;
  update public.pin_requests set status = 'rejected', decided_by = auth.uid(), decided_at = now() where id = p_id;
  return 'rejected';
end $function$;
revoke execute on function public.decide_pin_request(uuid, boolean) from public, anon;
grant  execute on function public.decide_pin_request(uuid, boolean) to authenticated;

-- owner sees every request; a co-founder sees only their own (and the PIN only once approved)
create or replace function public.my_pin_requests()
returns table(id uuid, requester text, note text, status text, pin text, created_at timestamptz, mine boolean)
language sql stable security definer set search_path to 'public' as $function$
  select r.id, r.requester_email, r.note, r.status,
         case when r.status = 'approved' and (r.requested_by = auth.uid() or public.is_owner()) then r.pin end,
         r.created_at, r.requested_by = auth.uid()
    from public.pin_requests r
   where public.is_app_admin() and (public.is_owner() or r.requested_by = auth.uid())
   order by r.created_at desc limit 30
$function$;
revoke execute on function public.my_pin_requests() from public, anon;
grant  execute on function public.my_pin_requests() to authenticated;

-- raw PINs: owner only (a co-founder could otherwise read or mint PINs and skip the approval)
drop policy if exists pins_admin_insert on public.lecturer_pins;
create policy pins_admin_insert on public.lecturer_pins for insert to authenticated with check (public.is_owner());
drop policy if exists pins_admin_read on public.lecturer_pins;
create policy pins_admin_read on public.lecturer_pins for select to authenticated using (public.is_owner());

commit;
notify pgrst, 'reload schema';
