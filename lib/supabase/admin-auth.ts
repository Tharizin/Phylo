import type { createClient } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/admin";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function requireAdminProfile(supabase: ServerClient, userId: string) {
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("id", userId)
    .single();

  if (error || !prof || !resolveIsAdmin(prof as { username: string; is_admin: boolean })) {
    return null;
  }

  return prof as { id: string; username: string; is_admin: boolean };
}
