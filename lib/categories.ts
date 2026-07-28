export const SPECIES_CATEGORIES = ["plant", "animal", "fungus", "bacterium", "other"] as const;

export type SpeciesCategoryValue = (typeof SPECIES_CATEGORIES)[number];

export const CATEGORY_OPTIONS: { value: SpeciesCategoryValue; label: string }[] = [
  { value: "plant", label: "Plant" },
  { value: "animal", label: "Animal" },
  { value: "fungus", label: "Fungus" },
  { value: "bacterium", label: "Bacterium" },
  { value: "other", label: "Other" },
];

export function isKnownCategory(category: string): category is SpeciesCategoryValue {
  return (SPECIES_CATEGORIES as readonly string[]).includes(category);
}
