-- Run after 01. Expected: exactly ONE row per function name below, and both settings false.
select proname, pg_get_function_identity_arguments(oid) as args
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('start_session','mark_attendance','qa_open','qa_mark','qa_token',
                   'admin_set_setting','att_setting','att_is_lecturer','att_geo_reason')
 order by proname;

select key, value from public.app_settings order by key;
