import { redirect } from "next/navigation";
import {
  getCommunityProfileAction,
  getUserSpeciesBubbleAction,
  getViewerSpeciesIdsAction,
} from "@/app/actions/species-map";
import { FriendSpeciesMapView } from "@/components/friend-species-map-view";

export default async function CommunityUserPage({ params }: { params: { userId: string } }) {
  const profile = await getCommunityProfileAction(params.userId);
  if (!profile.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">{profile.error}</p>
      </div>
    );
  }

  const [bubbleRes, viewerRes] = await Promise.all([
    getUserSpeciesBubbleAction(params.userId),
    profile.isSelf ? Promise.resolve({ ok: true as const, speciesIds: [] as string[] }) : getViewerSpeciesIdsAction(),
  ]);

  if (!bubbleRes.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">{bubbleRes.error}</p>
      </div>
    );
  }

  if (!profile.isSelf && !viewerRes.ok) redirect("/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <FriendSpeciesMapView
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        friendNodes={bubbleRes.nodes}
        viewerSpeciesIds={viewerRes.ok ? viewerRes.speciesIds : []}
        isSelf={profile.isSelf}
      />
    </div>
  );
}
