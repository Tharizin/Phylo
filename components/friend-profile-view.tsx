"use client";

import { FriendWeeklyComparisonPanel } from "@/components/weekly-analytics-charts";
import { FriendSpeciesMapView } from "@/components/friend-species-map-view";
import type { SpeciesBubbleNode } from "@/lib/species-bubble";
import type { WeeklyAnalyticsData } from "@/app/actions/analytics";

export function FriendProfileView({
  username,
  avatarUrl,
  friendNodes,
  viewerSpeciesIds,
  isSelf,
  isFriend,
  viewerAnalytics,
  friendAnalytics,
}: {
  username: string;
  avatarUrl: string | null;
  friendNodes: SpeciesBubbleNode[];
  viewerSpeciesIds: string[];
  isSelf: boolean;
  isFriend: boolean;
  viewerAnalytics: WeeklyAnalyticsData | null;
  friendAnalytics: WeeklyAnalyticsData | null;
}) {
  return (
    <div className="relative">
      <FriendSpeciesMapView
        username={username}
        avatarUrl={avatarUrl}
        friendNodes={friendNodes}
        viewerSpeciesIds={viewerSpeciesIds}
        isSelf={isSelf}
      />
      {isFriend && !isSelf && viewerAnalytics && friendAnalytics ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-3">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <FriendWeeklyComparisonPanel
              viewer={viewerAnalytics}
              friend={friendAnalytics}
              friendName={username}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
