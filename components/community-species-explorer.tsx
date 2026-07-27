"use client";

import { useState, useTransition } from "react";
import { getCommunitySpeciesBubbleAction } from "@/app/actions/species-map";
import type { SpeciesBubbleNode } from "@/lib/species-bubble";
import { SpeciesBubbleMap } from "@/components/species-bubble-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CommunitySpeciesExplorer({ totalUniqueSpecies }: { totalUniqueSpecies: number }) {
  const [open, setOpen] = useState(false);
  const [nodes, setNodes] = useState<SpeciesBubbleNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function explore() {
    setOpen(true);
    setError(null);
    startTransition(async () => {
      const result = await getCommunitySpeciesBubbleAction();
      if (!result.ok) {
        setError(result.error);
        setNodes([]);
        return;
      }
      setNodes(result.nodes);
    });
  }

  return (
    <>
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Platform diversity</p>
        <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-primary sm:text-6xl">
          {totalUniqueSpecies.toLocaleString()}
        </p>
        <p className="mt-2 max-w-xl text-muted-foreground">
          unique species logged across the entire Phylo community
        </p>
        <Button type="button" className="mt-5" onClick={explore}>
          Explore all species
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl gap-4">
          <DialogHeader>
            <DialogTitle>Community species map</DialogTitle>
            <DialogDescription>
              Circle size reflects total logs across all users. Larger, more central bubbles are community staples.
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SpeciesBubbleMap
            nodes={nodes}
            mode="community"
            loading={pending}
            requireMinNodes={1}
            emptyHint="No species have been logged on Phylo yet."
            className="h-[65vh]"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
