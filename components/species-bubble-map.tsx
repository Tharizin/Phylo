"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as d3 from "d3";
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
import { MapInfoButton } from "@/components/species-bubble-map-chrome";
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
  overlayControls,
  fullscreen = true,
}: {
  nodes: SpeciesBubbleNode[];
  mode: SpeciesBubbleMode;
  loading?: boolean;
  className?: string;
  requireMinNodes?: number;
  emptyHint?: string;
  overlayControls?: ReactNode;
  fullscreen?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const initialViewApplied = useRef(false);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [palette, setPalette] = useState<BubbleColorPalette>(() => readBubbleColorPalette());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [clusterCenter, setClusterCenter] = useState<{ x: number; y: number } | null>(null);

  const canvas = useMemo(
    () => ({
      width: viewport.width * CANVAS_SCALE,
      height: viewport.height * CANVAS_SCALE,
    }),
    [viewport.width, viewport.height]
  );

  const counts = useMemo(() => nodes.map((n) => n.logCount), [nodes]);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;

  useEffect(() => {
    setPalette(readBubbleColorPalette());
    const observer = new MutationObserver(() => setPalette(readBubbleColorPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewport({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(320, entry.contentRect.height),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    initialViewApplied.current = false;
    if (loading || nodes.length < requireMinNodes) {
      setSimNodes([]);
      setClusterCenter(null);
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadial = Math.min(canvas.width, canvas.height) * 0.38;

    const prepared: SimNode[] = nodes.map((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      const r = bubbleRadius(node.logCount, minCount, maxCount);
      return {
        ...node,
        r,
        x: centerX + Math.cos(angle) * maxRadial * 0.2,
        y: centerY + Math.sin(angle) * maxRadial * 0.2,
      };
    });

    const maxLog = Math.max(...prepared.map((n) => n.logCount), 1);

    const simulation = d3
      .forceSimulation(prepared)
      .force(
        "collide",
        d3
          .forceCollide<SimNode>((d) => d.r + COLLISION_PADDING)
          .strength(1)
          .iterations(6)
      )
      .force(
        "radial",
        d3
          .forceRadial<SimNode>(
            (d) => {
              const t = d.logCount / maxLog;
              return maxRadial * (0.15 + (1 - t) * 0.85);
            },
            centerX,
            centerY
          )
          .strength(0.9)
      )
      .force("charge", d3.forceManyBody().strength(-28))
      .stop();

    for (let i = 0; i < 520; i += 1) simulation.tick();

    prepared.forEach((node) => {
      node.x = Math.max(node.r + COLLISION_PADDING, Math.min(canvas.width - node.r - COLLISION_PADDING, node.x));
      node.y = Math.max(node.r + COLLISION_PADDING, Math.min(canvas.height - node.r - COLLISION_PADDING, node.y));
    });

    setClusterCenter(weightedClusterCenter(prepared));
    setSimNodes([...prepared]);
  }, [loading, nodes, canvas.width, canvas.height, minCount, maxCount, requireMinNodes]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || loading || simNodes.length < requireMinNodes) return;

    const svg = d3.select(svgEl);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.5])
      .on("zoom", (event) => {
        svg.select("g.map-layer").attr("transform", event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom as never);

    if (!initialViewApplied.current && clusterCenter) {
      const k = 1;
      const tx = viewport.width / 2 - clusterCenter.x * k;
      const ty = viewport.height / 2 - clusterCenter.y * k;
      const transform = d3.zoomIdentity.translate(tx, ty).scale(k);
      svg.call(zoom.transform as never, transform);
      initialViewApplied.current = true;
    }

    return () => {
      svg.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [loading, simNodes, clusterCenter, viewport.width, viewport.height, requireMinNodes]);

  const shellClass = fullscreen
    ? "fixed inset-x-0 top-14 z-0 h-[calc(100vh-3.5rem)] w-full"
    : cn("relative w-full", className);

  if (loading) {
    return (
      <div className={cn(shellClass, "bg-muted/10", className)}>
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    );
  }

  if (nodes.length < requireMinNodes) {
    return (
      <div
        className={cn(
          shellClass,
          "flex items-center justify-center bg-muted/10 px-6 text-center",
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
    <div ref={containerRef} className={cn(shellClass, "overflow-hidden bg-muted/10", className)}>
      <svg
        ref={svgRef}
        width={viewport.width}
        height={viewport.height}
        className="touch-none select-none"
        style={{ background: "hsl(var(--background))" }}
      >
        <rect width={viewport.width} height={viewport.height} fill="transparent" />
        <g className="map-layer">
          {simNodes.map((node) => {
            const muted = node.gapMuted ?? false;
            const gapHighlight = node.gapHighlight ?? false;
            const colors = resolveBubbleColors(palette, node.category, muted, gapHighlight);
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
                {gapHighlight && colors.ring ? (
                  <circle r={node.r + 4} fill="none" stroke={colors.ring} strokeWidth={3} opacity={0.95} />
                ) : null}
                <circle
                  r={node.r}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                  fillOpacity={colors.fillOpacity}
                />
                <text
                  textAnchor="middle"
                  dy="-0.15em"
                  fill="hsl(var(--foreground))"
                  fontSize={15}
                  className="pointer-events-none"
                >
                  {categoryEmoji(node.category)}
                </text>
                <text
                  textAnchor="middle"
                  dy="1.05em"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  fontWeight={600}
                  className="pointer-events-none"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
        <div className="pointer-events-auto">
          <MapInfoButton mode={mode} />
        </div>
      </div>

      {overlayControls ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">{overlayControls}</div>
        </div>
      ) : null}

      <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-background/75 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
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
