-- Supabase Auth + profiles migration for IRM Platform
-- Run in Supabase SQL editor.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'display_name', null)
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(check_user_id, auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.prevent_last_admin_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.role = 'admin' and new.role <> 'admin' then
      if not exists (
        select 1 from public.profiles where role = 'admin' and id <> old.id
      ) then
        raise exception 'At least one admin is required';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'admin' and not exists (
      select 1 from public.profiles where role = 'admin' and id <> old.id
    ) then
      raise exception 'At least one admin is required';
    end if;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_profiles_prevent_last_admin_loss on public.profiles;
create trigger trg_profiles_prevent_last_admin_loss
before update or delete on public.profiles
for each row
execute function public.prevent_last_admin_loss();

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  admin_exists boolean;
begin
  if new.role is distinct from old.role then
    select exists(select 1 from public.profiles where role = 'admin') into admin_exists;

    if public.is_admin(caller) then
      null;
    elsif caller = old.id and old.role <> 'admin' and new.role = 'admin' and not admin_exists then
      null;
    else
      raise exception 'Only admins can change roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role_change on public.profiles;
create trigger trg_profiles_guard_role_change
before update on public.profiles
for each row
execute function public.guard_profile_role_change();

create or replace function public.claim_first_admin(target_email text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  admin_exists boolean;
begin
  if caller is null then
    raise exception 'Authentication required';
  end if;

  select p.email into caller_email
  from public.profiles p
  where p.id = caller;

  if caller_email is null then
    return false;
  end if;

  if target_email is not null and lower(target_email) <> lower(caller_email) then
    raise exception 'Email mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.claim_first_admin'));

  select exists(select 1 from public.profiles where role = 'admin') into admin_exists;
  if admin_exists then
    return false;
  end if;

  update public.profiles
  set role = 'admin',
      updated_at = now()
  where id = caller;

  return true;
end;
$$;

revoke all on function public.claim_first_admin(text) from public;
grant execute on function public.claim_first_admin(text) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role in ('admin', 'user'));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role in ('admin', 'user'));

drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (role in ('admin', 'user'));

grant select, insert, update on public.profiles to authenticated;

commit;
