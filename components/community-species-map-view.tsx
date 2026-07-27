"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import { Button } from "@/components/ui/button";
import type { SpeciesBubbleNode } from "@/lib/species-bubble";

export function CommunitySpeciesMapView({ nodes }: { nodes: SpeciesBubbleNode[] }) {
  return (
    <SpeciesBubbleMap
      nodes={nodes}
      mode="community"
      requireMinNodes={1}
      emptyHint="No species have been logged on Phylo yet."
      overlayControls={
        <Button variant="secondary" size="sm" asChild className="border bg-background/90 shadow-sm backdrop-blur">
          <Link href="/community">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Community
          </Link>
        </Button>
      }
    />
  );
}
