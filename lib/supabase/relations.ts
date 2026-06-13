export type SpeciesJoinRow = {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
};

/** Supabase embed types may be T or T[]; at runtime many-to-one joins return a single row. */
export function normalizeSpeciesJoin(value: unknown): SpeciesJoinRow {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return { id: "", common_name: "Unknown", latin_name: null, category: "other" };
  }
  const s = row as Record<string, unknown>;
  return {
    id: s.id != null ? String(s.id) : "",
    common_name: s.common_name != null ? String(s.common_name) : "Unknown",
    latin_name: s.latin_name != null ? String(s.latin_name) : null,
    category: s.category != null ? String(s.category) : "other",
  };
}
