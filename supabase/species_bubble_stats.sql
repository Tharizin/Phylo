-- Aggregated species stats for bubble map visualizations.
-- Run in Supabase SQL editor, then reload API schema.

create or replace function public.user_species_bubble_stats(p_target_user_id uuid)
returns table (
  species_id uuid,
  common_name text,
  latin_name text,
  category text,
  user_log_count bigint,
  platform_log_count bigint
)
language sql
security definer
set search_path = public
as $$
  with user_counts as (
    select fl.species_id, count(*)::bigint as user_log_count
    from public.food_logs fl
    where fl.user_id = p_target_user_id
    group by fl.species_id
  ),
  platform_counts as (
    select fl.species_id, count(*)::bigint as platform_log_count
    from public.food_logs fl
    group by fl.species_id
  )
  select
    s.id as species_id,
    s.common_name,
    s.latin_name,
    s.category,
    uc.user_log_count,
    coalesce(pc.platform_log_count, 0)::bigint as platform_log_count
  from user_counts uc
  join public.species s on s.id = uc.species_id
  left join platform_counts pc on pc.species_id = s.id
  order by uc.user_log_count desc, s.common_name asc;
$$;

create or replace function public.community_species_bubble_stats()
returns table (
  species_id uuid,
  common_name text,
  latin_name text,
  category text,
  platform_log_count bigint,
  unique_users bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as species_id,
    s.common_name,
    s.latin_name,
    s.category,
    count(*)::bigint as platform_log_count,
    count(distinct fl.user_id)::bigint as unique_users
  from public.food_logs fl
  join public.species s on s.id = fl.species_id
  group by s.id, s.common_name, s.latin_name, s.category
  order by count(*) desc, s.common_name asc;
$$;

create or replace function public.community_unique_species_total()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(distinct species_id)::bigint from public.food_logs;
$$;

grant execute on function public.user_species_bubble_stats(uuid) to authenticated;
grant execute on function public.community_species_bubble_stats() to authenticated;
grant execute on function public.community_unique_species_total() to authenticated;
