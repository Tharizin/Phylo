import { startOfUtcDay, weekStartSundayUtc } from "@/lib/time";

export type WeeklyChartPoint = {
  dayKey: string;
  label: string;
  value: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Mon–Sun labels for the current UTC week (Sunday-based week start). */
export function weekChartDays(reference = new Date()): WeeklyChartPoint[] {
  const start = weekStartSundayUtc(reference);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * 86400000);
    const dayKey = day.toISOString().slice(0, 10);
    return { dayKey, label: DAY_LABELS[day.getUTCDay()], value: 0 };
  });
}

export function logsPerDayThisWeek(
  logs: { logged_at: string }[],
  reference = new Date()
): WeeklyChartPoint[] {
  const buckets = weekChartDays(reference);
  const indexByKey = Object.fromEntries(buckets.map((bucket, index) => [bucket.dayKey, index]));

  for (const log of logs) {
    const dayKey = startOfUtcDay(new Date(log.logged_at)).toISOString().slice(0, 10);
    const index = indexByKey[dayKey];
    if (index != null) buckets[index].value += 1;
  }

  return buckets;
}

/** Display Mon–Sun while preserving UTC day keys. Expects Sun-first week from weekChartDays. */
export function orderChartDaysMonFirst(days: WeeklyChartPoint[]): WeeklyChartPoint[] {
  if (days.length !== 7) return days;
  return [...days.slice(1), days[0]];
}
/** First log of each species within the current UTC week, counted on that day only. */
export function newSpeciesPerDayThisWeek(
  logs: { logged_at: string; species_id: string }[],
  reference = new Date()
): WeeklyChartPoint[] {
  const buckets = weekChartDays(reference);
  const indexByKey = Object.fromEntries(buckets.map((bucket, index) => [bucket.dayKey, index]));
  const weekStart = weekStartSundayUtc(reference).getTime();
  const weekEnd = weekStart + 7 * 86400000;

  const sorted = [...logs]
    .filter((log) => {
      const time = new Date(log.logged_at).getTime();
      return time >= weekStart && time < weekEnd;
    })
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

  const seenThisWeek = new Set<string>();
  for (const log of sorted) {
    if (seenThisWeek.has(log.species_id)) continue;
    seenThisWeek.add(log.species_id);
    const dayKey = startOfUtcDay(new Date(log.logged_at)).toISOString().slice(0, 10);
    const index = indexByKey[dayKey];
    if (index != null) buckets[index].value += 1;
  }

  return buckets;
}
