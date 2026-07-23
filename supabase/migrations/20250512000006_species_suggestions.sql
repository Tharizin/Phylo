-- Species and alias suggestion queues; restrict direct species inserts to admins.

create table if not exists public.species_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  common_name text not null,
  latin_name text,
  category text not null check (category in ('plant', 'animal', 'fungus', 'other')),
  alternative_names text[] not null default '{}',
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.alias_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  species_id uuid not null references public.species (id) on delete cascade,
  suggested_alias text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists species_suggestions_status_created
  on public.species_suggestions (status, created_at desc);

create index if not exists species_suggestions_submitted_by
  on public.species_suggestions (submitted_by);

create index if not exists alias_suggestions_status_created
  on public.alias_suggestions (status, created_at desc);

create index if not exists alias_suggestions_submitted_by
  on public.alias_suggestions (submitted_by);

create index if not exists alias_suggestions_species_id
  on public.alias_suggestions (species_id);

alter table public.species_suggestions enable row level security;
alter table public.alias_suggestions enable row level security;

create policy "species_suggestions_insert_own"
  on public.species_suggestions for insert to authenticated
  with check (submitted_by = auth.uid());

create policy "species_suggestions_select_own"
  on public.species_suggestions for select to authenticated
  using (submitted_by = auth.uid());

create policy "alias_suggestions_insert_own"
  on public.alias_suggestions for insert to authenticated
  with check (submitted_by = auth.uid());

create policy "alias_suggestions_select_own"
  on public.alias_suggestions for select to authenticated
  using (submitted_by = auth.uid());

create policy "species_suggestions_admin_all"
  on public.species_suggestions for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "alias_suggestions_admin_all"
  on public.alias_suggestions for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "species_insert_authenticated" on public.species;
