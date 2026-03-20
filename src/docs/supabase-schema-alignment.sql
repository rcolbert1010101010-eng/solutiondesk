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
  name text not null unique,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tags_name_lower_idx on public.tags (lower(name));

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description_html text,
  description_text text,
  status text,
  severity text,
  confidence text,
  tags uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.issues add column if not exists system_affected text;
alter table public.issues add column if not exists assignee text;
alter table public.issues add column if not exists confidence_score numeric;
alter table public.issues add column if not exists is_master_incident boolean not null default false;
alter table public.issues add column if not exists master_incident_id uuid;
alter table public.issues add column if not exists relationship_type text;
alter table public.issues add column if not exists linked_at timestamptz;
alter table public.issues add column if not exists last_linked_at timestamptz;
alter table public.issues add column if not exists linked_incident_count integer not null default 0;
alter table public.issues add column if not exists reference_count integer not null default 0;
alter table public.issues add column if not exists legacy_id text;

alter table public.issues
  alter column tags set default '{}'::uuid[];

create table if not exists public.resolutions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid null references public.issues(id) on delete cascade,
  title text not null,
  steps jsonb not null default '[]'::jsonb,
  notes text null,
  tags uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resolutions
  alter column tags set default '{}'::uuid[];

create index if not exists issues_master_incident_id_idx on public.issues (master_incident_id);
create index if not exists issues_updated_at_idx on public.issues (updated_at desc);
create index if not exists resolutions_issue_id_idx on public.resolutions (issue_id);
create index if not exists resolutions_updated_at_idx on public.resolutions (updated_at desc);

drop trigger if exists trg_tags_set_updated_at on public.tags;
create trigger trg_tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

drop trigger if exists trg_issues_set_updated_at on public.issues;
create trigger trg_issues_set_updated_at
before update on public.issues
for each row
execute function public.set_updated_at();

drop trigger if exists trg_resolutions_set_updated_at on public.resolutions;
create trigger trg_resolutions_set_updated_at
before update on public.resolutions
for each row
execute function public.set_updated_at();

alter table public.tags enable row level security;
alter table public.issues enable row level security;
alter table public.resolutions enable row level security;

drop policy if exists tags_authenticated_select on public.tags;
create policy tags_authenticated_select on public.tags
for select to authenticated
using (true);

drop policy if exists tags_authenticated_insert on public.tags;
create policy tags_authenticated_insert on public.tags
for insert to authenticated
with check (true);

drop policy if exists tags_authenticated_update on public.tags;
create policy tags_authenticated_update on public.tags
for update to authenticated
using (true)
with check (true);

drop policy if exists tags_authenticated_delete on public.tags;
create policy tags_authenticated_delete on public.tags
for delete to authenticated
using (true);

drop policy if exists issues_authenticated_select on public.issues;
create policy issues_authenticated_select on public.issues
for select to authenticated
using (true);

drop policy if exists issues_authenticated_insert on public.issues;
create policy issues_authenticated_insert on public.issues
for insert to authenticated
with check (true);

drop policy if exists issues_authenticated_update on public.issues;
create policy issues_authenticated_update on public.issues
for update to authenticated
using (true)
with check (true);

drop policy if exists issues_authenticated_delete on public.issues;
create policy issues_authenticated_delete on public.issues
for delete to authenticated
using (true);

drop policy if exists resolutions_authenticated_select on public.resolutions;
create policy resolutions_authenticated_select on public.resolutions
for select to authenticated
using (true);

drop policy if exists resolutions_authenticated_insert on public.resolutions;
create policy resolutions_authenticated_insert on public.resolutions
for insert to authenticated
with check (true);

drop policy if exists resolutions_authenticated_update on public.resolutions;
create policy resolutions_authenticated_update on public.resolutions
for update to authenticated
using (true)
with check (true);

drop policy if exists resolutions_authenticated_delete on public.resolutions;
create policy resolutions_authenticated_delete on public.resolutions
for delete to authenticated
using (true);

grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert, update, delete on public.resolutions to authenticated;

notify pgrst, 'reload schema';
