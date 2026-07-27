"use client";

import { Info } from "lucide-react";
import {
  CANVAS_SCALE,
  COLLISION_PADDING,
  categoryEmoji,
  readBubbleColorPalette,
  resolveBubbleColors,
  weightedClusterCenter,
  bubbleRadius,
  type BubbleColorPalette,
  type SpeciesBubbleMode,
  type SpeciesBubbleNode,
} from "@/lib/species-bubble";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MAP_HELP: Record<SpeciesBubbleMode, string[]> = {
  personal: [
    "Circle size reflects how often you've logged that species.",
    "Favorites cluster toward the center; pan and zoom to explore the full map.",
    "Colors match category: plant, animal, and fungus.",
  ],
  community: [
    "Circle size reflects total logs across all Phylo users.",
    "Pan and zoom to explore — the map extends beyond the screen.",
    "Hover a bubble for platform-wide stats.",
  ],
  friend: [
    "Circle size reflects how often this user has logged each species.",
    "Turn on “Show my gaps” to highlight foods they've tried that you haven't.",
    "Gray bubbles are species you both eat.",
  ],
};

function MapInfoButton({ mode }: { mode: SpeciesBubbleMode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full border bg-background/90 shadow-sm backdrop-blur"
          aria-label="How this map works"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        <p className="mb-2 font-medium">How this map works</p>
        <ul className="space-y-1.5 text-muted-foreground">
          {MAP_HELP[mode].map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-primary">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Drag to pan · Scroll or pinch to zoom</p>
      </PopoverContent>
    </Popover>
  );
}

export { MapInfoButton };
