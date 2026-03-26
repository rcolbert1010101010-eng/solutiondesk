create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues(id) on delete cascade,
  resolution_id uuid references public.resolutions(id) on delete cascade,
  bucket_name text not null default 'solutiondesk-attachments',
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  file_extension text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attachments_exactly_one_parent_chk
    check (((issue_id is not null)::int + (resolution_id is not null)::int) = 1)
);

create index if not exists attachments_issue_id_idx on public.attachments (issue_id);
create index if not exists attachments_resolution_id_idx on public.attachments (resolution_id);
create index if not exists attachments_created_at_idx on public.attachments (created_at desc);

drop trigger if exists trg_attachments_set_updated_at on public.attachments;
create trigger trg_attachments_set_updated_at
before update on public.attachments
for each row
execute function public.set_updated_at();

alter table public.attachments enable row level security;

drop policy if exists attachments_authenticated_select on public.attachments;
create policy attachments_authenticated_select on public.attachments
for select to authenticated
using (true);

drop policy if exists attachments_authenticated_insert on public.attachments;
create policy attachments_authenticated_insert on public.attachments
for insert to authenticated
with check (true);

drop policy if exists attachments_authenticated_update on public.attachments;
create policy attachments_authenticated_update on public.attachments
for update to authenticated
using (true)
with check (true);

drop policy if exists attachments_authenticated_delete on public.attachments;
create policy attachments_authenticated_delete on public.attachments
for delete to authenticated
using (true);

grant select, insert, update, delete on public.attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solutiondesk-attachments',
  'solutiondesk-attachments',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists solutiondesk_attachments_select on storage.objects;
create policy solutiondesk_attachments_select on storage.objects
for select to authenticated
using (bucket_id = 'solutiondesk-attachments');

drop policy if exists solutiondesk_attachments_insert on storage.objects;
create policy solutiondesk_attachments_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'solutiondesk-attachments');

drop policy if exists solutiondesk_attachments_update on storage.objects;
create policy solutiondesk_attachments_update on storage.objects
for update to authenticated
using (bucket_id = 'solutiondesk-attachments')
with check (bucket_id = 'solutiondesk-attachments');

drop policy if exists solutiondesk_attachments_delete on storage.objects;
create policy solutiondesk_attachments_delete on storage.objects
for delete to authenticated
using (bucket_id = 'solutiondesk-attachments');

notify pgrst, 'reload schema';
