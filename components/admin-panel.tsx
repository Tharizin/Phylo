"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteFoodLogAction, adminUpdateFoodLogAction } from "@/app/actions/food";
import { adminDeleteSpeciesAction, adminMergeSpeciesAction, adminUpdateSpeciesAction } from "@/app/actions/species";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryBadge, SpeciesNames } from "@/components/species-names";
import { formatDateTime } from "@/lib/time";

type AdminLog = {
  id: string;
  user_id: string;
  species_id: string;
  logged_at: string;
  notes: string | null;
  points_awarded: number;
  species: { id: string; common_name: string; latin_name: string | null; category: string };
};

type Species = {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
};

export function AdminPanel({
  logs,
  profileMap,
  species,
}: {
  logs: AdminLog[];
  profileMap: Record<string, string>;
  species: Species[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mergeKeep, setMergeKeep] = useState<string>(species[0]?.id ?? "");
  const [mergeDrop, setMergeDrop] = useState<string>(species[1]?.id ?? "");

  const [editSpecies, setEditSpecies] = useState<Species | null>(null);
  const [cn, setCn] = useState("");
  const [lat, setLat] = useState("");
  const [cat, setCat] = useState<string>("plant");

  const [editLog, setEditLog] = useState<AdminLog | null>(null);
  const [ln, setLn] = useState("");
  const [ll, setLl] = useState("");
  const [ls, setLs] = useState("");

  function openSpecies(s: Species) {
    setEditSpecies(s);
    setCn(s.common_name);
    setLat(s.latin_name ?? "");
    setCat(s.category);
  }

  function openLog(l: AdminLog) {
    setEditLog(l);
    setLn(l.notes ?? "");
    const d = new Date(l.logged_at);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setLl(local);
    setLs(l.species_id);
  }

  return (
    <>
    <Tabs defaultValue="logs">
      <TabsList>
        <TabsTrigger value="logs">All logs</TabsTrigger>
        <TabsTrigger value="species">Species</TabsTrigger>
        <TabsTrigger value="merge">Merge duplicates</TabsTrigger>
      </TabsList>

      <TabsContent value="logs">
        <Card>
          <CardHeader>
            <CardTitle>Recent community logs</CardTitle>
            <CardDescription>Edit or delete any entry. Changing species does not recompute points.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(l.logged_at)}
                    </TableCell>
                    <TableCell className="text-sm">{profileMap[l.user_id] ?? l.user_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <SpeciesNames commonName={l.species.common_name} latinName={l.species.latin_name} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openLog(l)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await adminDeleteFoodLogAction(l.id);
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="species">
        <Card>
          <CardHeader>
            <CardTitle>Species catalog</CardTitle>
            <CardDescription>Edit metadata or delete unused species.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {species.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <SpeciesNames commonName={s.common_name} latinName={s.latin_name} />
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={s.category} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openSpecies(s)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await adminDeleteSpeciesAction(s.id);
                              if (r.ok) router.refresh();
                              else alert(r.error);
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="merge">
        <Card>
          <CardHeader>
            <CardTitle>Merge species</CardTitle>
            <CardDescription>
              All food logs pointing at the merged species will move to the kept species. The merged row is deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Keep (canonical)</Label>
              <Select value={mergeKeep} onValueChange={setMergeKeep}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {species.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.common_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Merge into canonical (will be removed)</Label>
              <Select value={mergeDrop} onValueChange={setMergeDrop}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {species.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.common_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button
                disabled={pending || !mergeKeep || !mergeDrop || mergeKeep === mergeDrop}
                onClick={() =>
                  startTransition(async () => {
                    const r = await adminMergeSpeciesAction({ keepSpeciesId: mergeKeep, mergeSpeciesId: mergeDrop });
                    if (r.ok) router.refresh();
                    else alert(r.error);
                  })
                }
              >
                Merge species
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      <Dialog open={!!editSpecies} onOpenChange={(o) => !o && setEditSpecies(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit species</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Common name</Label>
              <Input value={cn} onChange={(e) => setCn(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Latin name</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["plant", "animal", "fungus", "other"].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !editSpecies}
              onClick={() =>
                startTransition(async () => {
                  if (!editSpecies) return;
                  const r = await adminUpdateSpeciesAction({
                    id: editSpecies.id,
                    commonName: cn,
                    latinName: lat,
                    category: cat as "plant" | "animal" | "fungus" | "other",
                  });
                  if (r.ok) {
                    setEditSpecies(null);
                    router.refresh();
                  } else alert(r.error);
                })
              }
            >
              Save species
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLog} onOpenChange={(o) => !o && setEditLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit log (admin)</DialogTitle>
          </DialogHeader>
          {editLog ? (
            <div className="grid gap-3 py-2">
              <div className="text-sm text-muted-foreground">
                User: <span className="text-foreground">{profileMap[editLog.user_id] ?? editLog.user_id}</span>
              </div>
              <div className="grid gap-2">
                <Label>Species</Label>
                <Select value={ls} onValueChange={setLs}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {species.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.common_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Logged at</Label>
                <Input type="datetime-local" value={ll} onChange={(e) => setLl(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input value={ln} onChange={(e) => setLn(e.target.value)} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={pending || !editLog}
              onClick={() =>
                startTransition(async () => {
                  if (!editLog) return;
                  const r = await adminUpdateFoodLogAction({
                    id: editLog.id,
                    userId: editLog.user_id,
                    notes: ln.trim() || null,
                    loggedAt: new Date(ll).toISOString(),
                    speciesId: ls,
                  });
                  if (r.ok) {
                    setEditLog(null);
                    router.refresh();
                  } else alert(r.error);
                })
              }
            >
              Save log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
