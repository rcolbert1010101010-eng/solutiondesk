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

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tags_name_lower_key on public.tags (lower(name));

drop trigger if exists trg_tags_set_updated_at on public.tags;
create trigger trg_tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  description_html text,
  description_text text,
  system_affected text not null default '',
  status text,
  severity text,
  confidence text,
  assignee text,
  tags uuid[] not null default '{}'::uuid[],
  resolution jsonb,
  resolutions jsonb not null default '[]'::jsonb,
  is_master_incident boolean not null default false,
  master_incident_id uuid references public.issues(id) on delete set null,
  relationship_type text,
  linked_at timestamptz,
  linked_incident_count integer not null default 0,
  last_linked_at timestamptz,
  reference_count integer not null default 0,
  confidence_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_issues_set_updated_at on public.issues;
create trigger trg_issues_set_updated_at
before update on public.issues
for each row
execute function public.set_updated_at();

alter table public.tags enable row level security;
alter table public.issues enable row level security;

drop policy if exists tags_authenticated_select on public.tags;
create policy tags_authenticated_select
on public.tags
for select
to authenticated
using (true);

drop policy if exists tags_authenticated_insert on public.tags;
create policy tags_authenticated_insert
on public.tags
for insert
to authenticated
with check (true);

drop policy if exists tags_authenticated_update on public.tags;
create policy tags_authenticated_update
on public.tags
for update
to authenticated
using (true)
with check (true);

drop policy if exists tags_authenticated_delete on public.tags;
create policy tags_authenticated_delete
on public.tags
for delete
to authenticated
using (true);

drop policy if exists issues_authenticated_select on public.issues;
create policy issues_authenticated_select
on public.issues
for select
to authenticated
using (true);

drop policy if exists issues_authenticated_insert on public.issues;
create policy issues_authenticated_insert
on public.issues
for insert
to authenticated
with check (true);

drop policy if exists issues_authenticated_update on public.issues;
create policy issues_authenticated_update
on public.issues
for update
to authenticated
using (true)
with check (true);

drop policy if exists issues_authenticated_delete on public.issues;
create policy issues_authenticated_delete
on public.issues
for delete
to authenticated
using (true);

grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
