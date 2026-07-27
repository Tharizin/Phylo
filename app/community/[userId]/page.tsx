import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
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
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-destructive">{bubbleRes.error}</p>
      </div>
    );
  }

  if (!profile.isSelf && !viewerRes.ok) redirect("/login");

  return (
    <FriendSpeciesMapView
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      friendNodes={bubbleRes.nodes}
      viewerSpeciesIds={viewerRes.ok ? viewerRes.speciesIds : []}
      isSelf={profile.isSelf}
    />
  );
}
