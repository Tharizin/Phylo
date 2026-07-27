"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  bubbleRadius,
  categoryEmoji,
  categoryFill,
  categoryStroke,
  type SpeciesBubbleMode,
  type SpeciesBubbleNode,
} from "@/lib/species-bubble";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SimNode = SpeciesBubbleNode & {
  x: number;
  y: number;
  r: number;
};

type TooltipState = {
  node: SpeciesBubbleNode;
  x: number;
  y: number;
};

export function SpeciesBubbleMap({
  nodes,
  mode,
  loading = false,
  className,
  requireMinNodes = 3,
  emptyHint,
}: {
  nodes: SpeciesBubbleNode[];
  mode: SpeciesBubbleMode;
  loading?: boolean;
  className?: string;
  requireMinNodes?: number;
  emptyHint?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);

  const counts = useMemo(() => nodes.map((n) => n.logCount), [nodes]);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(420, entry.contentRect.height),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loading || nodes.length < requireMinNodes) {
      setSimNodes([]);
      return;
    }

    const width = size.width;
    const height = size.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadial = Math.min(width, height) * 0.42;

    const prepared: SimNode[] = nodes.map((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      const r = bubbleRadius(node.logCount, minCount, maxCount);
      return {
        ...node,
        r,
        x: centerX + Math.cos(angle) * maxRadial * 0.35,
        y: centerY + Math.sin(angle) * maxRadial * 0.35,
      };
    });

    const maxLog = Math.max(...prepared.map((n) => n.logCount), 1);

    const simulation = d3
      .forceSimulation(prepared)
      .force(
        "collide",
        d3.forceCollide<SimNode>((d) => d.r + 4).iterations(3)
      )
      .force(
        "radial",
        d3
          .forceRadial<SimNode>(
            (d) => {
              const t = d.logCount / maxLog;
              return maxRadial * (0.25 + (1 - t) * 0.75);
            },
            centerX,
            centerY
          )
          .strength(0.85)
      )
      .force("charge", d3.forceManyBody().strength(-18))
      .stop();

    for (let i = 0; i < 240; i += 1) simulation.tick();

    prepared.forEach((node) => {
      node.x = Math.max(node.r + 8, Math.min(width - node.r - 8, node.x));
      node.y = Math.max(node.r + 8, Math.min(height - node.r - 8, node.y));
    });

    setSimNodes([...prepared]);
  }, [loading, nodes, size.width, size.height, minCount, maxCount, requireMinNodes]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current || loading || simNodes.length < requireMinNodes) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 3.5])
      .on("zoom", (event) => {
        svg.select("g.map-layer").attr("transform", event.transform.toString());
      });

    svg.call(zoom as never);
    return () => {
      svg.on(".zoom", null);
    };
  }, [loading, simNodes, requireMinNodes]);

  if (loading) {
    return (
      <div className={cn("flex h-[70vh] min-h-[420px] flex-col gap-3", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }

  if (nodes.length < requireMinNodes) {
    return (
      <div
        className={cn(
          "flex h-[70vh] min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center",
          className
        )}
      >
        <div className="max-w-md space-y-2">
          <p className="text-lg font-medium">
            {requireMinNodes >= 3 ? "Your map is just getting started" : "Nothing to map yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {emptyHint ??
              (requireMinNodes >= 3
                ? "Log at least three different species to see your personal bubble map come to life."
                : "No species data is available yet.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative h-[70vh] min-h-[420px] w-full", className)}>
      <svg ref={svgRef} width={size.width} height={size.height} className="touch-none select-none rounded-xl border bg-muted/10">
        <rect width={size.width} height={size.height} fill="transparent" />
        <g className="map-layer">
          {simNodes.map((node) => {
            const muted = node.gapMuted ?? false;
            const label = node.commonName.length > 16 ? `${node.commonName.slice(0, 14)}…` : node.commonName;
            return (
              <g
                key={node.speciesId}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onMouseEnter={(event) =>
                  setTooltip({
                    node,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }
                onMouseMove={(event) =>
                  setTooltip({
                    node,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <circle
                  r={node.r}
                  fill={categoryFill(node.category, muted)}
                  stroke={categoryStroke(node.category, muted)}
                  strokeWidth={node.gapHighlight ? 3 : 2}
                  opacity={muted ? 0.45 : 0.92}
                />
                <text textAnchor="middle" dy="-0.15em" className="pointer-events-none fill-foreground text-[15px]">
                  {categoryEmoji(node.category)}
                </text>
                <text
                  textAnchor="middle"
                  dy="1.05em"
                  className="pointer-events-none fill-foreground text-[11px] font-medium"
                  style={{ fontFamily: "inherit" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
        Drag to pan · Scroll or pinch to zoom
      </p>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 w-64 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <p className="font-semibold">{tooltip.node.commonName}</p>
          {tooltip.node.latinName ? (
            <p className="text-sm italic text-muted-foreground">{tooltip.node.latinName}</p>
          ) : null}
          <dl className="mt-2 space-y-1 text-sm">
            {mode === "community" ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total logs</dt>
                  <dd className="font-medium tabular-nums">{tooltip.node.platformLogCount ?? tooltip.node.logCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Unique users</dt>
                  <dd className="font-medium tabular-nums">{tooltip.node.uniqueUsers ?? "—"}</dd>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{mode === "friend" ? "Their logs" : "Your logs"}</dt>
                  <dd className="font-medium tabular-nums">{tooltip.node.logCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Platform logs</dt>
                  <dd className="font-medium tabular-nums">{tooltip.node.platformLogCount ?? "—"}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
