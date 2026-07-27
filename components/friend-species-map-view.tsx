"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { applyFriendGapMode, type SpeciesBubbleNode } from "@/lib/species-bubble";
import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

export function FriendSpeciesMapView({
  username,
  avatarUrl,
  friendNodes,
  viewerSpeciesIds,
  isSelf,
}: {
  username: string;
  avatarUrl: string | null;
  friendNodes: SpeciesBubbleNode[];
  viewerSpeciesIds: string[];
  isSelf: boolean;
}) {
  const [showGaps, setShowGaps] = useState(false);
  const viewerSet = useMemo(() => new Set(viewerSpeciesIds), [viewerSpeciesIds]);

  const displayNodes = useMemo(
    () => applyFriendGapMode(friendNodes, viewerSet, showGaps && !isSelf),
    [friendNodes, viewerSet, showGaps, isSelf]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="shrink-0 px-2">
            <Link href="/community">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Community
            </Link>
          </Button>
          <UserAvatar username={username} avatarUrl={avatarUrl} size="md" />
          <div>
            <h1 className="text-2xl font-semibold">{isSelf ? "Your species map" : `${username}'s species map`}</h1>
            <p className="text-sm text-muted-foreground">
              {friendNodes.length} unique species logged all-time
            </p>
          </div>
        </div>

        {!isSelf && friendNodes.length > 0 ? (
          <Button
            type="button"
            variant={showGaps ? "default" : "outline"}
            onClick={() => setShowGaps((value) => !value)}
          >
            Show my gaps
          </Button>
        ) : null}
      </div>

      {showGaps && !isSelf ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Highlighted circles are species {username} has logged that you haven&apos;t tried yet. Gray circles are ones you
          both eat.
        </p>
      ) : null}

      <SpeciesBubbleMap
        nodes={displayNodes}
        mode="friend"
        requireMinNodes={1}
        emptyHint={`${username} hasn't logged any species yet.`}
      />
    </div>
  );
}
