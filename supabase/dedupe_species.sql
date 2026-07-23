-- Phylo: deduplicate species catalog (aliases + duplicate common names)
-- Run in the Supabase SQL editor. Review preview queries first.
-- Safe to re-run: alias dedup is idempotent; merges skip single-row common names.

create or replace function public.phylo_normalize_text(t text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(replace(coalesce(t, ''), '×', 'x'), '\s+', ' ', 'g')));
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
  ('Carrot', 'Daucus carota'),
  ('Spinach', 'Spinacia oleracea'),
  ('Kale', 'Brassica oleracea var. sabellica'),
  ('Broccoli', 'Brassica oleracea var. italica'),
  ('Cauliflower', 'Brassica oleracea var. botrytis'),
  ('Brussels sprouts', 'Brassica oleracea var. gemmifera'),
  ('Kohlrabi', 'Brassica oleracea var. gongylodes'),
  ('Cabbage', 'Brassica oleracea var. capitata'),
  ('Collard greens', 'Brassica oleracea var. viridis'),
  ('Bok choy', 'Brassica rapa subsp. chinensis'),
  ('Turnip', 'Brassica rapa subsp. rapa'),
  ('Sweet potato', 'Ipomoea batatas'),
  ('Yam', 'Dioscorea alata'),
  ('Potato', 'Solanum tuberosum'),
  ('Tomato', 'Solanum lycopersicum'),
  ('Bell pepper', 'Capsicum annuum'),
  ('Eggplant', 'Solanum melongena'),
  ('Zucchini', 'Cucurbita pepo var. cylindrica'),
  ('Cucumber', 'Cucumis sativus'),
  ('Pumpkin', 'Cucurbita maxima'),
  ('Butternut squash', 'Cucurbita moschata'),
  ('Acorn squash', 'Cucurbita pepo var. turbinata'),
  ('Spaghetti squash', 'Cucurbita pepo var. pepo'),
  ('Beet', 'Beta vulgaris'),
  ('Radish', 'Raphanus sativus'),
  ('Parsnip', 'Pastinaca sativa'),
  ('Celery', 'Apium graveolens'),
  ('Fennel', 'Foeniculum vulgare'),
  ('Artichoke', 'Cynara cardunculus var. scolymus'),
  ('Asparagus', 'Asparagus officinalis'),
  ('Leek', 'Allium ampeloprasum var. porrum'),
  ('Green onion', 'Allium fistulosum'),
  ('Onion', 'Allium cepa'),
  ('Shallot', 'Allium cepa var. aggregatum'),
  ('Garlic', 'Allium sativum'),
  ('Corn', 'Zea mays'),
  ('Pea', 'Pisum sativum'),
  ('Green bean', 'Phaseolus vulgaris'),
  ('Soybean', 'Glycine max'),
  ('Okra', 'Abelmoschus esculenta'),
  ('Arugula', 'Eruca vesicaria'),
  ('Apple', 'Malus domestica'),
  ('Pear', 'Pyrus communis'),
  ('Peach', 'Prunus persica'),
  ('Plum', 'Prunus domestica'),
  ('Apricot', 'Prunus armeniaca'),
  ('Cherry', 'Prunus avium'),
  ('Strawberry', 'Fragaria × ananassa'),
  ('Raspberry', 'Rubus idaeus'),
  ('Blackberry', 'Rubus fruticosus'),
  ('Blueberry', 'Vaccinium corymbosum'),
  ('Cranberry', 'Vaccinium macrocarpon'),
  ('Grape', 'Vitis vinifera'),
  ('Watermelon', 'Citrullus lanatus'),
  ('Cantaloupe', 'Cucumis melo'),
  ('Orange', 'Citrus × sinensis'),
  ('Lemon', 'Citrus limon'),
  ('Lime', 'Citrus aurantiifolia'),
  ('Grapefruit', 'Citrus × paradisi'),
  ('Tangerine', 'Citrus reticulata'),
  ('Banana', 'Musa × paradisiaca'),
  ('Mango', 'Mangifera indica'),
  ('Papaya', 'Carica papaya'),
  ('Pineapple', 'Ananas comosus'),
  ('Kiwi', 'Actinidia deliciosa'),
  ('Fig', 'Ficus carica'),
  ('Pomegranate', 'Punica granatum'),
  ('Lychee', 'Litchi chinensis'),
  ('Dragon fruit', 'Hylocereus undatus'),
  ('Passion fruit', 'Passiflora edulis'),
  ('Guava', 'Psidium guajava'),
  ('Jackfruit', 'Artocarpus heterophyllus'),
  ('Durian', 'Durio zibethinus'),
  ('Avocado', 'Persea americana'),
  ('Olive', 'Olea europaea'),
  ('Coconut', 'Cocos nucifera'),
  ('Date', 'Phoenix dactylifera'),
  ('Persimmon', 'Diospyros kaki'),
  ('Quince', 'Cydonia oblonga'),
  ('Loquat', 'Eriobotrya japonica'),
  ('Prickly pear', 'Opuntia ficus-indica'),
  ('Starfruit', 'Averrhoa carambola'),
  ('Tamarind', 'Tamarindus indica'),
  ('Wheat', 'Triticum aestivum'),
  ('Rice', 'Oryza sativa'),
  ('Oat', 'Avena sativa'),
  ('Barley', 'Hordeum vulgare'),
  ('Rye', 'Secale cereale'),
  ('Millet', 'Panicum miliaceum'),
  ('Sorghum', 'Sorghum bicolor'),
  ('Quinoa', 'Chenopodium quinoa'),
  ('Amaranth', 'Amaranthus caudatus'),
  ('Buckwheat', 'Fagopyrum esculentum'),
  ('Teff', 'Eragrostis tef'),
  ('Chickpea', 'Cicer arietinum'),
  ('Lentil', 'Lens culinaris'),
  ('Peanut', 'Arachis hypogaea'),
  ('Fava bean', 'Vicia faba'),
  ('Mung bean', 'Vigna radiata'),
  ('Adzuki bean', 'Vigna angularis'),
  ('Black-eyed pea', 'Vigna unguiculata subsp. unguiculata'),
  ('Almond', 'Prunus dulcis'),
  ('Walnut', 'Juglans regia'),
  ('Pecan', 'Carya illinoinensis'),
  ('Cashew', 'Anacardium occidentale'),
  ('Pistachio', 'Pistacia vera'),
  ('Macadamia', 'Macadamia integrifolia'),
  ('Brazil nut', 'Bertholletia excelsa'),
  ('Hazelnut', 'Corylus avellana'),
  ('Chestnut', 'Castanea sativa'),
  ('Pine nut', 'Pinus pinea'),
  ('Sunflower seed', 'Helianthus annuus'),
  ('Sesame seed', 'Sesamum indicum'),
  ('Flaxseed', 'Linum usitatissimum'),
  ('Chia seed', 'Salvia hispanica'),
  ('Hemp seed', 'Cannabis sativa'),
  ('Poppy seed', 'Papaver somniferum'),
  ('Basil', 'Ocimum basilicum'),
  ('Oregano', 'Origanum vulgare'),
  ('Thyme', 'Thymus vulgaris'),
  ('Rosemary', 'Salvia rosmarinus'),
  ('Sage', 'Salvia officinalis'),
  ('Mint', 'Mentha spicata'),
  ('Cilantro', 'Coriandrum sativum'),
  ('Parsley', 'Petroselinum crispum'),
  ('Dill', 'Anethum graveolens'),
  ('Tarragon', 'Artemisia dracunculus'),
  ('Chives', 'Allium schoenoprasum'),
  ('Bay leaf', 'Laurus nobilis'),
  ('Lemongrass', 'Cymbopogon citratus'),
  ('Turmeric', 'Curcuma longa'),
  ('Ginger', 'Zingiber officinale'),
  ('Galangal', 'Alpinia galanga'),
  ('Black pepper', 'Piper nigrum'),
  ('Cardamom', 'Elettaria cardamomum'),
  ('Cinnamon', 'Cinnamomum verum'),
  ('Clove', 'Syzygium aromaticum'),
  ('Nutmeg', 'Myristica fragrans'),
  ('Allspice', 'Pimenta dioica'),
  ('Star anise', 'Illicium verum'),
  ('Cumin', 'Cuminum cyminum'),
  ('Mustard seed', 'Brassica juncea'),
  ('Fenugreek', 'Trigonella foenum-graecum'),
  ('Vanilla', 'Vanilla planifolia'),
  ('Saffron', 'Crocus sativus'),
  ('Sumac', 'Rhus coriaria'),
  ('Coffee', 'Coffea arabica'),
  ('Cacao', 'Theobroma cacao'),
  ('Tea', 'Camellia sinensis'),
  ('Sugar cane', 'Saccharum officinarum'),
  ('Agave', 'Agave tequilana'),
  ('Stevia', 'Stevia rebaudiana'),
  ('Moringa', 'Moringa oleifera'),
  ('Spirulina', 'Arthrospira platensis'),
  ('Chicken', 'Gallus gallus domesticus'),
  ('Cow', 'Bos taurus'),
  ('Pig', 'Sus scrofa domesticus'),
  ('Lamb', 'Ovis aries'),
  ('Goat', 'Capra aegagrus hircus'),
  ('Turkey', 'Meleagris gallopavo'),
  ('Duck', 'Anas platyrhynchos domesticus'),
  ('Rabbit', 'Oryctolagus cuniculus'),
  ('Bison', 'Bison bison'),
  ('Venison', 'Odocoileus virginianus'),
  ('Elk', 'Cervus canadensis'),
  ('Atlantic salmon', 'Salmo salar'),
  ('Sockeye salmon', 'Oncorhynchus nerka'),
  ('Yellowfin tuna', 'Thunnus albacares'),
  ('Bluefin tuna', 'Thunnus thynnus'),
  ('Cod', 'Gadus morhua'),
  ('Tilapia', 'Oreochromis niloticus'),
  ('Catfish', 'Ictalurus punctatus'),
  ('Rainbow trout', 'Oncorhynchus mykiss'),
  ('Sardine', 'Sardina pilchardus'),
  ('Anchovy', 'Engraulis encrasicolus'),
  ('Atlantic mackerel', 'Scomber scombrus'),
  ('Atlantic herring', 'Clupea harengus'),
  ('Atlantic halibut', 'Hippoglossus hippoglossus'),
  ('European sea bass', 'Dicentrarchus labrax'),
  ('Mahi-mahi', 'Coryphaena hippurus'),
  ('Swordfish', 'Xiphias gladius'),
  ('Whiteleg shrimp', 'Litopenaeus vannamei'),
  ('Blue crab', 'Callinectes sapidus'),
  ('American lobster', 'Homarus americanus'),
  ('Hard clam', 'Mercenaria mercenaria'),
  ('Eastern oyster', 'Crassostrea virginica'),
  ('Blue mussel', 'Mytilus edulis'),
  ('Sea scallop', 'Placopecten magellanicus'),
  ('Longfin squid', 'Doryteuthis pealeii'),
  ('Common octopus', 'Octopus vulgaris'),
  ('Honey bee', 'Apis mellifera'),
  ('Shiitake', 'Lentinula edodes'),
  ('Button mushroom', 'Agaricus bisporus'),
  ('Oyster mushroom', 'Pleurotus ostreatus'),
  ('Lion''s mane', 'Hericium erinaceus'),
  ('Chanterelle', 'Cantharellus cibarius'),
  ('Porcini', 'Boletus edulis'),
  ('Morel', 'Morchella esculenta'),
  ('Black truffle', 'Tuber melanosporum'),
  ('Enoki', 'Flammulina velutipes'),
  ('Maitake', 'Grifola frondosa'),
  ('Reishi', 'Ganoderma lucidum'),
  ('Nutritional yeast', 'Saccharomyces cerevisiae');

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
