"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureDiversityProcessedAction } from "@/app/actions/diversity";
import {
  computePoints,
  streakLengthUtc,
  type PointBreakdown,
  type SpeciesCategory,
} from "@/lib/points";
import { weekStartSundayUtc } from "@/lib/time";
import { isSchemaMissingError } from "@/lib/supabase/errors";

export type LogFoodResult =
  | {
      ok: true;
      points: number;
      breakdown: PointBreakdown;
      speciesCommonName: string;
      speciesLatinName: string | null;
      isFirstEver: boolean;
    }
  | { ok: false; error: string };

export async function logFoodAction(input: {
  speciesId: string;
  notes?: string | null;
  loggedAt?: string;
}): Promise<LogFoodResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: speciesRow, error: spErr } = await supabase
    .from("species")
    .select("common_name, latin_name, category")
    .eq("id", input.speciesId)
    .maybeSingle();
  if (spErr || !speciesRow) return { ok: false, error: "Species not found." };

  const { data: everRows } = await supabase
    .from("food_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("species_id", input.speciesId)
    .limit(1);

  const hadEverLoggedSpecies = !!everRows?.length;

  const weekStart = weekStartSundayUtc();
  const { data: weekSpeciesRows } = await supabase
    .from("food_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("species_id", input.speciesId)
    .gte("logged_at", weekStart.toISOString())
    .limit(1);

  const loggedSpeciesThisWeek = !!weekSpeciesRows?.length;

  const since = new Date(Date.now() - 400 * 86400000);
  const { data: recentLogs } = await supabase
    .from("food_logs")
    .select("logged_at")
    .eq("user_id", user.id)
    .gte("logged_at", since.toISOString());

  const now = new Date();
  const loggedAt = input.loggedAt ? new Date(input.loggedAt) : now;
  const dates = (recentLogs ?? []).map((r) => new Date(r.logged_at as string));
  dates.push(loggedAt);
  const currentStreakDays = streakLengthUtc(dates, loggedAt);

  const breakdown = computePoints({
    hadEverLoggedSpecies,
    loggedSpeciesThisWeek,
    category: speciesRow.category as SpeciesCategory,
    currentStreakDays,
    diversityMultiplier: 1,
  });

  const row = {
    user_id: user.id,
    species_id: input.speciesId,
    notes: input.notes ?? null,
    logged_at: loggedAt.toISOString(),
    base_points: breakdown.basePoints,
    streak_multiplier: breakdown.streakMultiplier,
    diversity_multiplier: 1,
    points_awarded: breakdown.finalPoints,
  };

  let { error } = await supabase.from("food_logs").insert(row);

  if (error && isSchemaMissingError(error.message)) {
    ({ error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      species_id: input.speciesId,
      notes: input.notes ?? null,
      logged_at: loggedAt.toISOString(),
      points_awarded: breakdown.finalPoints,
    }));
  }

  if (error) return { ok: false, error: error.message };

  await ensureDiversityProcessedAction();

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/species");
  revalidatePath("/community");
  return {
    ok: true,
    points: breakdown.finalPoints,
    breakdown,
    speciesCommonName: speciesRow.common_name as string,
    speciesLatinName: (speciesRow.latin_name as string | null) ?? null,
    isFirstEver: breakdown.isFirstEver,
  };
}

export async function deleteFoodLogAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/species");
  return { ok: true };
}

export async function updateFoodLogAction(input: {
  id: string;
  notes?: string | null;
  loggedAt?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const patch: Record<string, unknown> = {};
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.loggedAt) patch.logged_at = new Date(input.loggedAt).toISOString();

  const { error } = await supabase.from("food_logs").update(patch).eq("id", input.id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { ok: true };
}

export async function adminUpdateFoodLogAction(input: {
  id: string;
  userId: string;
  notes?: string | null;
  loggedAt?: string;
  speciesId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false, error: "Forbidden" };

  const patch: Record<string, unknown> = {};
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.loggedAt) patch.logged_at = new Date(input.loggedAt).toISOString();
  if (input.speciesId) patch.species_id = input.speciesId;

  const { error } = await supabase.from("food_logs").update(patch).eq("id", input.id).eq("user_id", input.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminDeleteFoodLogAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false, error: "Forbidden" };

  const { error } = await supabase.from("food_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/history");
  return { ok: true };
}
