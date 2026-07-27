"use server";

import { createClient } from "@/lib/supabase/server";
import type { SpeciesBubbleNode } from "@/lib/species-bubble";
import { isSchemaMissingError } from "@/lib/supabase/errors";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";

type UserBubbleRow = {
  species_id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
  user_log_count: number;
  platform_log_count: number;
};

type CommunityBubbleRow = {
  species_id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
  platform_log_count: number;
  unique_users: number;
};

function mapUserRow(row: UserBubbleRow): SpeciesBubbleNode {
  return {
    speciesId: row.species_id,
    commonName: row.common_name,
    latinName: row.latin_name,
    category: row.category,
    logCount: Number(row.user_log_count),
    platformLogCount: Number(row.platform_log_count),
  };
}

function mapCommunityRow(row: CommunityBubbleRow): SpeciesBubbleNode {
  return {
    speciesId: row.species_id,
    commonName: row.common_name,
    latinName: row.latin_name,
    category: row.category,
    logCount: Number(row.platform_log_count),
    platformLogCount: Number(row.platform_log_count),
    uniqueUsers: Number(row.unique_users),
  };
}

async function fallbackUserSpeciesStats(userId: string): Promise<SpeciesBubbleNode[]> {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from("food_logs")
    .select("species_id, species ( id, common_name, latin_name, category )")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const counts = new Map<string, SpeciesBubbleNode>();
  for (const row of logs ?? []) {
    const species = normalizeSpeciesJoin(row.species);
    if (!species?.id) continue;
    const existing = counts.get(species.id);
    if (existing) {
      existing.logCount += 1;
    } else {
      counts.set(species.id, {
        speciesId: species.id,
        commonName: species.common_name,
        latinName: species.latin_name,
        category: species.category,
        logCount: 1,
        platformLogCount: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.logCount - a.logCount || a.commonName.localeCompare(b.commonName));
}

export async function getUserSpeciesBubbleAction(
  userId: string
): Promise<{ ok: true; nodes: SpeciesBubbleNode[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data, error } = await supabase.rpc("user_species_bubble_stats", { p_target_user_id: userId });

  if (error) {
    if (isSchemaMissingError(error.message)) {
      if (userId !== user.id) {
        return { ok: false, error: "Species maps for other users require species_bubble_stats.sql in Supabase." };
      }
      try {
        const nodes = await fallbackUserSpeciesStats(userId);
        return { ok: true, nodes };
      } catch (fallbackErr) {
        return { ok: false, error: fallbackErr instanceof Error ? fallbackErr.message : "Failed to load species map." };
      }
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, nodes: ((data ?? []) as UserBubbleRow[]).map(mapUserRow) };
}

export async function getViewerSpeciesIdsAction(): Promise<
  { ok: true; speciesIds: string[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data, error } = await supabase.from("food_logs").select("species_id").eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  const ids = Array.from(new Set((data ?? []).map((row) => row.species_id as string)));
  return { ok: true, speciesIds: ids };
}

export async function getCommunitySpeciesBubbleAction(): Promise<
  { ok: true; nodes: SpeciesBubbleNode[]; totalUniqueSpecies: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const [statsRes, totalRes] = await Promise.all([
    supabase.rpc("community_species_bubble_stats"),
    supabase.rpc("community_unique_species_total"),
  ]);

  if (statsRes.error) {
    if (isSchemaMissingError(statsRes.error.message)) {
      return { ok: false, error: "Run supabase/species_bubble_stats.sql in Supabase to enable the community map." };
    }
    return { ok: false, error: statsRes.error.message };
  }

  const totalUniqueSpecies = totalRes.error ? (statsRes.data?.length ?? 0) : Number(totalRes.data ?? 0);

  return {
    ok: true,
    totalUniqueSpecies,
    nodes: ((statsRes.data ?? []) as CommunityBubbleRow[]).map(mapCommunityRow),
  };
}

export async function getCommunitySpeciesTotalAction(): Promise<
  { ok: true; total: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data, error } = await supabase.rpc("community_unique_species_total");
  if (error) {
    if (isSchemaMissingError(error.message)) return { ok: true, total: 0 };
    return { ok: false, error: error.message };
  }

  return { ok: true, total: Number(data ?? 0) };
}

export async function getCommunityProfileAction(userId: string): Promise<
  | { ok: true; username: string; avatarUrl: string | null; isSelf: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data, error } = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "User not found." };

  return {
    ok: true,
    username: data.username as string,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    isSelf: userId === user.id,
  };
}
