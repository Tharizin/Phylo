import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";
import { getWeeklyAnalyticsAction } from "@/app/actions/analytics";
import { HistoryPageClient } from "@/components/history-page-client";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: logs, error }, analytics] = await Promise.all([
    supabase
      .from("food_logs")
      .select("id, logged_at, notes, points_awarded, species ( id, common_name, latin_name, category )")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false }),
    getWeeklyAnalyticsAction(user.id),
  ]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">Could not load history: {error.message}</p>
      </div>
    );
  }

  if (!analytics.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">Could not load analytics: {analytics.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Food log history</h1>
        <p className="mt-2 text-muted-foreground">Sort, edit, or delete any entry. Latin names appear in italics.</p>
      </div>
      <HistoryPageClient
        analytics={analytics.data}
        logs={(logs ?? []).map((row) => ({
          id: row.id as string,
          logged_at: row.logged_at as string,
          notes: (row.notes as string | null) ?? null,
          points_awarded: Number(row.points_awarded),
          species: normalizeSpeciesJoin(row.species),
        }))}
      />
    </div>
  );
}
