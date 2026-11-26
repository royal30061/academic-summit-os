-- Academic Summit - cohort level catalog: verified students' registrations
-- aggregate per (institution, department, level). Electives remain each
-- student's own picks; the catalog only fills gaps. Tree = later phase.
begin;
create table if not exists public.level_courses(
  uni text not null, program text not null, level int not null, code text not null,
  title text, units text, votes int not null default 1,
  primary key (uni, program, level, code)
);
alter table public.level_courses enable row level security;

create or replace function public.sync_level_courses(p_courses jsonb)
returns int language plpgsql security definer set search_path to 'public' as $f$
declare c jsonb; c_code text; c_lvl int; n int := 0;
        v_uni text; v_prog text; v_ver boolean;
begin
  if auth.uid() is null then return 0; end if;
  select uni, program, verified into v_uni, v_prog, v_ver from public.profiles where id = auth.uid();
  if coalesce(v_ver,false) = false then return 0; end if;   -- only verified students contribute
  for c in select * from jsonb_array_elements(coalesce(p_courses,'[]'::jsonb)) loop
    c_code := upper(btrim(coalesce(c->>'code','')));
    if c_code = '' then continue; end if;
    c_lvl := floor((regexp_replace(c_code,'\D','','g'))::int / 100) * 100;
    insert into public.level_courses(uni,program,level,code,title,units)
    values (coalesce(v_uni,''), coalesce(v_prog,''), c_lvl, c_code, c->>'title', c->>'units')
    on conflict (uni,program,level,code)
    do update set votes = public.level_courses.votes + 1,
                  title = coalesce(public.level_courses.title, excluded.title),
                  units = coalesce(public.level_courses.units, excluded.units);
    n := n + 1;
  end loop;
  return n;
end $f$;
revoke execute on function public.sync_level_courses(jsonb) from public, anon;
grant  execute on function public.sync_level_courses(jsonb) to authenticated;

create or replace function public.level_catalog(p_level int, p_min int default 5)
returns table(code text, title text, units text)
language sql stable security definer set search_path to 'public' as
$$ select l.code, l.title, l.units
     from public.level_courses l
     join public.profiles p on p.id = auth.uid()
    where l.uni = coalesce(p.uni,'') and l.program = coalesce(p.program,'')
      and l.level = p_level and l.votes >= p_min
    order by l.code $$;
revoke execute on function public.level_catalog(int,int) from public, anon;
grant  execute on function public.level_catalog(int,int) to authenticated;
commit;
notify pgrst, 'reload schema';
