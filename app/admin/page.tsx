import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";
import { resolveIsAdmin } from "@/lib/admin";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("profiles").select("username, is_admin").eq("id", user.id).single();
  if (!prof || !resolveIsAdmin(prof as { username: string; is_admin: boolean })) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="mt-3 text-muted-foreground">
          Ask a database maintainer to run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">
            {`update public.profiles set is_admin = true where lower(username) = 'tharizin';`}
          </code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const { data: logs, error: logErr } = await supabase
    .from("food_logs")
    .select("id, user_id, logged_at, notes, points_awarded, species_id, species ( id, common_name, latin_name, category )")
    .order("logged_at", { ascending: false })
    .limit(200);

  if (logErr) {
    return (
      <div className="p-10">
        <p className="text-destructive">Failed to load logs: {logErr.message}</p>
      </div>
    );
  }

  const { data: species, error: spErr } = await supabase.from("species").select("*").order("common_name", { ascending: true });

  if (spErr) {
    return (
      <div className="p-10">
        <p className="text-destructive">Failed to load species: {spErr.message}</p>
      </div>
    );
  }

  const { data: speciesSuggestions } = await supabase
    .from("species_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: aliasSuggestionsRaw } = await supabase
    .from("alias_suggestions")
    .select("*, species ( common_name, latin_name )")
    .order("created_at", { ascending: false });

  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("is_admin", true)
    .order("username", { ascending: true });

  const logUserIds = (logs ?? []).map((l) => l.user_id as string);
  const suggestionUserIds = (speciesSuggestions ?? []).map((s) => s.submitted_by as string);
  const aliasUserIds = (aliasSuggestionsRaw ?? []).map((s) => s.submitted_by as string);
  const userIds = Array.from(new Set([...logUserIds, ...suggestionUserIds, ...aliasUserIds]));

  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, username").in("id", userIds)
    : { data: [] as { id: string; username: string }[] };

  const profileMap: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id as string, p.username as string])
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Review species contributions, manage admins, merge duplicates, edit catalog entries, and moderate food logs.
        </p>
      </div>
      <AdminPanel
        logs={(logs ?? []).map((row) => ({
          id: row.id as string,
          user_id: row.user_id as string,
          species_id: row.species_id as string,
          logged_at: row.logged_at as string,
          notes: (row.notes as string | null) ?? null,
          points_awarded: Number(row.points_awarded),
          species: normalizeSpeciesJoin(row.species),
        }))}
        profileMap={profileMap}
        species={(species ?? []).map((s) => ({
          id: s.id as string,
          common_name: s.common_name as string,
          latin_name: (s.latin_name as string | null) ?? null,
          category: s.category as string,
        }))}
        speciesSuggestions={(speciesSuggestions ?? []).map((s) => ({
          id: s.id as string,
          submitted_by: s.submitted_by as string,
          common_name: s.common_name as string,
          latin_name: (s.latin_name as string | null) ?? null,
          category: s.category as string,
          alternative_names: (s.alternative_names as string[] | null) ?? [],
          notes: (s.notes as string | null) ?? null,
          status: s.status as string,
          reviewer_notes: (s.reviewer_notes as string | null) ?? null,
          created_at: s.created_at as string,
          reviewed_at: (s.reviewed_at as string | null) ?? null,
        }))}
        aliasSuggestions={(aliasSuggestionsRaw ?? []).map((s) => ({
          id: s.id as string,
          submitted_by: s.submitted_by as string,
          species_id: s.species_id as string,
          suggested_alias: s.suggested_alias as string,
          status: s.status as string,
          reviewer_notes: (s.reviewer_notes as string | null) ?? null,
          created_at: s.created_at as string,
          reviewed_at: (s.reviewed_at as string | null) ?? null,
          species: normalizeSpeciesJoin(s.species) as { common_name: string; latin_name: string | null },
        }))}
        admins={(adminProfiles ?? []).map((p) => ({
          id: p.id as string,
          username: p.username as string,
          is_admin: true,
        }))}
      />
    </div>
  );
}
