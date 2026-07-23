"use client";

import type { AliasSuggestionRow, SpeciesSuggestionRow } from "@/app/actions/suggestions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/time";

function statusBadge(status: string) {
  if (status === "approved") {
    return <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400">Pending</Badge>;
}

export function MySuggestions({
  speciesSuggestions,
  aliasSuggestions,
}: {
  speciesSuggestions: SpeciesSuggestionRow[];
  aliasSuggestions: AliasSuggestionRow[];
}) {
  const hasAny = speciesSuggestions.length > 0 || aliasSuggestions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My suggestions</CardTitle>
        <CardDescription>Track species and alias contributions you&apos;ve submitted for review.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            You haven&apos;t submitted any suggestions yet. When you search for a species on the dashboard and can&apos;t
            find a match, use the suggest buttons to contribute.
          </p>
        ) : (
          <Tabs defaultValue="species">
            <TabsList>
              <TabsTrigger value="species">Species suggestions</TabsTrigger>
              <TabsTrigger value="alias">Alias suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="species" className="mt-4 overflow-x-auto">
              {speciesSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No species suggestions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suggestion</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewer notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {speciesSuggestions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.common_name}</p>
                          {s.latin_name ? (
                            <p className="text-sm italic text-muted-foreground">{s.latin_name}</p>
                          ) : null}
                          {(s.alternative_names ?? []).length > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Aliases: {(s.alternative_names ?? []).join(", ")}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(s.created_at)}
                        </TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-sm">{s.reviewer_notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="alias" className="mt-4 overflow-x-auto">
              {aliasSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alias suggestions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suggestion</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewer notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aliasSuggestions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.suggested_alias}</p>
                          <p className="text-sm text-muted-foreground">for {s.species.common_name}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(s.created_at)}
                        </TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-sm">{s.reviewer_notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
