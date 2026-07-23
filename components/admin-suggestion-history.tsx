"use client";

import { useMemo, useState } from "react";
import type { AliasSuggestionRow, SpeciesSuggestionRow } from "@/app/actions/suggestions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";

type HistoryRow =
  | ({ kind: "species" } & SpeciesSuggestionRow)
  | ({ kind: "alias" } & AliasSuggestionRow);

function statusBadge(status: string) {
  if (status === "approved") {
    return <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400">Pending</Badge>;
}

export function AdminSuggestionHistory({
  speciesSuggestions,
  aliasSuggestions,
  profileMap,
}: {
  speciesSuggestions: SpeciesSuggestionRow[];
  aliasSuggestions: AliasSuggestionRow[];
  profileMap: Record<string, string>;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | "species" | "alias">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "rejected">("all");

  const rows = useMemo(() => {
    const speciesRows: HistoryRow[] = speciesSuggestions
      .filter((s) => s.status !== "pending")
      .map((s) => ({ kind: "species" as const, ...s }));
    const aliasRows: HistoryRow[] = aliasSuggestions
      .filter((s) => s.status !== "pending")
      .map((s) => ({ kind: "alias" as const, ...s }));

    return [...speciesRows, ...aliasRows]
      .filter((row) => {
        if (typeFilter === "species" && row.kind !== "species") return false;
        if (typeFilter === "alias" && row.kind !== "alias") return false;
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.reviewed_at ?? a.created_at).getTime();
        const bTime = new Date(b.reviewed_at ?? b.created_at).getTime();
        return bTime - aTime;
      });
  }, [speciesSuggestions, aliasSuggestions, typeFilter, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggestion history</CardTitle>
        <CardDescription>All reviewed species and alias suggestions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="species">Species only</SelectItem>
              <SelectItem value="alias">Alias only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Suggestion</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Reviewed</TableHead>
              <TableHead>Reviewer notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No reviewed suggestions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="capitalize">{row.kind}</TableCell>
                  <TableCell>{profileMap[row.submitted_by] ?? row.submitted_by.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[220px]">
                    {row.kind === "species" ? (
                      <div>
                        <p className="font-medium">{row.common_name}</p>
                        {row.latin_name ? (
                          <p className="text-sm italic text-muted-foreground">{row.latin_name}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{row.suggested_alias}</p>
                        <p className="text-sm text-muted-foreground">for {row.species.common_name}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {row.reviewed_at ? formatDateTime(row.reviewed_at) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">{row.reviewer_notes ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
