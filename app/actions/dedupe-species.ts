"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/supabase/admin-auth";
import {
  buildDedupePlan,
  mergedAliases,
  type DedupePlan,
} from "@/lib/species-dedupe";

async function requireAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized", supabase: null };

  const prof = await requireAdminProfile(supabase, user.id);
  if (!prof) return { ok: false as const, error: "Forbidden", supabase: null };

  return { ok: true as const, supabase };
}

async function loadSpeciesContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: species, error } = await supabase
    .from("species")
    .select("id, common_name, latin_name, category, alternative_names")
    .order("common_name", { ascending: true });

  if (error) return { ok: false as const, error: error.message };

  const rows = (species ?? []).map((row) => ({
    id: row.id as string,
    common_name: row.common_name as string,
    latin_name: (row.latin_name as string | null) ?? null,
    category: row.category as string,
    alternative_names: (row.alternative_names as string[] | null) ?? [],
  }));

  const { data: logs, error: logErr } = await supabase.from("food_logs").select("species_id");
  if (logErr) return { ok: false as const, error: logErr.message };

  const logCounts: Record<string, number> = {};
  for (const row of logs ?? []) {
    const id = row.species_id as string;
    logCounts[id] = (logCounts[id] ?? 0) + 1;
  }

  return { ok: true as const, rows, logCounts };
}

export async function previewSpeciesDedupeAction(): Promise<
  { ok: true; plan: DedupePlan } | { ok: false; error: string }
> {
  const auth = await requireAdminSupabase();
  if (!auth.ok) return { ok: false, error: auth.error };

  const loaded = await loadSpeciesContext(auth.supabase);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  return { ok: true, plan: buildDedupePlan(loaded.rows, loaded.logCounts) };
}

export async function runSpeciesDedupeAction(): Promise<
  | { ok: true; aliasUpdates: number; merges: number; details: string[] }
  | { ok: false; error: string }
> {
  const auth = await requireAdminSupabase();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const loaded = await loadSpeciesContext(supabase);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const plan = buildDedupePlan(loaded.rows, loaded.logCounts);
  const details: string[] = [];
  let aliasUpdates = 0;
  let merges = 0;

  for (const update of plan.aliasUpdates) {
    const { error } = await supabase
      .from("species")
      .update({ alternative_names: update.after })
      .eq("id", update.id);
    if (error) return { ok: false, error: `Alias update failed for ${update.common_name}: ${error.message}` };
    aliasUpdates += 1;
    if (update.before.length !== update.after.length) {
      details.push(
        `${update.common_name}: aliases ${update.before.length} → ${update.after.length} (${update.before.join(", ")} → ${update.after.join(", ")})`
      );
    }
  }

  const keeperGroups = new Map<string, typeof plan.merges>();
  for (const item of plan.merges) {
    const list = keeperGroups.get(item.keeper.id) ?? [];
    list.push(item);
    keeperGroups.set(item.keeper.id, list);
  }

  for (const mergeList of Array.from(keeperGroups.values())) {
    let runningAliases = mergeList[0].keeper.alternative_names;

    for (const merge of mergeList) {
      runningAliases = mergedAliases({ ...merge.keeper, alternative_names: runningAliases }, [merge.drop]);

      const { error: logErr } = await supabase
        .from("food_logs")
        .update({ species_id: merge.keeper.id })
        .eq("species_id", merge.drop.id);
      if (logErr) {
        return { ok: false, error: `Merge log reassignment failed for ${merge.drop.common_name}: ${logErr.message}` };
      }

      const { error: deleteErr } = await supabase.from("species").delete().eq("id", merge.drop.id);
      if (deleteErr) {
        return { ok: false, error: `Merge delete failed for ${merge.drop.common_name}: ${deleteErr.message}` };
      }

      merges += 1;
      details.push(
        `Merged duplicate ${merge.drop.common_name} (${merge.drop.latin_name ?? "no latin"}) into ${merge.keeper.common_name} (${merge.keeper.latin_name ?? "no latin"}) — ${merge.reason}`
      );
    }

    const { error: aliasErr } = await supabase
      .from("species")
      .update({ alternative_names: runningAliases })
      .eq("id", mergeList[0].keeper.id);
    if (aliasErr) {
      return {
        ok: false,
        error: `Merge alias update failed for ${mergeList[0].keeper.common_name}: ${aliasErr.message}`,
      };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/species");
  revalidatePath("/history");

  return { ok: true, aliasUpdates, merges, details };
}
