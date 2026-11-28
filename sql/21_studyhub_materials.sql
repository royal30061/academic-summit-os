-- Academic Summit Study Hub v5: private PDF library.
-- Run once in Supabase SQL Editor before expecting cross-device PDF sync.
begin;

create table if not exists public.study_materials (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  course_key text not null,
  file_name text not null,
  storage_path text not null unique,
  file_size bigint not null default 0,
  page_count integer,
  word_count integer,
  updated_at timestamptz not null default now()
);

alter table public.study_materials enable row level security;
drop policy if exists "study_materials_select_own" on public.study_materials;
drop policy if exists "study_materials_insert_own" on public.study_materials;
drop policy if exists "study_materials_update_own" on public.study_materials;
drop policy if exists "study_materials_delete_own" on public.study_materials;

create policy "study_materials_select_own" on public.study_materials
  for select to authenticated using (owner_id = auth.uid());
create policy "study_materials_insert_own" on public.study_materials
  for insert to authenticated with check (owner_id = auth.uid());
create policy "study_materials_update_own" on public.study_materials
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "study_materials_delete_own" on public.study_materials
  for delete to authenticated using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-materials', 'study-materials', false, 26214400, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

drop policy if exists "study_materials_storage_select_own" on storage.objects;
drop policy if exists "study_materials_storage_insert_own" on storage.objects;
drop policy if exists "study_materials_storage_update_own" on storage.objects;
drop policy if exists "study_materials_storage_delete_own" on storage.objects;

create policy "study_materials_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "study_materials_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "study_materials_storage_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "study_materials_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
notify pgrst, 'reload schema';
