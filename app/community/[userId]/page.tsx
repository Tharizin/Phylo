import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCommunityProfileAction,
  getUserSpeciesBubbleAction,
  getViewerSpeciesIdsAction,
} from "@/app/actions/species-map";
import { getFriendshipStatusAction, getWeeklyAnalyticsAction } from "@/app/actions/analytics";
import { FriendProfileView } from "@/components/friend-profile-view";

export default async function CommunityUserPage({ params }: { params: { userId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const friendship = await getFriendshipStatusAction(params.userId);
  if (!friendship.ok) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-destructive">{friendship.error}</p>
      </div>
    );
  }

  const profile = await getCommunityProfileAction(params.userId);
  if (!profile.ok) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-destructive">{profile.error}</p>
      </div>
    );
  }

  const [bubbleRes, viewerRes, viewerAnalytics, friendAnalytics] = await Promise.all([
    getUserSpeciesBubbleAction(params.userId),
    profile.isSelf ? Promise.resolve({ ok: true as const, speciesIds: [] as string[] }) : getViewerSpeciesIdsAction(),
    getWeeklyAnalyticsAction(user.id),
    friendship.isFriend && !profile.isSelf
      ? getWeeklyAnalyticsAction(params.userId)
      : Promise.resolve(null),
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
    <FriendProfileView
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      friendNodes={bubbleRes.nodes}
      viewerSpeciesIds={viewerRes.ok ? viewerRes.speciesIds : []}
      isSelf={profile.isSelf}
      isFriend={friendship.isFriend}
      viewerAnalytics={viewerAnalytics.ok ? viewerAnalytics.data : null}
      friendAnalytics={friendAnalytics && friendAnalytics.ok ? friendAnalytics.data : null}
    />
  );
}
