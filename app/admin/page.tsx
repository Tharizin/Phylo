import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="mt-3 text-muted-foreground">
          Ask a database maintainer to run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">
            {`update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';`}
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

  const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id as string)));
  const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);

  const { data: species, error: spErr } = await supabase.from("species").select("*").order("common_name", { ascending: true });

  if (spErr) {
    return (
      <div className="p-10">
        <p className="text-destructive">Failed to load species: {spErr.message}</p>
      </div>
    );
  }

  const profileMap: Record<string, string> = Object.fromEntries((profiles ?? []).map((p) => [p.id as string, p.username as string]));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-2 text-muted-foreground">Merge duplicate species, edit catalog entries, and moderate food logs.</p>
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
      />
    </div>
  );
}
