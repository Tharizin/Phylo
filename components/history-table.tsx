"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { deleteFoodLogAction, updateFoodLogAction } from "@/app/actions/food";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, SpeciesNames } from "@/components/species-names";
import { formatDateTime } from "@/lib/time";

export type HistoryRow = {
  id: string;
  logged_at: string;
  notes: string | null;
  points_awarded: number;
  species: { id: string; common_name: string; latin_name: string | null; category: string };
};

type SortKey = "logged_at" | "species" | "category";

export function HistoryTable({ initial }: { initial: HistoryRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("logged_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [edit, setEdit] = useState<HistoryRow | null>(null);
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState("");
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(() => {
    const rows = [...initial];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "logged_at") {
        cmp = new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime();
      } else if (sortKey === "species") {
        cmp = a.species.common_name.localeCompare(b.species.common_name);
      } else {
        cmp = a.species.category.localeCompare(b.species.category);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [initial, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "logged_at" ? "desc" : "asc");
    }
  }

  function openEdit(row: HistoryRow) {
    setEdit(row);
    setNotes(row.notes ?? "");
    const d = new Date(row.logged_at);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setLoggedAt(local);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("logged_at")}>
                Date / time {sortKey === "logged_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("species")}>
                Species {sortKey === "species" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>
                Category {sortKey === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Points</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(row.logged_at)}
                </TableCell>
                <TableCell>
                  <SpeciesNames commonName={row.species.common_name} latinName={row.species.latin_name} />
                </TableCell>
                <TableCell>
                  <CategoryBadge category={row.species.category} />
                </TableCell>
                <TableCell className="tabular-nums">{row.points_awarded.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit log">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await deleteFoodLogAction(row.id);
                          if (r.ok) router.refresh();
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No logs yet.</p>
        ) : null}
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit log</DialogTitle>
          </DialogHeader>
          {edit ? (
            <div className="grid gap-3 py-2">
              <SpeciesNames commonName={edit.species.common_name} latinName={edit.species.latin_name} />
              <div className="grid gap-2">
                <Label htmlFor="la">Logged at</Label>
                <Input id="la" type="datetime-local" value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="n">Notes</Label>
                <Input id="n" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Points were calculated when you logged this entry. Editing does not recompute points.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() =>
                startTransition(async () => {
                  if (!edit) return;
                  const r = await updateFoodLogAction({
                    id: edit.id,
                    notes: notes.trim() || null,
                    loggedAt: new Date(loggedAt).toISOString(),
                  });
                  if (r.ok) {
                    setEdit(null);
                    router.refresh();
                  }
                })
              }
              disabled={pending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
