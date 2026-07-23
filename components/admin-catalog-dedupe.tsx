"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { previewSpeciesDedupeAction, runSpeciesDedupeAction } from "@/app/actions/dedupe-species";
import type { DedupePlan } from "@/lib/species-dedupe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminCatalogDedupe() {
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<DedupePlan | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function preview() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await previewSpeciesDedupeAction();
      if (!res.ok) {
        setError(res.error);
        setPlan(null);
        return;
      }
      setPlan(res.plan);
    });
  }

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await runSpeciesDedupeAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.details);
      setPlan(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog cleanup</CardTitle>
        <CardDescription>
          Remove duplicate aliases within each species and merge duplicate species that share the same common name.
          Keepers prefer seeded canonical latin names (e.g. Banana → Musa × paradisiaca), then entries with more logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={preview}>
            {pending && !plan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Preview duplicates
          </Button>
          <Button type="button" disabled={pending || !plan} onClick={run}>
            {pending && plan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run cleanup
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {plan ? (
          <div className="space-y-3 rounded-md border bg-muted/20 p-4 text-sm">
            <p>
              <span className="font-medium">{plan.aliasUpdates.length}</span> species need alias deduplication.
            </p>
            <p>
              <span className="font-medium">{plan.merges.length}</span> duplicate species rows will be merged.
            </p>
            {plan.merges.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {plan.merges.map((merge) => (
                  <li key={`${merge.keeper.id}-${merge.drop.id}`}>
                    Drop {merge.drop.common_name} ({merge.drop.latin_name ?? "no latin"}) → keep{" "}
                    {merge.keeper.common_name} ({merge.keeper.latin_name ?? "no latin"})
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {result && result.length > 0 ? (
          <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">Cleanup complete</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result && result.length === 0 ? (
          <p className="text-sm text-muted-foreground">No duplicates found — catalog is already clean.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
