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
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-destructive">Could not load species map: {result.error}</p>
      </div>
    );
  }

  return <PersonalSpeciesMap nodes={result.nodes} />;
}
