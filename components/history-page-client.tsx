"use client";

import { WeeklyAnalyticsPanel } from "@/components/weekly-analytics-charts";
import { HistoryTable } from "@/components/history-table";
import type { WeeklyAnalyticsData } from "@/app/actions/analytics";

type HistoryRow = {
  id: string;
  logged_at: string;
  notes: string | null;
  points_awarded: number;
  species: { id: string; common_name: string; latin_name: string | null; category: string };
};

export function HistoryPageClient({
  logs,
  analytics,
}: {
  logs: HistoryRow[];
  analytics: WeeklyAnalyticsData;
}) {
  return (
    <div className="space-y-6">
      <WeeklyAnalyticsPanel
        series={{
          primaryLabel: "You",
          logsPerDay: analytics.logsPerDay,
          newSpeciesPerDay: analytics.newSpeciesPerDay,
        }}
      />
      <HistoryTable initial={logs} />
    </div>
  );
}
