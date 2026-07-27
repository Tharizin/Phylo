-- Phylo: suggestion approval notifications
-- Run this in the Supabase SQL editor before deploying the app update.

alter table public.species_suggestions
  add column if not exists notified boolean not null default false;

alter table public.alias_suggestions
  add column if not exists notified boolean not null default false;

-- Existing approvals predate notifications; don't retroactively badge users.
update public.species_suggestions set notified = true where status = 'approved';
update public.alias_suggestions set notified = true where status = 'approved';

-- Allow users to mark their own suggestions as notified when viewing profile.
drop policy if exists "species_suggestions_update_own" on public.species_suggestions;
create policy "species_suggestions_update_own"
  on public.species_suggestions for update to authenticated
  using (submitted_by = auth.uid())
  with check (submitted_by = auth.uid());

drop policy if exists "alias_suggestions_update_own" on public.alias_suggestions;
create policy "alias_suggestions_update_own"
  on public.alias_suggestions for update to authenticated
  using (submitted_by = auth.uid())
  with check (submitted_by = auth.uid());
