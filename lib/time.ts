/** Sunday 00:00 UTC week start (matches SQL week_start_sunday_utc) */
export function weekStartSundayUtc(d: Date = new Date()): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = utc.getUTCDay(); // 0 Sunday
  utc.setUTCDate(utc.getUTCDate() - dow);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

export function weekEndExclusiveUtc(): Date {
  const s = weekStartSundayUtc();
  return new Date(s.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDate(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatDateTime(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
