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

create table if not exists public.systems_affected (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists systems_affected_name_lower_idx on public.systems_affected (lower(name));

drop trigger if exists trg_systems_affected_set_updated_at on public.systems_affected;
create trigger trg_systems_affected_set_updated_at
before update on public.systems_affected
for each row
execute function public.set_updated_at();

alter table public.systems_affected enable row level security;

drop policy if exists systems_affected_authenticated_select on public.systems_affected;
create policy systems_affected_authenticated_select on public.systems_affected
for select to authenticated
using (true);

drop policy if exists systems_affected_authenticated_insert on public.systems_affected;
create policy systems_affected_authenticated_insert on public.systems_affected
for insert to authenticated
with check (true);

drop policy if exists systems_affected_authenticated_update on public.systems_affected;
create policy systems_affected_authenticated_update on public.systems_affected
for update to authenticated
using (true)
with check (true);

drop policy if exists systems_affected_authenticated_delete on public.systems_affected;
create policy systems_affected_authenticated_delete on public.systems_affected
for delete to authenticated
using (true);

grant select, insert, update, delete on public.systems_affected to authenticated;

notify pgrst, 'reload schema';
