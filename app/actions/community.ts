"use server";

import { createClient } from "@/lib/supabase/server";
import { weekStartSundayUtc, weekEndExclusiveUtc } from "@/lib/time";
import type { CommunityUser } from "@/components/community-panel";
import { isSchemaMissingError } from "@/lib/supabase/errors";

export async function getCommunityUsersAction(): Promise<
  { ok: true; users: CommunityUser[]; partial: boolean } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: rpcData, error: rpcErr } = await supabase.rpc("community_user_stats", {
    p_user_id: user.id,
  });

  if (!rpcErr && rpcData) {
    return {
      ok: true,
      partial: false,
      users: (rpcData as Record<string, unknown>[]).map((u) => ({
        user_id: u.user_id as string,
        username: u.username as string,
        avatar_url: (u.avatar_url as string | null) ?? null,
        alltime_species: Number(u.alltime_species),
        weekly_species: Number(u.weekly_species),
        alltime_points: Number(u.alltime_points),
        weekly_points: Number(u.weekly_points),
        friendship_status: u.friendship_status as string,
        friendship_id: (u.friendship_id as string | null) ?? null,
        is_friend: Boolean(u.is_friend),
        is_pending_incoming: Boolean(u.is_pending_incoming),
        is_pending_outgoing: Boolean(u.is_pending_outgoing),
      })),
    };
  }

  if (rpcErr && !isSchemaMissingError(rpcErr.message)) {
    return { ok: false, error: rpcErr.message };
  }

  // Fallback: profiles list + friendships when RPC not deployed yet
  let profiles: { id: string; username: string; avatar_url?: string | null }[] = [];
  const { data: withAvatar, error: avErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .order("username", { ascending: true });

  if (!avErr && withAvatar) {
    profiles = withAvatar as typeof profiles;
  } else {
    const { data: basic, error: basicErr } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username", { ascending: true });
    if (basicErr) return { ok: false, error: basicErr.message };
    profiles = (basic ?? []).map((p) => ({ id: p.id as string, username: p.username as string }));
  }

  const friendships: {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
  }[] = [];
  const { data: friends, error: fErr } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (!fErr && friends) {
    friendships.push(...(friends as typeof friendships));
  }

  const wkStart = weekStartSundayUtc();
  const wkEnd = weekEndExclusiveUtc();
  const { data: ownLogs } = await supabase
    .from("food_logs")
    .select("species_id, points_awarded, logged_at")
    .eq("user_id", user.id);

  let ownWeeklySpecies = 0;
  let ownAlltimeSpecies = 0;
  let ownWeeklyPoints = 0;
  let ownAlltimePoints = 0;

  if (ownLogs?.length) {
    const allSpecies = new Set<string>();
    const weekSpecies = new Set<string>();
    for (const l of ownLogs) {
      allSpecies.add(l.species_id as string);
      ownAlltimePoints += Number(l.points_awarded ?? 0);
      const t = new Date(l.logged_at as string);
      if (t >= wkStart && t < wkEnd) {
        weekSpecies.add(l.species_id as string);
        ownWeeklyPoints += Number(l.points_awarded ?? 0);
      }
    }
    ownAlltimeSpecies = allSpecies.size;
    ownWeeklySpecies = weekSpecies.size;
  }

  const users: CommunityUser[] = profiles.map((p) => {
    const rel = friendships.find(
      (f) =>
        (f.requester_id === user.id && f.addressee_id === p.id) ||
        (f.requester_id === p.id && f.addressee_id === user.id)
    );
    const outgoing = rel?.requester_id === user.id;
    const isSelf = p.id === user.id;

    return {
      user_id: p.id,
      username: p.username,
      avatar_url: p.avatar_url ?? null,
      alltime_species: isSelf ? ownAlltimeSpecies : 0,
      weekly_species: isSelf ? ownWeeklySpecies : 0,
      alltime_points: isSelf ? ownAlltimePoints : 0,
      weekly_points: isSelf ? ownWeeklyPoints : 0,
      friendship_status: rel?.status ?? "none",
      friendship_id: rel?.id ?? null,
      is_friend: rel?.status === "accepted",
      is_pending_incoming: rel?.status === "pending" && !outgoing,
      is_pending_outgoing: rel?.status === "pending" && !!outgoing,
    };
  });

  users.sort((a, b) => {
    if (a.is_friend !== b.is_friend) return a.is_friend ? -1 : 1;
    return a.username.localeCompare(b.username);
  });

  return { ok: true, users, partial: true };
}
