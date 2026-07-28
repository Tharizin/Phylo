"use server";

import { createClient } from "@/lib/supabase/server";
import { logsPerDayThisWeek, newSpeciesPerDayThisWeek, type WeeklyChartPoint } from "@/lib/weekly-analytics";
import { weekEndExclusiveUtc, weekStartSundayUtc } from "@/lib/time";

export type WeeklyAnalyticsData = {
  logsPerDay: WeeklyChartPoint[];
  newSpeciesPerDay: WeeklyChartPoint[];
};

export async function getWeeklyAnalyticsAction(
  userId: string
): Promise<{ ok: true; data: WeeklyAnalyticsData } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (userId !== user.id) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) return { ok: false, error: "Unauthorized" };
  }

  const wkStart = weekStartSundayUtc();
  const wkEnd = weekEndExclusiveUtc();

  const { data, error } = await supabase
    .from("food_logs")
    .select("logged_at, species_id")
    .eq("user_id", userId)
    .gte("logged_at", wkStart.toISOString())
    .lt("logged_at", wkEnd.toISOString())
    .order("logged_at", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const logs = (data ?? []).map((row) => ({
    logged_at: row.logged_at as string,
    species_id: row.species_id as string,
  }));

  return {
    ok: true,
    data: {
      logsPerDay: logsPerDayThisWeek(logs),
      newSpeciesPerDay: newSpeciesPerDayThisWeek(logs),
    },
  };
}

export async function getFriendshipStatusAction(
  userId: string
): Promise<
  | { ok: true; isSelf: boolean; isFriend: boolean; username: string; avatarUrl: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile) return { ok: false, error: "User not found." };

  if (userId === user.id) {
    return {
      ok: true,
      isSelf: true,
      isFriend: false,
      username: profile.username as string,
      avatarUrl: (profile.avatar_url as string | null) ?? null,
    };
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
    )
    .eq("status", "accepted")
    .maybeSingle();

  return {
    ok: true,
    isSelf: false,
    isFriend: Boolean(friendship),
    username: profile.username as string,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
  };
}
