"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, SpeciesNames } from "@/components/species-names";

export type AllTimeSpeciesRow = {
  species_id: string;
  log_count: number;
  common_name: string;
  latin_name: string | null;
  category: string;
};

type SortKey = "count" | "name";

export function AllTimeSpeciesTable({ initial }: { initial: AllTimeSpeciesRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = [...initial];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "count") cmp = a.log_count - b.log_count;
      else cmp = a.common_name.localeCompare(b.common_name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [initial, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "count" ? "desc" : "asc");
    }
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
              Species {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("count")}>
              Times logged {sortKey === "count" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.species_id}>
              <TableCell>
                <SpeciesNames commonName={row.common_name} latinName={row.latin_name} />
              </TableCell>
              <TableCell>
                <CategoryBadge category={row.category} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.log_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sorted.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No species logged yet. Log your first food on the dashboard.
        </p>
      ) : null}
    </Card>
  );
}
