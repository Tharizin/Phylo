import { redirect } from "next/navigation";
import { AlertTriangle, Flame, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureDiversityProcessedAction } from "@/app/actions/diversity";
import { FoodLogPanel } from "@/components/food-log-panel";
import { RecentLogs } from "@/components/recent-logs";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { weekStartSundayUtc, weekEndExclusiveUtc } from "@/lib/time";
import { streakLengthUtc } from "@/lib/points";
import { diversityNewSpeciesPct } from "@/lib/diversity";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureDiversityProcessedAction();

  const wkStart = weekStartSundayUtc();
  const wkEnd = weekEndExclusiveUtc();
  const prevWkStart = new Date(wkStart.getTime() - 7 * 86400000);

  let weekLogs: { species_id: string; points_awarded: number; logged_at: string; diversity_multiplier?: number }[] | null =
    null;
  const weekWithDiv = await supabase
    .from("food_logs")
    .select("species_id, points_awarded, logged_at, diversity_multiplier")
    .eq("user_id", user.id)
    .gte("logged_at", wkStart.toISOString())
    .lt("logged_at", wkEnd.toISOString());

  if (!weekWithDiv.error) {
    weekLogs = weekWithDiv.data as typeof weekLogs;
  } else {
    const weekBasic = await supabase
      .from("food_logs")
      .select("species_id, points_awarded, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", wkStart.toISOString())
      .lt("logged_at", wkEnd.toISOString());
    weekLogs = weekBasic.data as typeof weekLogs;
  }

  const { data: prevWeekLogs } = await supabase
    .from("food_logs")
    .select("species_id")
    .eq("user_id", user.id)
    .gte("logged_at", prevWkStart.toISOString())
    .lt("logged_at", wkStart.toISOString());

  const { data: allLogs } = await supabase
    .from("food_logs")
    .select("species_id, points_awarded, logged_at")
    .eq("user_id", user.id);

  const weeklySpecies = new Set((weekLogs ?? []).map((l) => l.species_id)).size;
  const allTimeSpecies = new Set((allLogs ?? []).map((l) => l.species_id)).size;

  const weeklyPoints = (weekLogs ?? []).reduce((a, l) => a + Number(l.points_awarded ?? 0), 0);
  const allTimePoints = (allLogs ?? []).reduce((a, l) => a + Number(l.points_awarded ?? 0), 0);

  const thisWeekSpeciesIds = [...new Set((weekLogs ?? []).map((l) => l.species_id as string))];
  const prevWeekSpeciesIds = [...new Set((prevWeekLogs ?? []).map((l) => l.species_id as string))];
  const diversity = diversityNewSpeciesPct(thisWeekSpeciesIds, prevWeekSpeciesIds);
  const diversityQualified = diversity.pct >= 0.15;
  const hasDiversityBonus = (weekLogs ?? []).some((l) => Number(l.diversity_multiplier ?? 1) >= 1.5);

  const since7 = new Date(Date.now() - 7 * 86400000);
  const { data: logs7 } = await supabase
    .from("food_logs")
    .select("id, species_id, species ( id, common_name, latin_name )")
    .eq("user_id", user.id)
    .gte("logged_at", since7.toISOString());

  const total7 = logs7?.length ?? 0;
  const counts = new Map<string, { n: number; name: string }>();
  for (const row of logs7 ?? []) {
    const sid = row.species_id as string;
    const sp = row.species as { common_name: string; latin_name: string | null } | null;
    const prev = counts.get(sid);
    const name = sp?.common_name ?? "Unknown";
    counts.set(sid, { n: (prev?.n ?? 0) + 1, name });
  }
  const overrelianceCandidates =
    total7 === 0
      ? []
      : [...counts.entries()]
          .map(([speciesId, v]) => ({
            speciesId,
            name: v.name,
            pct: v.n / total7,
            count: v.n,
          }))
          .filter((x) => x.pct > 0.25);

  const totalEntries = allLogs?.length ?? 0;
  const firstLoggedAt =
    totalEntries > 0
      ? (allLogs ?? []).reduce((earliest, l) => {
          const t = new Date(l.logged_at as string).getTime();
          return t < earliest ? t : earliest;
        }, Number.POSITIVE_INFINITY)
      : null;
  const daysSinceFirstLog = firstLoggedAt
    ? Math.floor((Date.now() - firstLoggedAt) / 86400000)
    : 0;
  const canShowOverreliance = daysSinceFirstLog >= 7 || totalEntries >= 20;
  const overreliance = canShowOverreliance ? overrelianceCandidates : [];

  const streakDates = (allLogs ?? []).map((l) => new Date(l.logged_at as string));
  const dailyStreak = streakLengthUtc(streakDates, new Date());
  const streakActive = dailyStreak >= 5;

  const { data: recent } = await supabase
    .from("food_logs")
    .select("id, logged_at, points_awarded, notes, species ( common_name, latin_name, category )")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(5);

  const { data: board } = await supabase.rpc("leaderboard_weekly", { limit_n: 50 });

  const boardUserIds = (board as { user_id: string }[] | null)?.map((r) => r.user_id) ?? [];
  let boardProfiles: { id: string; username: string; avatar_url?: string | null }[] = [];
  if (boardUserIds.length) {
    const withAv = await supabase.from("profiles").select("id, username, avatar_url").in("id", boardUserIds);
    if (!withAv.error && withAv.data) {
      boardProfiles = withAv.data as typeof boardProfiles;
    } else {
      const basic = await supabase.from("profiles").select("id, username").in("id", boardUserIds);
      boardProfiles = (basic.data ?? []) as typeof boardProfiles;
    }
  }
  const profileMap = Object.fromEntries(
    boardProfiles.map((p) => [
      p.id as string,
      { username: p.username as string, avatar_url: (p.avatar_url as string | null) ?? null },
    ])
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Weekly window resets every <span className="font-medium text-foreground">Sunday 00:00 UTC</span>. First time
          ever: +2 plants/fungi, +1 animals. First time each week: +0.10 plants/fungi, +0.05 animals. Repeats in the same
          week earn 0. A 5-day streak gives 1.25×; 15%+ new species vs. last week earns 1.5× at week end.{" "}
          <a href="/help" className="text-primary underline-offset-4 hover:underline">
            How it works
          </a>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardHeader className="pb-2">
            <CardDescription>This week</CardDescription>
            <CardTitle className="text-5xl font-semibold tabular-nums text-primary sm:text-6xl">{weeklySpecies}</CardTitle>
            <p className="text-sm text-muted-foreground">unique species logged</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">All-time species</p>
              <p className="text-2xl font-semibold tabular-nums">{allTimeSpecies}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily streak (UTC)</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold tabular-nums">{dailyStreak}</p>
                {streakActive ? (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                    <Flame className="mr-1 h-3 w-3" />
                    1.25× active
                  </Badge>
                ) : dailyStreak > 0 ? (
                  <span className="text-xs text-muted-foreground">{5 - dailyStreak} more for 1.25×</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Log today to start</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Weekly diversity</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold tabular-nums">{(diversity.pct * 100).toFixed(0)}%</p>
                {hasDiversityBonus ? (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    1.5× applied
                  </Badge>
                ) : diversityQualified ? (
                  <span className="text-xs text-muted-foreground">Eligible at week end</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Need 15% new</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Weekly / all-time points</p>
              <p className="text-2xl font-semibold tabular-nums">
                {weeklyPoints.toFixed(2)}
                <span className="text-base font-normal text-muted-foreground"> / {allTimePoints.toFixed(2)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <FoodLogPanel />
      </div>

      {overreliance.length ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <CardTitle className="text-lg">Overreliance alert</CardTitle>
              <CardDescription>
                In the last 7 days, these species each represent more than 25% of your log entries by count. Diversity
                loves variety.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overreliance.map((o) => (
              <Badge key={o.speciesId} variant="outline" className="border-amber-500/50">
                {o.name} · {(o.pct * 100).toFixed(0)}% ({o.count}/{total7})
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly leaderboard</CardTitle>
            <CardDescription>Ranked by distinct species this week. You are highlighted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(board as { user_id: string; username: string; weekly_distinct_species: number; weekly_points: number; alltime_points: number }[] | null)?.map(
              (row, idx) => {
                const prof = profileMap[row.user_id];
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      row.user_id === user.id ? "border-primary/50 bg-primary/10" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-muted-foreground">{idx + 1}</span>
                      <UserAvatar
                        username={prof?.username ?? row.username}
                        avatarUrl={prof?.avatar_url}
                        size="sm"
                      />
                      <span className="font-medium">{row.username}</span>
                      {row.user_id === user.id ? (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">{row.weekly_distinct_species}</span> species
                      </div>
                      <div>
                        {Number(row.weekly_points).toFixed(2)} wk pts · {Number(row.alltime_points).toFixed(2)} all-time
                      </div>
                    </div>
                  </div>
                );
              }
            ) ?? <p className="text-sm text-muted-foreground">No leaderboard data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent logs</CardTitle>
            <CardDescription>Last five entries. Remove mistakes with one tap.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentLogs
              initial={
                (recent ?? []).map((r) => ({
                  id: r.id as string,
                  logged_at: r.logged_at as string,
                  points_awarded: Number(r.points_awarded),
                  notes: (r.notes as string | null) ?? null,
                  species: r.species as {
                    common_name: string;
                    latin_name: string | null;
                    category: string;
                  },
                })) ?? []
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
