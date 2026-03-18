-- Optional SQL checks/tweaks for admin-users edge function support.
-- Run in Supabase SQL editor only if your schema differs.

-- Ensure profiles has FK cascade to auth.users for cleanup on auth deletion.
alter table if exists public.profiles
  drop constraint if exists profiles_id_fkey;

alter table if exists public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- Keep role lookup efficient for admin checks.
create index if not exists idx_profiles_role on public.profiles(role);
