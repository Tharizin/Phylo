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
export const COLLISION_PADDING = 3;

const LABEL_FONT_MAX = 11;
const LABEL_FONT_MIN = 7;
const EMOJI_FONT_MAX = 15;
const EMOJI_FONT_MIN = 9;
const LABEL_WIDTH_FACTOR = 0.84;

export type BubbleLabelLayout = {
  text: string;
  fontSize: number;
  emojiFontSize: number;
};

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  return measureCtx;
}

function measureLabelWidth(text: string, fontSize: number, fontWeight = 600): number {
  const ctx = getMeasureContext();
  if (!ctx) return text.length * fontSize * 0.52;
  ctx.font = `${fontWeight} ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  return ctx.measureText(text).width;
}

function truncateLabelToWidth(text: string, maxWidth: number, fontSize: number): string {
  if (measureLabelWidth(text, fontSize) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && measureLabelWidth(`${truncated}…`, fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1).trimEnd();
  }
  return truncated.length < text.length ? `${truncated}…` : truncated;
}

/** Fit a species name inside its bubble at the current zoom level (screen pixels). */
export function fitBubbleLabel(
  commonName: string,
  radius: number,
  zoomScale: number
): BubbleLabelLayout {
  const screenRadius = radius * zoomScale;
  const maxWidth = 2 * screenRadius * LABEL_WIDTH_FACTOR;
  const emojiFontSize = Math.min(
    EMOJI_FONT_MAX,
    Math.max(EMOJI_FONT_MIN, screenRadius * 0.34)
  );

  if (maxWidth <= 0) {
    return { text: "…", fontSize: LABEL_FONT_MIN, emojiFontSize: EMOJI_FONT_MIN };
  }

  for (let fontSize = LABEL_FONT_MAX; fontSize >= LABEL_FONT_MIN; fontSize -= 0.5) {
    if (measureLabelWidth(commonName, fontSize) <= maxWidth) {
      return { text: commonName, fontSize, emojiFontSize };
    }
  }

  return {
    text: truncateLabelToWidth(commonName, maxWidth, LABEL_FONT_MIN),
    fontSize: LABEL_FONT_MIN,
    emojiFontSize,
  };
}

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

export function clusterCentroid(nodes: { x: number; y: number }[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const node of nodes) {
    x += node.x;
    y += node.y;
  }
  return { x: x / nodes.length, y: y / nodes.length };
}

/** @deprecated use clusterCentroid for viewport framing */
export function weightedClusterCenter(nodes: { x: number; y: number; logCount: number }[]): {
  x: number;
  y: number;
} {
  return clusterCentroid(nodes);
}

export type PackedBubbleNode = {
  x: number;
  y: number;
  r: number;
  logCount: number;
};

export type ViewTransform = {
  x: number;
  y: number;
  k: number;
};

/** Fit the packed cluster into the viewport, centered on its geometric centroid. */
export function computeInitialViewTransform(
  nodes: PackedBubbleNode[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 48
): ViewTransform {
  if (nodes.length === 0) {
    return { x: viewportWidth / 2, y: viewportHeight / 2, k: 1 };
  }

  const centroid = clusterCentroid(nodes);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.r);
    maxX = Math.max(maxX, node.x + node.r);
    minY = Math.min(minY, node.y - node.r);
    maxY = Math.max(maxY, node.y + node.r);
  }

  const clusterWidth = Math.max(maxX - minX, 1);
  const clusterHeight = Math.max(maxY - minY, 1);
  const k = Math.min(
    (viewportWidth - padding * 2) / clusterWidth,
    (viewportHeight - padding * 2) / clusterHeight,
    2.2
  );

  return {
    k,
    x: viewportWidth / 2 - centroid.x * k,
    y: viewportHeight / 2 - centroid.y * k,
  };
}
