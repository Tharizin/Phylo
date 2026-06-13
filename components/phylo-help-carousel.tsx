"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HelpSlide } from "@/lib/help-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PhyloHelpCarousel({
  slides,
  className,
}: {
  slides: HelpSlide[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function goNext() {
    if (isLast) return;
    setIndex((i) => i + 1);
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="min-h-[200px] space-y-4">
        <h2 className="text-xl font-semibold" style={{ fontFamily: "Fraunces, serif" }}>
          {slide.title}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {slide.body.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            )}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {slides.length}
        </span>
        {isLast ? (
          <div className="w-[4.5rem]" aria-hidden />
        ) : (
          <Button type="button" size="sm" onClick={goNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
