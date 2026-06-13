-- Run this entire script in the Supabase SQL Editor to apply all schema changes
-- to an existing Phylo database.

-- ── Species alternative names ──────────────────────────────────────────────
alter table public.species
  add column if not exists alternative_names text[] not null default '{}';

-- ── Profile avatars ────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists diversity_week_processed timestamptz;

-- ── Food log point breakdown columns ───────────────────────────────────────
alter table public.food_logs
  add column if not exists base_points numeric;

alter table public.food_logs
  add column if not exists streak_multiplier numeric not null default 1;

alter table public.food_logs
  add column if not exists diversity_multiplier numeric not null default 1;

update public.food_logs
set
  base_points = coalesce(base_points, points_awarded),
  streak_multiplier = coalesce(nullif(streak_multiplier, 0), 1),
  diversity_multiplier = coalesce(nullif(diversity_multiplier, 0), 1)
where base_points is null;

alter table public.food_logs
  alter column base_points set not null;

-- ── Friendships ────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index if not exists friendships_requester on public.friendships (requester_id);
create index if not exists friendships_addressee on public.friendships (addressee_id);
create index if not exists friendships_status on public.friendships (status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participant" on public.friendships;
create policy "friendships_select_participant" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

drop policy if exists "friendships_delete_participant" on public.friendships;
create policy "friendships_delete_participant" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ── Avatars storage bucket ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Species search (includes alternative names) ────────────────────────────
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
    log_count desc,
    greatest(
      similarity(lower(s.common_name), lower(coalesce(q.t, ''))),
      similarity(lower(coalesce(s.latin_name, '')), lower(coalesce(q.t, '')))
    ) desc,
    s.common_name asc
  limit greatest(1, least(coalesce(limit_n, 24), 50));
$$;

grant execute on function public.search_species(text, int) to authenticated;

-- ── Apply weekly diversity multiplier ──────────────────────────────────────
create or replace function public.apply_weekly_diversity_multiplier(
  p_user_id uuid,
  p_week_start timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_end timestamptz := p_week_start + interval '7 days';
  v_prev_start timestamptz := p_week_start - interval '7 days';
  v_this_week_species uuid[];
  v_prev_week_species uuid[];
  v_new_count int;
  v_this_count int;
  v_new_pct numeric;
  v_multiplier numeric;
begin
  select coalesce(array_agg(distinct species_id), '{}')
  into v_this_week_species
  from public.food_logs
  where user_id = p_user_id
    and logged_at >= p_week_start
    and logged_at < v_week_end;

  if coalesce(array_length(v_this_week_species, 1), 0) = 0 then
    return;
  end if;

  select coalesce(array_agg(distinct species_id), '{}')
  into v_prev_week_species
  from public.food_logs
  where user_id = p_user_id
    and logged_at >= v_prev_start
    and logged_at < p_week_start;

  select count(*)::int
  into v_new_count
  from unnest(v_this_week_species) s
  where not (s = any (v_prev_week_species));

  v_this_count := coalesce(array_length(v_this_week_species, 1), 0);
  v_new_pct := v_new_count::numeric / v_this_count::numeric;
  v_multiplier := case when v_new_pct >= 0.15 then 1.5 else 1.0 end;

  update public.food_logs
  set
    diversity_multiplier = v_multiplier,
    points_awarded = round(
      base_points * streak_multiplier * v_multiplier * 100
    ) / 100
  where user_id = p_user_id
    and logged_at >= p_week_start
    and logged_at < v_week_end;
end;
$$;

grant execute on function public.apply_weekly_diversity_multiplier(uuid, timestamptz) to authenticated;

-- ── Community user stats ───────────────────────────────────────────────────
create or replace function public.community_user_stats(p_user_id uuid default auth.uid())
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  alltime_species bigint,
  weekly_species bigint,
  alltime_points numeric,
  weekly_points numeric,
  friendship_status text,
  friendship_id uuid,
  is_friend boolean,
  is_pending_incoming boolean,
  is_pending_outgoing boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select public.week_start_sunday_utc(now()) as wk_start
  ),
  weekly as (
    select fl.user_id,
      count(distinct fl.species_id)::bigint as species_ct,
      coalesce(sum(fl.points_awarded), 0)::numeric as pts
    from public.food_logs fl, bounds b
    where fl.logged_at >= b.wk_start
      and fl.logged_at < b.wk_start + interval '7 days'
    group by fl.user_id
  ),
  alltime as (
    select fl.user_id,
      count(distinct fl.species_id)::bigint as species_ct,
      coalesce(sum(fl.points_awarded), 0)::numeric as pts
    from public.food_logs fl
    group by fl.user_id
  ),
  rel as (
    select
      case when f.requester_id = p_user_id then f.addressee_id else f.requester_id end as other_id,
      f.id as friendship_id,
      f.status,
      f.requester_id = p_user_id as outgoing
    from public.friendships f
    where f.requester_id = p_user_id or f.addressee_id = p_user_id
  )
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    coalesce(a.species_ct, 0)::bigint as alltime_species,
    coalesce(w.species_ct, 0)::bigint as weekly_species,
    coalesce(a.pts, 0)::numeric as alltime_points,
    coalesce(w.pts, 0)::numeric as weekly_points,
    coalesce(r.status, 'none') as friendship_status,
    r.friendship_id,
    coalesce(r.status = 'accepted', false) as is_friend,
    coalesce(r.status = 'pending' and not r.outgoing, false) as is_pending_incoming,
    coalesce(r.status = 'pending' and r.outgoing, false) as is_pending_outgoing
  from public.profiles p
  left join weekly w on w.user_id = p.id
  left join alltime a on a.user_id = p.id
  left join rel r on r.other_id = p.id
  order by
    coalesce(r.status = 'accepted', false) desc,
    p.username asc;
$$;

grant execute on function public.community_user_stats(uuid) to authenticated;

-- Prevent duplicate species by latin name
create unique index if not exists species_latin_name_unique
  on public.species (lower(trim(latin_name)))
  where latin_name is not null and trim(latin_name) <> '';

-- Refresh PostgREST schema cache so new columns/functions are visible immediately
notify pgrst, 'reload schema';
