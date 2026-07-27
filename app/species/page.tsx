import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSpeciesBubbleAction } from "@/app/actions/species-map";
import { PersonalSpeciesMap } from "@/components/personal-species-map";

export default async function SpeciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getUserSpeciesBubbleAction(user.id);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">Could not load species map: {result.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Your species map</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every species you&apos;ve logged, sized by how often you eat them. Favorites cluster toward the center — drag to
          pan and scroll to zoom.
        </p>
      </div>
      <PersonalSpeciesMap nodes={result.nodes} />
    </div>
  );
}
