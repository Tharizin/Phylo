import { CANONICAL_SPECIES } from "@/lib/canonical-species";

export type SpeciesRow = {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
  alternative_names: string[];
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, " ");
}

const canonicalLatinByCommon = new Map<string, string>(
  CANONICAL_SPECIES.map((row) => [normalizeText(row.commonName), normalizeText(row.latinName)])
);

export function dedupeAliases(
  aliases: string[],
  commonName: string,
  latinName: string | null
): string[] {
  const blocked = new Set<string>([normalizeText(commonName)]);
  if (latinName?.trim()) blocked.add(normalizeText(latinName));

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of aliases) {
    const alias = raw.trim();
    if (!alias) continue;
    const key = normalizeText(alias);
    if (blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(alias);
  }

  return result.sort((a, b) => a.localeCompare(b));
}

export function isCanonicalLatin(commonName: string, latinName: string | null): boolean {
  if (!latinName?.trim()) return false;
  return canonicalLatinByCommon.get(normalizeText(commonName)) === normalizeText(latinName);
}

export function scoreSpeciesKeeper(
  row: SpeciesRow,
  logCount: number
): number {
  let score = logCount * 100;
  if (isCanonicalLatin(row.common_name, row.latin_name)) score += 10000;
  if (/[x×]/i.test(row.latin_name ?? "")) score += 50;
  score += (row.latin_name?.trim().length ?? 0);
  score += row.alternative_names.length;
  return score;
}

export function pickKeeper(rows: SpeciesRow[], logCounts: Record<string, number>): SpeciesRow {
  return [...rows].sort((a, b) => {
    const scoreDiff = scoreSpeciesKeeper(b, logCounts[b.id] ?? 0) - scoreSpeciesKeeper(a, logCounts[a.id] ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.common_name.localeCompare(b.common_name);
  })[0];
}

export type DuplicateGroup = {
  key: string;
  kind: "common_name";
  rows: SpeciesRow[];
  keeper: SpeciesRow;
  drop: SpeciesRow[];
};

export function findDuplicateCommonNameGroups(
  rows: SpeciesRow[],
  logCounts: Record<string, number>
): DuplicateGroup[] {
  const groups = new Map<string, SpeciesRow[]>();
  for (const row of rows) {
    const key = normalizeText(row.common_name);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, members] of Array.from(groups.entries())) {
    if (members.length < 2) continue;
    const keeper = pickKeeper(members, logCounts);
    duplicates.push({
      key,
      kind: "common_name",
      rows: members,
      keeper,
      drop: members.filter((row) => row.id !== keeper.id),
    });
  }

  return duplicates.sort((a, b) => a.key.localeCompare(b.key));
}

export function mergedAliases(
  keeper: SpeciesRow,
  dropRows: SpeciesRow[]
): string[] {
  const combined = [
    ...keeper.alternative_names,
    ...dropRows.flatMap((row) => row.alternative_names),
    ...dropRows.map((row) => row.common_name),
    ...dropRows.map((row) => row.latin_name).filter(Boolean) as string[],
  ];
  return dedupeAliases(combined, keeper.common_name, keeper.latin_name);
}

export type DedupePlan = {
  aliasUpdates: { id: string; common_name: string; before: string[]; after: string[] }[];
  merges: {
    keeper: SpeciesRow;
    drop: SpeciesRow;
    mergedAliases: string[];
    reason: string;
  }[];
};

export function buildDedupePlan(rows: SpeciesRow[], logCounts: Record<string, number>): DedupePlan {
  const aliasUpdates = rows
    .map((row) => {
      const after = dedupeAliases(row.alternative_names, row.common_name, row.latin_name);
      return { id: row.id, common_name: row.common_name, before: row.alternative_names, after };
    })
    .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after));

  const merges: DedupePlan["merges"] = [];
  for (const group of findDuplicateCommonNameGroups(rows, logCounts)) {
    for (const drop of group.drop) {
      const reason = isCanonicalLatin(group.keeper.common_name, group.keeper.latin_name)
        ? "Matches seeded canonical latin name"
        : (logCounts[group.keeper.id] ?? 0) >= (logCounts[drop.id] ?? 0)
          ? "More food logs / accurate latin name"
          : "Higher catalog accuracy score";
      merges.push({
        keeper: group.keeper,
        drop,
        mergedAliases: mergedAliases(group.keeper, [drop]),
        reason,
      });
    }
  }

  return { aliasUpdates, merges };
}
