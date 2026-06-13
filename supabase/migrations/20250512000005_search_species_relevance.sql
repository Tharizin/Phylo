-- Rank species search by text relevance before popularity.
drop function if exists public.search_species(text, int);

create or replace function public.search_species(search_query text, limit_n int default 24)
returns table (
  id uuid,
  common_name text,
  latin_name text,
  category text,
  alternative_names text[],
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
    s.alternative_names,
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
    or exists (
      select 1 from unnest(s.alternative_names) alt
      where alt ilike '%' || q.t || '%'
    )
    or similarity(lower(s.common_name), lower(q.t)) > 0.1
    or (s.latin_name is not null and similarity(lower(s.latin_name), lower(q.t)) > 0.1)
  order by
    case when q.t is null then 0 else 1 end,
    case
      when q.t is null then 0
      when lower(s.common_name) = lower(q.t) then 0
      when lower(s.common_name) like lower(q.t) || '%' then 1
      when lower(s.common_name) like '%' || lower(q.t) || '%' then 2
      when exists (
        select 1 from unnest(s.alternative_names) alt
        where lower(alt) = lower(q.t)
      ) then 3
      when exists (
        select 1 from unnest(s.alternative_names) alt
        where lower(alt) like lower(q.t) || '%'
      ) then 4
      when exists (
        select 1 from unnest(s.alternative_names) alt
        where lower(alt) like '%' || lower(q.t) || '%'
      ) then 5
      when s.latin_name is not null and lower(s.latin_name) = lower(q.t) then 6
      when s.latin_name is not null and lower(s.latin_name) like lower(q.t) || '%' then 7
      when s.latin_name is not null and lower(s.latin_name) like '%' || lower(q.t) || '%' then 8
      else 9
    end,
    greatest(
      similarity(lower(s.common_name), lower(coalesce(q.t, ''))),
      similarity(lower(coalesce(s.latin_name, '')), lower(coalesce(q.t, '')))
    ) desc,
    log_count desc,
    s.common_name asc
  limit greatest(1, least(coalesce(limit_n, 24), 50));
$$;

grant execute on function public.search_species(text, int) to authenticated;
