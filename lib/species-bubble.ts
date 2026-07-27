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

export type CategoryBubbleColors = {
  fill: string;
  stroke: string;
};

export type BubbleColorPalette = {
  plant: CategoryBubbleColors;
  animal: CategoryBubbleColors;
  fungus: CategoryBubbleColors;
  other: CategoryBubbleColors;
  muted: CategoryBubbleColors;
  gapRing: string;
};

export const CANVAS_SCALE = 3;
export const COLLISION_PADDING = 8;

const CSS_VAR_MAP: Record<string, { fill: string; stroke: string }> = {
  plant: { fill: "--bubble-plant-fill", stroke: "--bubble-plant-stroke" },
  animal: { fill: "--bubble-animal-fill", stroke: "--bubble-animal-stroke" },
  fungus: { fill: "--bubble-fungus-fill", stroke: "--bubble-fungus-stroke" },
  other: { fill: "--bubble-other-fill", stroke: "--bubble-other-stroke" },
};

export function readBubbleColorPalette(): BubbleColorPalette {
  if (typeof window === "undefined") {
    return fallbackPalette();
  }

  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const raw = style.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : "hsl(var(--muted))";
  };

  const build = (key: keyof typeof CSS_VAR_MAP): CategoryBubbleColors => ({
    fill: read(CSS_VAR_MAP[key].fill),
    stroke: read(CSS_VAR_MAP[key].stroke),
  });

  return {
    plant: build("plant"),
    animal: build("animal"),
    fungus: build("fungus"),
    other: build("other"),
    muted: {
      fill: read("--bubble-muted-fill"),
      stroke: read("--bubble-muted-stroke"),
    },
    gapRing: read("--bubble-gap-ring"),
  };
}

function fallbackPalette(): BubbleColorPalette {
  return {
    plant: { fill: "hsl(160 84% 39% / 0.28)", stroke: "hsl(160 84% 39% / 0.62)" },
    animal: { fill: "hsl(32 95% 44% / 0.28)", stroke: "hsl(32 95% 44% / 0.62)" },
    fungus: { fill: "hsl(258 90% 66% / 0.28)", stroke: "hsl(258 90% 66% / 0.62)" },
    other: { fill: "hsl(215 16% 47% / 0.24)", stroke: "hsl(215 16% 47% / 0.5)" },
    muted: { fill: "hsl(var(--muted))", stroke: "hsl(var(--muted-foreground))" },
    gapRing: "hsl(var(--primary))",
  };
}

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

export function resolveBubbleColors(
  palette: BubbleColorPalette,
  category: string,
  muted = false,
  gapHighlight = false
): CategoryBubbleColors & { ring?: string; strokeWidth: number; fillOpacity: number } {
  if (muted) {
    return {
      ...palette.muted,
      strokeWidth: 2,
      fillOpacity: 0.5,
    };
  }

  const categoryKey =
    category === "plant" || category === "animal" || category === "fungus"
      ? category
      : "other";
  const base = palette[categoryKey];

  return {
    ...base,
    ring: gapHighlight ? palette.gapRing : undefined,
    strokeWidth: gapHighlight ? 3.5 : 2,
    fillOpacity: 0.95,
  };
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

export function weightedClusterCenter(nodes: { x: number; y: number; logCount: number }[]): {
  x: number;
  y: number;
} {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let total = 0;
  let x = 0;
  let y = 0;
  for (const node of nodes) {
    const w = Math.max(node.logCount, 1);
    total += w;
    x += node.x * w;
    y += node.y * w;
  }
  return { x: x / total, y: y / total };
}
