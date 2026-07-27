"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as d3 from "d3";
import {
  CANVAS_SCALE,
  COLLISION_PADDING,
  categoryEmoji,
  readBubbleColorPalette,
  resolveBubbleColors,
  computeInitialViewTransform,
  bubbleRadius,
  fitBubbleLabel,
  type BubbleColorPalette,
  type SpeciesBubbleMode,
  type SpeciesBubbleNode,
  type ViewTransform,
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
  const zoomKRef = useRef(1);
  const zoomRafRef = useRef<number | null>(null);
  const initialViewApplied = useRef(false);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [palette, setPalette] = useState<BubbleColorPalette>(() => readBubbleColorPalette());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [initialViewTransform, setInitialViewTransform] = useState<ViewTransform | null>(null);
  const [zoomK, setZoomK] = useState(1);

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

  const labelLayouts = useMemo(() => {
    const layouts = new Map<string, ReturnType<typeof fitBubbleLabel>>();
    for (const node of simNodes) {
      layouts.set(node.speciesId, fitBubbleLabel(node.commonName, node.r, zoomK));
    }
    return layouts;
  }, [simNodes, zoomK]);

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
      setInitialViewTransform(null);
      setZoomK(1);
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const prepared: SimNode[] = nodes.map((node) => {
      const r = bubbleRadius(node.logCount, minCount, maxCount);
      return {
        ...node,
        r,
        x: centerX + (Math.random() - 0.5) * 48,
        y: centerY + (Math.random() - 0.5) * 48,
      };
    });
    prepared.sort((a, b) => b.r - a.r);

    const maxLog = Math.max(...prepared.map((n) => n.logCount), 1);

    const simulation = d3
      .forceSimulation(prepared)
      .force("center", d3.forceCenter(centerX, centerY).strength(0.14))
      .force(
        "collide",
        d3
          .forceCollide<SimNode>((d) => d.r + COLLISION_PADDING)
          .strength(1)
          .iterations(8)
      )
      .force(
        "x",
        d3.forceX<SimNode>(centerX).strength((d) => 0.012 + (d.logCount / maxLog) * 0.028)
      )
      .force(
        "y",
        d3.forceY<SimNode>(centerY).strength((d) => 0.012 + (d.logCount / maxLog) * 0.028)
      )
      .alphaDecay(0.012)
      .alphaMin(0.001)
      .stop();

    while (simulation.alpha() > simulation.alphaMin()) {
      simulation.tick();
    }

    setInitialViewTransform(computeInitialViewTransform(prepared, viewport.width, viewport.height));
    setSimNodes([...prepared]);
  }, [loading, nodes, canvas.width, canvas.height, viewport.width, viewport.height, minCount, maxCount, requireMinNodes]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || loading || simNodes.length < requireMinNodes) return;

    const svg = d3.select(svgEl);
    const scheduleZoomKUpdate = (k: number) => {
      zoomKRef.current = k;
      if (zoomRafRef.current != null) return;
      zoomRafRef.current = requestAnimationFrame(() => {
        setZoomK(zoomKRef.current);
        zoomRafRef.current = null;
      });
    };

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.5])
      .on("zoom", (event) => {
        svg.select("g.map-layer").attr("transform", event.transform.toString());
        scheduleZoomKUpdate(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom as never);

    if (!initialViewApplied.current && initialViewTransform) {
      const { x, y, k } = initialViewTransform;
      const transform = d3.zoomIdentity.translate(x, y).scale(k);
      svg.call(zoom.transform as never, transform);
      scheduleZoomKUpdate(k);
      initialViewApplied.current = true;
    }

    return () => {
      if (zoomRafRef.current != null) {
        cancelAnimationFrame(zoomRafRef.current);
        zoomRafRef.current = null;
      }
      svg.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [loading, simNodes, initialViewTransform, requireMinNodes]);

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
          <defs>
            {simNodes.map((node) => (
              <clipPath key={`clip-${node.speciesId}`} id={`bubble-label-clip-${node.speciesId}`}>
                <circle r={node.r * 0.92} />
              </clipPath>
            ))}
          </defs>
          {simNodes.map((node) => {
            const muted = node.gapMuted ?? false;
            const gapHighlight = node.gapHighlight ?? false;
            const colors = resolveBubbleColors(palette, node.category, muted, gapHighlight);
            const label = labelLayouts.get(node.speciesId) ?? fitBubbleLabel(node.commonName, node.r, zoomK);
            const textScale = 1 / zoomK;
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
                <g
                  transform={`scale(${textScale})`}
                  clipPath={`url(#bubble-label-clip-${node.speciesId})`}
                  className="pointer-events-none"
                >
                  <text
                    textAnchor="middle"
                    dy="-0.15em"
                    fill="hsl(var(--foreground))"
                    fontSize={label.emojiFontSize}
                  >
                    {categoryEmoji(node.category)}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="1.05em"
                    fill="hsl(var(--foreground))"
                    fontSize={label.fontSize}
                    fontWeight={600}
                  >
                    {label.text}
                  </text>
                </g>
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
