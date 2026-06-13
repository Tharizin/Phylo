-- Remove quantity tracking; Phylo logs species only.

alter table public.food_logs drop column if exists weight_g;

alter table public.species drop column if exists default_weight_g;

-- Return type changed; CREATE OR REPLACE alone leaves the old function referencing dropped columns.
drop function if exists public.search_species(text, int);

create or replace function public.search_species(search_query text, limit_n int default 24)
returns table (
  id uuid,
  common_name text,
  latin_name text,
  category text,
  added_by_user_id uuid,
  created_at timestamptz,
  log_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select nullif(trim(search_query), '') as t
  ),
  counts as (
    select species_id, count(*)::bigint as c
    from public.food_logs
    group by species_id
  )
  select
    s.id,
    s.common_name,
    s.latin_name,
    s.category,
    s.added_by_user_id,
    s.created_at,
    coalesce(c.c, 0)::bigint as log_count
  from public.species s
  left join counts c on c.species_id = s.id
  cross join q
  where
    q.t is null
    or s.common_name ilike '%' || q.t || '%'
    or (s.latin_name is not null and s.latin_name ilike '%' || q.t || '%')
    or similarity(lower(s.common_name), lower(q.t)) > 0.1
    or (s.latin_name is not null and similarity(lower(s.latin_name), lower(q.t)) > 0.1)
  order by
    case when q.t is null then 0 else 1 end,
    log_count desc,
    greatest(
      similarity(lower(s.common_name), lower(coalesce(q.t, ''))),
      similarity(lower(coalesce(s.latin_name, '')), lower(coalesce(q.t, '')))
    ) desc,
    s.common_name asc
  limit greatest(1, least(coalesce(limit_n, 24), 50));
$$;

grant execute on function public.search_species(text, int) to authenticated;
