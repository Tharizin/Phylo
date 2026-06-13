"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFoodLogAction } from "@/app/actions/food";
import { Button } from "@/components/ui/button";
import { SpeciesNames } from "@/components/species-names";
import { CategoryBadge } from "@/components/species-names";
import { formatDateTime } from "@/lib/time";
import { useTransition } from "react";

export type RecentLog = {
  id: string;
  logged_at: string;
  points_awarded: number;
  notes: string | null;
  species: { common_name: string; latin_name: string | null; category: string };
};

export function RecentLogs({ initial }: { initial: RecentLog[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <ul className="space-y-3">
      {initial.map((log) => (
        <li key={log.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
          <div className="min-w-0 space-y-1">
            <SpeciesNames commonName={log.species.common_name} latinName={log.species.latin_name} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CategoryBadge category={log.species.category} />
              <span>{formatDateTime(log.logged_at)}</span>
              {log.points_awarded > 0 ? (
                <>
                  <span>·</span>
                  <span className="text-primary">+{log.points_awarded.toFixed(2)} pts</span>
                </>
              ) : null}
            </div>
            {log.notes ? <p className="text-xs text-muted-foreground">{log.notes}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete log"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await deleteFoodLogAction(log.id);
                if (r.ok) router.refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
      {initial.length === 0 ? <p className="text-sm text-muted-foreground">No logs yet. Add your first species above.</p> : null}
    </ul>
  );
}
