"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { applyFriendGapMode, type SpeciesBubbleNode } from "@/lib/species-bubble";
import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import { Button } from "@/components/ui/button";

export function FriendSpeciesMapView({
  username,
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
    <SpeciesBubbleMap
      nodes={displayNodes}
      mode="friend"
      requireMinNodes={1}
      emptyHint={`${username} hasn't logged any species yet.`}
      overlayControls={
        <>
          <Button variant="secondary" size="sm" asChild className="border bg-background/90 shadow-sm backdrop-blur">
            <Link href="/community">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Community
            </Link>
          </Button>
          {!isSelf && friendNodes.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant={showGaps ? "default" : "secondary"}
              className={showGaps ? undefined : "border bg-background/90 shadow-sm backdrop-blur"}
              onClick={() => setShowGaps((value) => !value)}
            >
              Show my gaps
            </Button>
          ) : null}
        </>
      }
    />
  );
}
