import { redirect } from "next/navigation";
import { getCommunitySpeciesBubbleAction, getViewerSpeciesIdsAction } from "@/app/actions/species-map";
import { CommunitySpeciesMapView } from "@/components/community-species-map-view";

export default async function CommunityExplorePage() {
  const [result, viewerRes] = await Promise.all([
    getCommunitySpeciesBubbleAction(),
    getViewerSpeciesIdsAction(),
  ]);

  if (!result.ok) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="max-w-md text-center text-destructive">{result.error}</p>
      </div>
    );
  }

  if (!viewerRes.ok) redirect("/login");

  return (
    <CommunitySpeciesMapView
      nodes={result.nodes}
      viewerSpeciesIds={viewerRes.speciesIds}
    />
  );
}
