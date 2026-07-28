"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklyChartPoint } from "@/lib/weekly-analytics";
import { orderChartDaysMonFirst } from "@/lib/weekly-analytics";

type ChartTab = "logs" | "species";

type ComparisonSeries = {
  primaryLabel: string;
  secondaryLabel?: string;
  logsPerDay: WeeklyChartPoint[];
  newSpeciesPerDay: WeeklyChartPoint[];
  compareLogsPerDay?: WeeklyChartPoint[];
  compareNewSpeciesPerDay?: WeeklyChartPoint[];
};

function mergeSeries(
  primary: WeeklyChartPoint[],
  secondary?: WeeklyChartPoint[]
): { label: string; primary: number; secondary: number }[] {
  return primary.map((point, index) => ({
    label: point.label,
    primary: point.value,
    secondary: secondary?.[index]?.value ?? 0,
  }));
}

function WeeklyLineChart({
  data,
  primaryLabel,
  secondaryLabel,
  yLabel,
}: {
  data: { label: string; primary: number; secondary: number }[];
  primaryLabel: string;
  secondaryLabel?: string;
  yLabel: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--popover-foreground))",
              fontSize: "0.75rem",
            }}
          />
          {secondaryLabel ? <Legend wrapperStyle={{ fontSize: "0.75rem" }} /> : null}
          <Line
            type="monotone"
            dataKey="primary"
            name={primaryLabel}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
          {secondaryLabel ? (
            <Line
              type="monotone"
              dataKey="secondary"
              name={secondaryLabel}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: "hsl(var(--muted-foreground))" }}
              activeDot={{ r: 5 }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyAnalyticsPanel({
  series,
  collapsedLabel = "Show analytics",
  title = "Weekly analytics",
  description = "UTC week (Sunday–Saturday). Toggle between log volume and first-time species counts.",
}: {
  series: ComparisonSeries;
  collapsedLabel?: string;
  title?: string;
  description?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<ChartTab>("logs");

  const chartData = useMemo(() => {
    if (tab === "logs") {
      return mergeSeries(
        orderChartDaysMonFirst(series.logsPerDay),
        series.compareLogsPerDay ? orderChartDaysMonFirst(series.compareLogsPerDay) : undefined
      );
    }
    return mergeSeries(
      orderChartDaysMonFirst(series.newSpeciesPerDay),
      series.compareNewSpeciesPerDay ? orderChartDaysMonFirst(series.compareNewSpeciesPerDay) : undefined
    );
  }, [series, tab]);

  const yLabel = tab === "logs" ? "Logs" : "New species";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {expanded ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? (
            <>
              Hide analytics
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              {collapsedLabel}
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </CardHeader>
      {expanded ? (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "logs" ? "default" : "outline"}
              onClick={() => setTab("logs")}
            >
              Logs per day this week
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "species" ? "default" : "outline"}
              onClick={() => setTab("species")}
            >
              New species this week
            </Button>
          </div>
          <WeeklyLineChart
            data={chartData}
            primaryLabel={series.primaryLabel}
            secondaryLabel={series.secondaryLabel}
            yLabel={yLabel}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}

export function FriendWeeklyComparisonPanel({
  viewer,
  friend,
  friendName,
}: {
  viewer: {
    logsPerDay: WeeklyChartPoint[];
    newSpeciesPerDay: WeeklyChartPoint[];
  };
  friend: {
    logsPerDay: WeeklyChartPoint[];
    newSpeciesPerDay: WeeklyChartPoint[];
  };
  friendName: string;
}) {
  return (
    <WeeklyAnalyticsPanel
      title="Weekly comparison"
      description={`Compare your activity with ${friendName} for the current UTC week.`}
      collapsedLabel="Show weekly comparison"
      series={{
        primaryLabel: "You",
        secondaryLabel: friendName,
        logsPerDay: viewer.logsPerDay,
        newSpeciesPerDay: viewer.newSpeciesPerDay,
        compareLogsPerDay: friend.logsPerDay,
        compareNewSpeciesPerDay: friend.newSpeciesPerDay,
      }}
    />
  );
}
