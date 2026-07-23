"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminApproveAliasSuggestionAction,
  adminApproveSpeciesSuggestionAction,
  adminRejectAliasSuggestionAction,
  adminRejectSpeciesSuggestionAction,
  type AliasSuggestionRow,
  type SpeciesSuggestionRow,
} from "@/app/actions/suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge } from "@/components/species-names";
import { formatDateTime } from "@/lib/time";

export function AdminSuggestionQueues({
  speciesSuggestions,
  aliasSuggestions,
  profileMap,
  mode = "both",
}: {
  speciesSuggestions: SpeciesSuggestionRow[];
  aliasSuggestions: AliasSuggestionRow[];
  profileMap: Record<string, string>;
  mode?: "species" | "alias" | "both";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [speciesHistoryFilter, setSpeciesHistoryFilter] = useState<"all" | "approved" | "rejected">("all");
  const [aliasHistoryFilter, setAliasHistoryFilter] = useState<"all" | "approved" | "rejected">("all");
  const [showSpeciesHistory, setShowSpeciesHistory] = useState(false);
  const [showAliasHistory, setShowAliasHistory] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectKind, setRejectKind] = useState<"species" | "alias">("species");
  const [rejectId, setRejectId] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  const pendingSpecies = speciesSuggestions.filter((s) => s.status === "pending");
  const historySpecies = speciesSuggestions.filter((s) => s.status !== "pending").filter((s) => {
    if (speciesHistoryFilter === "all") return true;
    return s.status === speciesHistoryFilter;
  });

  const pendingAlias = aliasSuggestions.filter((s) => s.status === "pending");
  const historyAlias = aliasSuggestions.filter((s) => s.status !== "pending").filter((s) => {
    if (aliasHistoryFilter === "all") return true;
    return s.status === aliasHistoryFilter;
  });

  function openReject(kind: "species" | "alias", id: string) {
    setRejectKind(kind);
    setRejectId(id);
    setRejectNotes("");
    setRejectOpen(true);
  }

  function confirmReject() {
    startTransition(async () => {
      const r =
        rejectKind === "species"
          ? await adminRejectSpeciesSuggestionAction({ id: rejectId, reviewerNotes: rejectNotes })
          : await adminRejectAliasSuggestionAction({ id: rejectId, reviewerNotes: rejectNotes });
      if (r.ok) {
        setRejectOpen(false);
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  return (
    <>
      {mode !== "alias" ? (
      <Card>
        <CardHeader>
          <CardTitle>Species suggestion queue</CardTitle>
          <CardDescription>Review new species submitted by users before they enter the catalog.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted by</TableHead>
                <TableHead>Common name</TableHead>
                <TableHead>Latin name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Alternative names</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSpecies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No pending species suggestions.
                  </TableCell>
                </TableRow>
              ) : (
                pendingSpecies.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{profileMap[s.submitted_by] ?? s.submitted_by.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{s.common_name}</TableCell>
                    <TableCell className="italic text-muted-foreground">{s.latin_name ?? "—"}</TableCell>
                    <TableCell>
                      <CategoryBadge category={s.category} />
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">
                      {(s.alternative_names ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">{s.notes ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await adminApproveSpeciesSuggestionAction(s.id);
                              if (r.ok) router.refresh();
                              else alert(r.error);
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => openReject("species", s.id)}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setShowSpeciesHistory((v) => !v)}>
              {showSpeciesHistory ? "Hide" : "Show"} species suggestion history ({historySpecies.length})
            </Button>
            {showSpeciesHistory ? (
              <div className="space-y-3">
                <Select value={speciesHistoryFilter} onValueChange={(v) => setSpeciesHistoryFilter(v as typeof speciesHistoryFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All reviewed</SelectItem>
                    <SelectItem value="approved">Approved only</SelectItem>
                    <SelectItem value="rejected">Rejected only</SelectItem>
                  </SelectContent>
                </Select>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Common name</TableHead>
                      <TableHead>Latin name</TableHead>
                      <TableHead>Submitted by</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Reviewer notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historySpecies.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="capitalize">{s.status}</TableCell>
                        <TableCell>{s.common_name}</TableCell>
                        <TableCell className="italic text-muted-foreground">{s.latin_name ?? "—"}</TableCell>
                        <TableCell>{profileMap[s.submitted_by] ?? s.submitted_by.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.reviewed_at ? formatDateTime(s.reviewed_at) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{s.reviewer_notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      ) : null}

      {mode !== "species" ? (
      <Card>
        <CardHeader>
          <CardTitle>Alias suggestion queue</CardTitle>
          <CardDescription>Review alternative names users want added to existing species.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted by</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Suggested alias</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAlias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No pending alias suggestions.
                  </TableCell>
                </TableRow>
              ) : (
                pendingAlias.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{profileMap[s.submitted_by] ?? s.submitted_by.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{s.species.common_name}</TableCell>
                    <TableCell>{s.suggested_alias}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await adminApproveAliasSuggestionAction(s.id);
                              if (r.ok) router.refresh();
                              else alert(r.error);
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => openReject("alias", s.id)}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setShowAliasHistory((v) => !v)}>
              {showAliasHistory ? "Hide" : "Show"} alias suggestion history ({historyAlias.length})
            </Button>
            {showAliasHistory ? (
              <div className="space-y-3">
                <Select value={aliasHistoryFilter} onValueChange={(v) => setAliasHistoryFilter(v as typeof aliasHistoryFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All reviewed</SelectItem>
                    <SelectItem value="approved">Approved only</SelectItem>
                    <SelectItem value="rejected">Rejected only</SelectItem>
                  </SelectContent>
                </Select>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Alias</TableHead>
                      <TableHead>Submitted by</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Reviewer notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyAlias.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="capitalize">{s.status}</TableCell>
                        <TableCell>{s.species.common_name}</TableCell>
                        <TableCell>{s.suggested_alias}</TableCell>
                        <TableCell>{profileMap[s.submitted_by] ?? s.submitted_by.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.reviewed_at ? formatDateTime(s.reviewed_at) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{s.reviewer_notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      ) : null}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject suggestion</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-notes">Rejection note (optional)</Label>
            <Input
              id="reject-notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection…"
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={pending} onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
