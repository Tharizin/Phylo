"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendFriendRequestAction(
  addresseeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (addresseeId === user.id) return { ok: false, error: "You cannot friend yourself." };

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "Already friends." };
    if (existing.requester_id === addresseeId && existing.status === "pending") {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/community");
      return { ok: true };
    }
    return { ok: false, error: "Friend request already pending." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function acceptFriendRequestAction(
  friendshipId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function removeFriendAction(
  friendshipId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}
