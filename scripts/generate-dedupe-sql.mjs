import fs from "fs";
import path from "path";

const seedPath = path.join(process.cwd(), "supabase", "seed_common_species.sql");
const text = fs.readFileSync(seedPath, "utf8");
const rowRe = /\('([^']*(?:''[^']*)*)',\s*'([^']*(?:''[^']*)*)',\s*'([^']+)',\s*ARRAY\[([^\]]*)\]/g;
const rows = [];
for (const m of text.matchAll(rowRe)) {
  rows.push({
    common: m[1].replace(/''/g, "'"),
    latin: m[2].replace(/''/g, "'"),
  });
}

const canonicalValues = rows
  .map((r) => `  ('${r.common.replace(/'/g, "''")}', '${r.latin.replace(/'/g, "''")}')`)
  .join(",\n");

const canonicalTs = `// Auto-generated from supabase/seed_common_species.sql — do not edit by hand.
export const CANONICAL_SPECIES: { commonName: string; latinName: string }[] = ${JSON.stringify(
  rows.map((r) => ({ commonName: r.common, latinName: r.latin })),
  null,
  2
)};
`;

fs.writeFileSync(path.join(process.cwd(), "lib", "canonical-species.ts"), canonicalTs);

const sql = `-- Phylo: deduplicate species catalog (aliases + duplicate common names)
-- Run in the Supabase SQL editor. Review preview queries first.
-- Safe to re-run: alias dedup is idempotent; merges skip single-row common names.

create or replace function public.phylo_normalize_text(t text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(replace(coalesce(t, ''), '×', 'x'), '\\s+', ' ', 'g')));
$$;

create or replace function public.phylo_dedupe_aliases(names text[])
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(alias order by alias), '{}'::text[])
  from (
    select distinct on (public.phylo_normalize_text(trim(alias))) trim(alias) as alias
    from unnest(coalesce(names, '{}'::text[])) as alias
    where trim(alias) <> ''
  ) deduped;
$$;

-- Step 1: dedupe aliases within each species
update public.species s
set alternative_names = filtered.aliases
from (
  select
    s2.id,
    coalesce(
      (
        select array_agg(alias order by alias)
        from (
          select distinct on (public.phylo_normalize_text(a)) a as alias
          from unnest(public.phylo_dedupe_aliases(s2.alternative_names)) as a
          where public.phylo_normalize_text(a) <> public.phylo_normalize_text(s2.common_name)
            and (
              s2.latin_name is null
              or trim(s2.latin_name) = ''
              or public.phylo_normalize_text(a) <> public.phylo_normalize_text(s2.latin_name)
            )
        ) x
      ),
      '{}'::text[]
    ) as aliases
  from public.species s2
) filtered
where s.id = filtered.id
  and s.alternative_names is distinct from filtered.aliases;

drop table if exists _phylo_canonical_species;
create temporary table _phylo_canonical_species (
  common_name text not null,
  latin_name text not null
) on commit drop;

insert into _phylo_canonical_species (common_name, latin_name) values
${canonicalValues};

-- Preview duplicates:
-- select public.phylo_normalize_text(common_name), array_agg(common_name), array_agg(latin_name), count(*)
-- from public.species group by 1 having count(*) > 1;

do $$
declare
  grp record;
  keeper_id uuid;
  drop_id uuid;
  keeper_aliases text[];
  drop_aliases text[];
  drop_common text;
  drop_latin text;
begin
  for grp in
    select public.phylo_normalize_text(s.common_name) as common_key
    from public.species s
    group by 1
    having count(*) > 1
  loop
    select s.id into keeper_id
    from public.species s
    left join _phylo_canonical_species c
      on public.phylo_normalize_text(c.common_name) = public.phylo_normalize_text(s.common_name)
     and public.phylo_normalize_text(c.latin_name) = public.phylo_normalize_text(s.latin_name)
    left join lateral (
      select count(*)::int as log_count from public.food_logs fl where fl.species_id = s.id
    ) logs on true
    where public.phylo_normalize_text(s.common_name) = grp.common_key
    order by
      (case when c.latin_name is not null then 1 else 0 end) desc,
      logs.log_count desc,
      (case when coalesce(s.latin_name, '') ~* '[x×]' then 1 else 0 end) desc,
      length(coalesce(s.latin_name, '')) desc,
      s.created_at asc
    limit 1;

    for drop_id in
      select s.id from public.species s
      where public.phylo_normalize_text(s.common_name) = grp.common_key and s.id <> keeper_id
    loop
      select common_name, latin_name into drop_common, drop_latin from public.species where id = drop_id;
      select alternative_names into keeper_aliases from public.species where id = keeper_id;
      select alternative_names into drop_aliases from public.species where id = drop_id;

      update public.species
      set alternative_names = public.phylo_dedupe_aliases(
        coalesce(keeper_aliases, '{}'::text[])
        || coalesce(drop_aliases, '{}'::text[])
        || array_remove(array[drop_common, nullif(trim(drop_latin), '')], null)
      )
      where id = keeper_id;

      select alternative_names into keeper_aliases from public.species where id = keeper_id;
      update public.food_logs set species_id = keeper_id where species_id = drop_id;
      delete from public.species where id = drop_id;
    end loop;
  end loop;
end $$;
`;

fs.writeFileSync(path.join(process.cwd(), "supabase", "dedupe_species.sql"), sql);
console.log(`Generated lib/canonical-species.ts and supabase/dedupe_species.sql (${rows.length} species).`);
