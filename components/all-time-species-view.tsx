"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { AllTimeSpeciesTable, type AllTimeSpeciesRow } from "@/components/all-time-species-table";
import { SpeciesGallery } from "@/components/species-gallery";
import { Button } from "@/components/ui/button";

type ViewMode = "gallery" | "list";

export function AllTimeSpeciesView({ initial }: { initial: AllTimeSpeciesRow[] }) {
  const [view, setView] = useState<ViewMode>("gallery");

  const sortedForGallery = useMemo(() => {
    return [...initial].sort((a, b) => b.log_count - a.log_count || a.common_name.localeCompare(b.common_name));
  }, [initial]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "gallery" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setView("gallery")}
        >
          <LayoutGrid className="h-4 w-4" />
          Gallery
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setView("list")}
        >
          <List className="h-4 w-4" />
          List
        </Button>
      </div>

      {view === "gallery" ? <SpeciesGallery rows={sortedForGallery} /> : <AllTimeSpeciesTable initial={initial} />}
    </div>
  );
}
