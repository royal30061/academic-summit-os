-- Academic Summit - READ-ONLY security audit. Changes nothing. Run in the Supabase SQL editor and send me the result
-- (a screenshot or a copy of the rows). It shows: which tables have RLS, every policy, what anon/authenticated may do
-- directly to each table, which security-definer functions anonymous visitors can call, and how is_app_admin() decides.
select 'table_rls' as section, c.relname::text as name, (case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end)::text as detail
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
union all
select 'policy', (tablename || ' / ' || policyname)::text, (cmd || ' to ' || array_to_string(roles, ',') || ' using ' || coalesce(qual, '-'))::text
  from pg_policies where schemaname = 'public'
union all
select 'grant', table_name::text, (grantee || ': ' || string_agg(privilege_type, ',' order by privilege_type))::text
  from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated') group by table_name, grantee
union all
select 'func_callable_by_anon', p.proname::text, 'security definer'::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
union all
select 'is_app_admin', 'definition', pg_get_functiondef('public.is_app_admin()'::regprocedure)::text
order by 1, 2;
