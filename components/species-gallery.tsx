"use client";

import { CategoryBadge } from "@/components/species-names";
import { cn } from "@/lib/utils";
import type { AllTimeSpeciesRow } from "@/components/all-time-species-table";

const categoryTileStyles: Record<string, string> = {
  plant: "bg-emerald-500/10 border-emerald-500/20",
  animal: "bg-amber-600/10 border-amber-600/20",
  fungus: "bg-violet-500/10 border-violet-500/20",
  other: "bg-slate-500/10 border-slate-500/20",
};

export function SpeciesGallery({ rows }: { rows: AllTimeSpeciesRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
        No species logged yet. Log your first food on the dashboard.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {rows.map((row) => (
        <article
          key={row.species_id}
          className={cn(
            "relative flex aspect-square flex-col items-center justify-center rounded-xl border p-4 text-center shadow-sm",
            categoryTileStyles[row.category] ?? categoryTileStyles.other
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
            <h3 className="line-clamp-3 text-lg font-semibold leading-tight">{row.common_name}</h3>
            {row.latin_name ? (
              <p className="line-clamp-2 text-sm italic text-muted-foreground">{row.latin_name}</p>
            ) : null}
            <CategoryBadge category={row.category} />
          </div>
          <p className="absolute bottom-3 right-3 text-xs tabular-nums text-muted-foreground">
            ×{row.log_count}
          </p>
        </article>
      ))}
    </div>
  );
}
