export type SpeciesBubbleNode = {
  speciesId: string;
  commonName: string;
  latinName: string | null;
  category: string;
  logCount: number;
  platformLogCount?: number;
  uniqueUsers?: number;
  /** Friend gap mode: viewer has never logged this species */
  gapHighlight?: boolean;
  /** Friend gap mode: viewer has also logged this species */
  gapMuted?: boolean;
};

export type SpeciesBubbleMode = "personal" | "community" | "friend";

export function categoryEmoji(category: string): string {
  switch (category) {
    case "plant":
      return "🌿";
    case "animal":
      return "🐔";
    case "fungus":
      return "🍄";
    default:
      return "•";
  }
}

export function categoryFill(category: string, muted = false): string {
  if (muted) return "#94a3b8";
  switch (category) {
    case "plant":
      return "#4ade80";
    case "animal":
      return "#d4a574";
    case "fungus":
      return "#c084fc";
    default:
      return "#94a3b8";
  }
}

export function categoryStroke(category: string, muted = false): string {
  if (muted) return "#64748b";
  switch (category) {
    case "plant":
      return "#16a34a";
    case "animal":
      return "#b45309";
    case "fungus":
      return "#9333ea";
    default:
      return "#64748b";
  }
}

export function bubbleRadius(logCount: number, minCount: number, maxCount: number): number {
  const minR = 26;
  const maxR = 78;
  if (maxCount <= minCount) return (minR + maxR) / 2;
  const t = (logCount - minCount) / (maxCount - minCount);
  return minR + t * (maxR - minR);
}

export function applyFriendGapMode(
  friendNodes: SpeciesBubbleNode[],
  viewerSpeciesIds: Set<string>,
  showGaps: boolean
): SpeciesBubbleNode[] {
  if (!showGaps) {
    return friendNodes.map((node) => ({ ...node, gapHighlight: false, gapMuted: false }));
  }
  return friendNodes.map((node) => ({
    ...node,
    gapHighlight: !viewerSpeciesIds.has(node.speciesId),
    gapMuted: viewerSpeciesIds.has(node.speciesId),
  }));
}
