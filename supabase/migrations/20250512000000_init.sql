-- Phylo schema: profiles, species, food_logs + RLS + search + leaderboard RPC

create extension if not exists "pg_trgm";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  is_admin boolean not null default false,
  avatar_url text,
  diversity_week_processed timestamptz,
  created_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create table public.species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  latin_name text,
  category text not null check (category in ('plant', 'animal', 'fungus', 'other')),
  alternative_names text[] not null default '{}',
  added_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  species_id uuid not null references public.species (id) on delete restrict,
  logged_at timestamptz not null default now(),
  notes text,
  base_points numeric not null,
  streak_multiplier numeric not null default 1,
  diversity_multiplier numeric not null default 1,
  points_awarded numeric not null default 0
);

create index food_logs_user_logged_at on public.food_logs (user_id, logged_at desc);
create index food_logs_species on public.food_logs (species_id);
create index food_logs_user_species on public.food_logs (user_id, species_id);
create index species_common_trgm on public.species using gin (common_name gin_trgm_ops);
create index species_latin_trgm on public.species using gin (latin_name gin_trgm_ops);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.species enable row level security;
alter table public.food_logs enable row level security;
alter table public.friendships enable row level security;

create index friendships_requester on public.friendships (requester_id);
create index friendships_addressee on public.friendships (addressee_id);

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "species_select_authenticated" on public.species for select to authenticated using (true);
create policy "species_insert_authenticated" on public.species for insert to authenticated with check (auth.uid() = added_by_user_id);

create policy "species_admin_all" on public.species for all to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "food_logs_select_own_or_admin" on public.food_logs for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "food_logs_insert_own" on public.food_logs for insert to authenticated with check (user_id = auth.uid());

create policy "food_logs_update_own" on public.food_logs for update to authenticated using (user_id = auth.uid());

create policy "food_logs_delete_own" on public.food_logs for delete to authenticated using (user_id = auth.uid());

create policy "food_logs_admin_update" on public.food_logs for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "food_logs_admin_delete" on public.food_logs for delete to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "friendships_select_participant" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert_requester" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "friendships_update_addressee" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create policy "friendships_delete_participant" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Week starts Sunday 00:00 in a given timezone (stored as timestamptz boundaries from client using UTC week math: use ISO and document, OR use America/New_York). Here: Sunday-based week in "UTC" for consistency (Sunday = dow 0 in extract from timestamptz utc).
create or replace function public.week_start_sunday_utc(ts timestamptz)
returns timestamptz
language sql
immutable
as $$
  select date_trunc('day', ts at time zone 'utc')
    - make_interval(days => (extract(dow from ts at time zone 'utc')::int));
$$;

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

create or replace function public.leaderboard_weekly(limit_n int default 50)
returns table (
  user_id uuid,
  username text,
  weekly_distinct_species bigint,
  weekly_points numeric,
  alltime_points numeric
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
      count(distinct fl.species_id) as species_ct,
      coalesce(sum(fl.points_awarded), 0) as pts
    from public.food_logs fl, bounds b
    where fl.logged_at >= b.wk_start
      and fl.logged_at < b.wk_start + interval '7 days'
    group by fl.user_id
  ),
  alltime as (
    select fl.user_id, coalesce(sum(fl.points_awarded), 0) as pts
    from public.food_logs fl
    group by fl.user_id
  )
  select
    p.id as user_id,
    p.username,
    coalesce(w.species_ct, 0)::bigint as weekly_distinct_species,
    coalesce(w.pts, 0)::numeric as weekly_points,
    coalesce(a.pts, 0)::numeric as alltime_points
  from public.profiles p
  left join weekly w on w.user_id = p.id
  left join alltime a on a.user_id = p.id
  order by weekly_distinct_species desc, weekly_points desc, username asc
  limit greatest(1, least(coalesce(limit_n, 50), 200));
$$;

grant execute on function public.leaderboard_weekly(int) to authenticated;

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

comment on function public.week_start_sunday_utc is 'Start of current local calendar week if ts is UTC — Sunday 00:00 UTC boundary for weekly reset per spec';
