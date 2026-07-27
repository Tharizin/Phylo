"use client";

import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import type { SpeciesBubbleNode } from "@/lib/species-bubble";

export function PersonalSpeciesMap({ nodes }: { nodes: SpeciesBubbleNode[] }) {
  return (
    <SpeciesBubbleMap
      nodes={nodes}
      mode="personal"
      requireMinNodes={3}
      emptyHint="Log at least three different species to see your personal bubble map come to life."
    />
  );
}
