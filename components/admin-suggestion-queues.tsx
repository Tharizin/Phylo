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

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("reject");
  const [reviewKind, setReviewKind] = useState<"species" | "alias">("species");
  const [reviewId, setReviewId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const pendingSpecies = speciesSuggestions.filter((s) => s.status === "pending");
  const pendingAlias = aliasSuggestions.filter((s) => s.status === "pending");

  function openReview(action: "approve" | "reject", kind: "species" | "alias", id: string) {
    setReviewAction(action);
    setReviewKind(kind);
    setReviewId(id);
    setReviewNotes("");
    setReviewOpen(true);
  }

  function confirmReview() {
    startTransition(async () => {
      const notes = reviewNotes.trim() || undefined;
      const r =
        reviewAction === "approve"
          ? reviewKind === "species"
            ? await adminApproveSpeciesSuggestionAction({ id: reviewId, reviewerNotes: notes })
            : await adminApproveAliasSuggestionAction({ id: reviewId, reviewerNotes: notes })
          : reviewKind === "species"
            ? await adminRejectSpeciesSuggestionAction({ id: reviewId, reviewerNotes: notes })
            : await adminRejectAliasSuggestionAction({ id: reviewId, reviewerNotes: notes });

      if (r.ok) {
        setReviewOpen(false);
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
            <CardTitle>Pending species suggestions</CardTitle>
            <CardDescription>Review new species submitted by users before they enter the catalog.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Common name</TableHead>
                  <TableHead>Latin name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Alternative names</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date submitted</TableHead>
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
                          <Button size="sm" disabled={pending} onClick={() => openReview("approve", "species", s.id)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => openReview("reject", "species", s.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {mode !== "species" ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending alias suggestions</CardTitle>
            <CardDescription>Review alternative names users want added to existing species.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Existing species</TableHead>
                  <TableHead>Suggested alias</TableHead>
                  <TableHead>Date submitted</TableHead>
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
                          <Button size="sm" disabled={pending} onClick={() => openReview("approve", "alias", s.id)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => openReview("reject", "alias", s.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? "Approve" : "Reject"} suggestion</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="review-notes">Reviewer notes (optional)</Label>
            <Input
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Optional note for the submitter or audit trail…"
            />
          </div>
          <DialogFooter>
            <Button
              variant={reviewAction === "reject" ? "destructive" : "default"}
              disabled={pending}
              onClick={confirmReview}
            >
              {reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
