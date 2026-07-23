"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isProtectedAdminUsername, resolveIsAdmin } from "@/lib/admin";
import { requireAdminProfile } from "@/lib/supabase/admin-auth";

export async function getPendingSuggestionCountAction(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const prof = await requireAdminProfile(supabase, user.id);
  if (!prof) return { ok: true, count: 0 };

  const [speciesRes, aliasRes] = await Promise.all([
    supabase.from("species_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("alias_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const count = (speciesRes.count ?? 0) + (aliasRes.count ?? 0);
  return { ok: true, count };
}

export type AdminProfileRow = {
  id: string;
  username: string;
  is_admin: boolean;
};

export async function listAdminsAction(): Promise<
  { ok: true; admins: AdminProfileRow[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (!(await requireAdminProfile(supabase, user.id))) {
    return { ok: false, error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("is_admin", true)
    .order("username", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const admins = (data ?? []).map((row) => ({
    id: row.id as string,
    username: row.username as string,
    is_admin: true as boolean,
  }));

  const tharizin = admins.find((a) => isProtectedAdminUsername(a.username));
  if (!tharizin) {
    const { data: superAdmin } = await supabase
      .from("profiles")
      .select("id, username, is_admin")
      .ilike("username", "tharizin")
      .maybeSingle();
    if (superAdmin) {
      admins.unshift({
        id: superAdmin.id as string,
        username: superAdmin.username as string,
        is_admin: true,
      });
    }
  }

  const seen = new Set<string>();
  const unique = admins.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  return { ok: true, admins: unique };
}

export async function searchUsersByUsernameAction(
  query: string
): Promise<{ ok: true; users: AdminProfileRow[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (!(await requireAdminProfile(supabase, user.id))) {
    return { ok: false, error: "Forbidden" };
  }

  const term = query.trim();
  if (!term) return { ok: true, users: [] };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .ilike("username", `%${term}%`)
    .order("username", { ascending: true })
    .limit(12);

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    users: (data ?? []).map((row) => ({
      id: row.id as string,
      username: row.username as string,
      is_admin: !!row.is_admin,
    })),
  };
}

export async function grantAdminAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (!(await requireAdminProfile(supabase, user.id))) {
    return { ok: false, error: "Forbidden" };
  }

  const { data: target, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!target) return { ok: false, error: "User not found." };
  if (target.is_admin) return { ok: true };

  const { error } = await supabase.from("profiles").update({ is_admin: true }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function revokeAdminAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (!(await requireAdminProfile(supabase, user.id))) {
    return { ok: false, error: "Forbidden" };
  }

  const { data: target, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!target) return { ok: false, error: "User not found." };
  if (isProtectedAdminUsername(target.username as string)) {
    return { ok: false, error: "This admin account cannot be revoked." };
  }

  const { error } = await supabase.from("profiles").update({ is_admin: false }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function checkCurrentUserIsAdminAction(): Promise<{ ok: true; isAdmin: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true, isAdmin: false };

  const { data: prof } = await supabase.from("profiles").select("username, is_admin").eq("id", user.id).maybeSingle();
  if (!prof) return { ok: true, isAdmin: false };

  return { ok: true, isAdmin: resolveIsAdmin(prof as { username: string; is_admin: boolean }) };
}
