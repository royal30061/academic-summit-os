-- =====================================================================
-- Academic Summit - privilege clean-up (OPTIONAL, defence in depth). Safe to re-run.
-- Row Level Security already blocks these actions; this also removes the underlying permission, so a future
-- mistaken policy cannot expose a table. Nothing here changes what the app does today.
-- Test one student, one lecturer and the admin panel afterwards. To undo a line, GRANT the privilege back.
-- =====================================================================
begin;

-- 1. nobody needs TRUNCATE / TRIGGER / REFERENCES through the API
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- 2. tables only ever written by database functions: no direct writes, and no anonymous access at all
revoke all on public.attempt_log, public.att_attempts, public.qa_tokens, public.class_notices, public.lecturer_courses, public.student_courses from anon, authenticated;
revoke insert, update, delete on public.attendance, public.sessions, public.qa_marks, public.qa_sessions from anon, authenticated;
revoke all on public.attendance, public.sessions, public.qa_marks, public.qa_sessions from anon;

-- 3. functions that only make sense for a signed-in user: anonymous visitors cannot call them
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
              and p.proname in ('add_manual','att_guard','att_is_lecturer','att_min_size','att_setting','class_notices_on','mark_attendance',
                                'my_kept_sessions','qa_mark','qa_open','reissue_session','sess_finish','start_session')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

commit;
