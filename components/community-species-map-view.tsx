"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { applyViewerGapMode, type SpeciesBubbleNode } from "@/lib/species-bubble";
import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import { Button } from "@/components/ui/button";

export function CommunitySpeciesMapView({
  nodes,
  viewerSpeciesIds,
}: {
  nodes: SpeciesBubbleNode[];
  viewerSpeciesIds: string[];
}) {
  const [showGaps, setShowGaps] = useState(false);
  const viewerSet = useMemo(() => new Set(viewerSpeciesIds), [viewerSpeciesIds]);

  const displayNodes = useMemo(
    () => applyViewerGapMode(nodes, viewerSet, showGaps, false),
    [nodes, viewerSet, showGaps]
  );

  return (
    <SpeciesBubbleMap
      nodes={displayNodes}
      mode="community"
      requireMinNodes={1}
      emptyHint="No species have been logged on Phylo yet."
      overlayControls={
        <>
          <Button variant="secondary" size="sm" asChild className="border bg-background/90 shadow-sm backdrop-blur">
            <Link href="/community">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Community
            </Link>
          </Button>
          {nodes.length > 0 ? (
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
