-- Phylo: suggestion approval notifications
-- Required for the amber badge on Profile settings after an admin approves a suggestion.
--
-- Run this entire script once in the Supabase SQL editor.
-- After running, only NEW approvals (after this migration) will badge users by default.
-- To re-badge yourself for an existing approval while testing, run:
--   update public.species_suggestions set notified = false where id = '<suggestion-id>';
--   update public.alias_suggestions set notified = false where id = '<suggestion-id>';

alter table public.species_suggestions
  add column if not exists notified boolean not null default false;

alter table public.alias_suggestions
  add column if not exists notified boolean not null default false;

-- Existing approvals predate notifications; don't retroactively badge users.
update public.species_suggestions set notified = true where status = 'approved';
update public.alias_suggestions set notified = true where status = 'approved';

-- Users must be able to mark their own approved suggestions as read on /profile.
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

-- Verify columns exist (should return two rows):
-- select table_name, column_name
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('species_suggestions', 'alias_suggestions')
--   and column_name = 'notified';
