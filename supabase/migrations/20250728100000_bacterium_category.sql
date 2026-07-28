-- Add bacterium as a species category option
alter table public.species drop constraint if exists species_category_check;
alter table public.species add constraint species_category_check
  check (category in ('plant', 'animal', 'fungus', 'bacterium', 'other'));

alter table public.species_suggestions drop constraint if exists species_suggestions_category_check;
alter table public.species_suggestions add constraint species_suggestions_category_check
  check (category in ('plant', 'animal', 'fungus', 'bacterium', 'other'));
