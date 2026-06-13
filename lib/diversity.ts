import { weekStartSundayUtc } from "./time";

/** Completed UTC weeks (Sunday start) that may need diversity multiplier processing */
export function completedWeekStartsToProcess(lastProcessed: Date | null, now = new Date()): Date[] {
  const currentWeekStart = weekStartSundayUtc(now);
  const weeks: Date[] = [];

  let cursor = lastProcessed
    ? weekStartSundayUtc(new Date(lastProcessed.getTime() + 7 * 86400000))
    : weekStartSundayUtc(new Date(now.getTime() - 52 * 7 * 86400000));

  while (cursor.getTime() < currentWeekStart.getTime()) {
    weeks.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * 86400000);
  }

  return weeks;
}

export function diversityNewSpeciesPct(
  thisWeekSpecies: string[],
  prevWeekSpecies: string[]
): { newCount: number; thisCount: number; pct: number } {
  const prev = new Set(prevWeekSpecies);
  const unique = Array.from(new Set(thisWeekSpecies));
  const newCount = unique.filter((s) => !prev.has(s)).length;
  const thisCount = unique.length;
  const pct = thisCount === 0 ? 0 : newCount / thisCount;
  return { newCount, thisCount, pct };
}
