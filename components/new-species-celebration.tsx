"use client";

import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpeciesNames } from "@/components/species-names";

export function NewSpeciesCelebration({
  open,
  onOpenChange,
  commonName,
  latinName,
  points,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commonName: string;
  latinName: string | null;
  points: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-primary/30 sm:max-w-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-amber-500/10 to-transparent" />
        <DialogHeader className="relative space-y-4 text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
            New species!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-base text-foreground">You&apos;ve added a new entry to your life list.</p>
              <div className="rounded-lg border bg-card/80 px-4 py-3">
                <SpeciesNames commonName={commonName} latinName={latinName} />
              </div>
              <p className="text-lg font-semibold text-primary tabular-nums">+{points.toFixed(2)} points</p>
              <p className="text-sm text-muted-foreground">Keep exploring — diversity is the whole game.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
