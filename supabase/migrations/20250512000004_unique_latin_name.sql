-- Prevent duplicate species by canonical latin name (case-insensitive).

create unique index if not exists species_latin_name_unique
  on public.species (lower(trim(latin_name)))
  where latin_name is not null and trim(latin_name) <> '';
