export type SpeciesSearchMatch = {
  common_name: string;
  latin_name: string | null;
  alternative_names?: string[] | null;
};

/** Higher score = better match for the query. */
export function speciesSearchScore(row: SpeciesSearchMatch, query: string): number {
  const term = query.trim().toLowerCase();
  if (!term) return 0;

  const names = [
    row.common_name.toLowerCase(),
    ...(row.latin_name ? [row.latin_name.toLowerCase()] : []),
    ...((row.alternative_names ?? []).map((n) => n.toLowerCase())),
  ];

  let best = 0;
  for (const name of names) {
    if (name === term) best = Math.max(best, 1000);
    else if (name.startsWith(term)) best = Math.max(best, 500);
    else if (name.split(/\s+/).some((word) => word.startsWith(term))) best = Math.max(best, 350);
    else if (name.includes(term)) best = Math.max(best, 200);
  }
  return best;
}

export function rankSpeciesSearchResults<T extends SpeciesSearchMatch & { id: string }>(
  results: T[],
  query: string
): T[] {
  const term = query.trim().toLowerCase();
  if (!term) return results;

  return [...results]
    .filter((row) => speciesSearchScore(row, query) > 0)
    .sort((a, b) => {
      const diff = speciesSearchScore(b, query) - speciesSearchScore(a, query);
      if (diff !== 0) return diff;
      return a.common_name.localeCompare(b.common_name);
    });
}

export function isExactSpeciesNameMatch(term: string, row: SpeciesSearchMatch): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return false;
  if (row.common_name.trim().toLowerCase() === q) return true;
  if (row.latin_name?.trim().toLowerCase() === q) return true;
  return (row.alternative_names ?? []).some((name) => name.trim().toLowerCase() === q);
}
