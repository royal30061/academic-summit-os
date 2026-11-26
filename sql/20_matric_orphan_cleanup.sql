-- Academic Summit - matric orphan cleanup.
-- appoint_rep resolves a matric through profiles; a deactivated/deleted
-- account's profiles row kept the matric and won the lookup, so the rep
-- appointment landed on the dead account instead of the active one.
-- Nulling matric on orphaned/deleted rows makes the active account the only
-- match. Run ONCE. Safe to re-run.
begin;
update public.profiles p set matric = null
 where p.matric is not null
   and ( not exists (select 1 from auth.users u where u.id = p.id)
      or exists (select 1 from auth.users u where u.id = p.id and u.deleted_at is not null) );
commit;
