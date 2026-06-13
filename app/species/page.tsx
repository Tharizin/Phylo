import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";
import { AllTimeSpeciesTable } from "@/components/all-time-species-table";

export default async function SpeciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logs, error } = await supabase
    .from("food_logs")
    .select("species_id, species ( id, common_name, latin_name, category )")
    .eq("user_id", user.id);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">Could not load species: {error.message}</p>
      </div>
    );
  }

  const counts = new Map<
    string,
    { log_count: number; common_name: string; latin_name: string | null; category: string }
  >();

  for (const row of logs ?? []) {
    const sid = row.species_id as string;
    const sp = normalizeSpeciesJoin(row.species);
    const prev = counts.get(sid);
    counts.set(sid, {
      log_count: (prev?.log_count ?? 0) + 1,
      common_name: sp.common_name,
      latin_name: sp.latin_name,
      category: sp.category,
    });
  }

  const rows = Array.from(counts.entries()).map(([species_id, v]) => ({
    species_id,
    log_count: v.log_count,
    common_name: v.common_name,
    latin_name: v.latin_name,
    category: v.category,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">All-time species</h1>
        <p className="mt-2 text-muted-foreground">
          Every unique species you&apos;ve logged, with how many times each appears in your history.
        </p>
      </div>
      <AllTimeSpeciesTable initial={rows} />
    </div>
  );
}
