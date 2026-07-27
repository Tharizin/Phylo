"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CommunitySpeciesExplorer({ totalUniqueSpecies }: { totalUniqueSpecies: number }) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Platform diversity</p>
      <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-primary sm:text-6xl">
        {totalUniqueSpecies.toLocaleString()}
      </p>
      <p className="mt-2 max-w-xl text-muted-foreground">
        unique species logged across the entire Phylo community
      </p>
      <Button type="button" className="mt-5" asChild>
        <Link href="/community/explore">Explore all species</Link>
      </Button>
    </div>
  );
}
