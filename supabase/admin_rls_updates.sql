-- Admin management + suggestion queue RLS updates for Phylo
-- Run this in the Supabase SQL editor.

-- 1) Ensure the primary admin account always has admin access
update public.profiles
set is_admin = true
where lower(username) = 'tharizin';

-- 2) Prevent non-admins from changing is_admin on any profile (including their own)
create or replace function public.protect_is_admin_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    ) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin on public.profiles;
create trigger protect_is_admin
before update on public.profiles
for each row
execute function public.protect_is_admin_column();

-- 3) Allow admins to update other users' profiles (needed for grant/revoke admin in app)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    )
  )
  with check (true);

-- 4) Suggestion queue policies (safe to re-run)
-- Users: insert/read own rows. Admins: full access.

alter table public.species_suggestions enable row level security;
alter table public.alias_suggestions enable row level security;

drop policy if exists "species_suggestions_insert_own" on public.species_suggestions;
create policy "species_suggestions_insert_own"
  on public.species_suggestions for insert to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "species_suggestions_select_own" on public.species_suggestions;
create policy "species_suggestions_select_own"
  on public.species_suggestions for select to authenticated
  using (submitted_by = auth.uid());

drop policy if exists "species_suggestions_admin_all" on public.species_suggestions;
create policy "species_suggestions_admin_all"
  on public.species_suggestions for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    )
  );

drop policy if exists "alias_suggestions_insert_own" on public.alias_suggestions;
create policy "alias_suggestions_insert_own"
  on public.alias_suggestions for insert to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "alias_suggestions_select_own" on public.alias_suggestions;
create policy "alias_suggestions_select_own"
  on public.alias_suggestions for select to authenticated
  using (submitted_by = auth.uid());

drop policy if exists "alias_suggestions_admin_all" on public.alias_suggestions;
create policy "alias_suggestions_admin_all"
  on public.alias_suggestions for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or lower(p.username) = 'tharizin')
    )
  );

-- 5) Optional: admins can read all profiles for username lookup in Manage Admins
drop policy if exists "profiles_select_admin" on public.profiles;
-- profiles_select_all already allows everyone to read profiles in init.sql.
-- No extra select policy required unless you removed profiles_select_all.
