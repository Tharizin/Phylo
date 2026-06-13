import { startOfUtcDay } from "./time";

export type SpeciesCategory = "plant" | "animal" | "fungus" | "other";

export type PointReason =
  | "first_ever_and_new_week"
  | "first_ever_only"
  | "new_week_only"
  | "repeat_this_week";

export type PointBreakdown = {
  basePoints: number;
  firstEverPoints: number;
  weeklyPoints: number;
  reason: PointReason;
  streakMultiplier: number;
  diversityMultiplier: number;
  finalPoints: number;
  isFirstEver: boolean;
  isNewThisWeek: boolean;
};

function firstEverPoints(category: SpeciesCategory): number {
  if (category === "plant" || category === "fungus") return 2;
  if (category === "animal") return 1;
  return 0;
}

function weeklyPoints(category: SpeciesCategory, isNewThisWeek: boolean): number {
  if (!isNewThisWeek) return 0;
  if (category === "animal") return 0.05;
  if (category === "plant" || category === "fungus" || category === "other") return 0.1;
  return 0;
}

/**
 * All-time first log: +2 plant/fungus, +1 animal
 * First log each week (UTC, Sunday reset): +0.10 plant/fungus/other, +0.05 animal
 * Repeat same species same week: 0
 * 1.25× streak multiplier when user has ≥5 consecutive UTC days with ≥1 log
 * 1.5× diversity multiplier applied retroactively at week end
 */
export function computePoints(params: {
  hadEverLoggedSpecies: boolean;
  loggedSpeciesThisWeek: boolean;
  category: SpeciesCategory;
  currentStreakDays: number;
  diversityMultiplier?: number;
}): PointBreakdown {
  const {
    hadEverLoggedSpecies,
    loggedSpeciesThisWeek,
    category,
    currentStreakDays,
    diversityMultiplier = 1,
  } = params;

  const isFirstEver = !hadEverLoggedSpecies;
  const isNewThisWeek = !loggedSpeciesThisWeek;

  const firstEver = isFirstEver ? firstEverPoints(category) : 0;
  const weekly = weeklyPoints(category, isNewThisWeek);
  const basePoints = firstEver + weekly;

  let reason: PointReason;
  if (isFirstEver && isNewThisWeek) reason = "first_ever_and_new_week";
  else if (isFirstEver) reason = "first_ever_only";
  else if (isNewThisWeek) reason = "new_week_only";
  else reason = "repeat_this_week";

  const streakMultiplier = currentStreakDays >= 5 ? 1.25 : 1;
  const finalPoints =
    Math.round(basePoints * streakMultiplier * diversityMultiplier * 100) / 100;

  return {
    basePoints,
    firstEverPoints: firstEver,
    weeklyPoints: weekly,
    reason,
    streakMultiplier,
    diversityMultiplier,
    finalPoints,
    isFirstEver,
    isNewThisWeek,
  };
}

/** Consecutive UTC calendar days ending at `asOf` day that each have ≥1 log */
export function streakLengthUtc(loggedAts: Date[], asOf: Date): number {
  const today = startOfUtcDay(asOf).getTime();
  const days = new Set<number>();
  for (const t of loggedAts) {
    days.add(startOfUtcDay(t).getTime());
  }
  if (!days.has(today)) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = today - i * 86400000;
    if (days.has(d)) streak++;
    else break;
  }
  return streak;
}

export function pointReasonLabel(reason: PointReason): string {
  switch (reason) {
    case "first_ever_and_new_week":
      return "First time ever and first time this week";
    case "first_ever_only":
      return "First time ever";
    case "new_week_only":
      return "First time logging this species this week";
    case "repeat_this_week":
      return "Already logged this species this week";
  }
}
