"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Tag } from "lucide-react";
import {
  addAlternativeNameAction,
  createSpeciesAction,
  searchSpeciesAction,
  type SpeciesSearchRow,
} from "@/app/actions/species";
import { logFoodAction } from "@/app/actions/food";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SpeciesNames } from "@/components/species-names";
import { NewSpeciesCelebration } from "@/components/new-species-celebration";
import { toast } from "@/components/ui/use-toast";

const categoryOptions = [
  { value: "plant", label: "Plant" },
  { value: "animal", label: "Animal" },
  { value: "fungus", label: "Fungus" },
  { value: "other", label: "Other" },
] as const;

export function FoodLogPanel() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SpeciesSearchRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpeciesSearchRow | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [celebration, setCelebration] = useState<{
    commonName: string;
    latinName: string | null;
    points: number;
  } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newCommon, setNewCommon] = useState("");
  const [newLatin, setNewLatin] = useState("");
  const [newAltNames, setNewAltNames] = useState("");
  const [newCategory, setNewCategory] = useState<(typeof categoryOptions)[number]["value"]>("plant");
  const [creating, setCreating] = useState(false);

  const [altNameInput, setAltNameInput] = useState("");
  const [addingAlt, setAddingAlt] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    const res = await searchSpeciesAction(q, 24);
    setLoading(false);
    if (!res.ok) {
      console.error("species search failed:", res.error);
      setSearchError(res.error);
      setResults([]);
      return;
    }
    setSearchError(null);
    setResults(res.results);
  }, []);

  useEffect(() => {
    if (query.trim()) {
      setLoading(true);
    }
    const t = setTimeout(() => {
      void runSearch(query);
    }, 220);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    if (selected && query.trim()) {
      setAltNameInput(query.trim());
    }
  }, [selected, query]);


  async function onLog() {
    if (!selected) return;
    setSaving(true);
    const res = await logFoodAction({
      speciesId: selected.id,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Could not log", description: res.error, variant: "destructive" });
      return;
    }

    if (res.isFirstEver) {
      setCelebration({
        commonName: res.speciesCommonName,
        latinName: res.speciesLatinName,
        points: res.points,
      });
    } else {
      toast({ title: `Logged ${res.speciesCommonName}`, description: `+${res.points.toFixed(2)} pts` });
    }

    setOpen(false);
    setSelected(null);
    setNotes("");
    setQuery("");
    setAltNameInput("");
  }

  async function onCreateSpecies() {
    if (!newLatin.trim()) {
      toast({ title: "Latin name required", description: "Enter the scientific name to identify this species.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const res = await createSpeciesAction({
      commonName: newCommon,
      latinName: newLatin,
      category: newCategory,
      alternativeNames: newAltNames,
    });
    setCreating(false);
    if (!res.ok) {
      toast({ title: "Could not add species", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Species added", description: "It is now available to everyone." });
    setAddOpen(false);
    const common = newCommon.trim();
    const latin = newLatin.trim();
    setNewCommon("");
    setNewLatin("");
    setNewAltNames("");
    setNewCategory("plant");
    setSelected({
      id: res.id,
      common_name: common,
      latin_name: latin,
      category: newCategory,
    });
    await runSearch(query);
  }

  async function onAddAlternativeName(name?: string) {
    if (!selected) return;
    const toAdd = (name ?? altNameInput).trim();
    if (!toAdd) return;
    setAddingAlt(true);
    const res = await addAlternativeNameAction(selected.id, toAdd);
    setAddingAlt(false);
    if (!res.ok) {
      toast({ title: "Could not add alias", description: res.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Alternative name added",
      description: `“${toAdd}” will now match ${selected.common_name} in search.`,
    });
    setAltNameInput("");
    await runSearch(query);
  }

  const canQuickAddQuery =
    selected &&
    query.trim() &&
    query.trim().toLowerCase() !== selected.common_name.toLowerCase() &&
    query.trim().toLowerCase() !== (selected.latin_name ?? "").toLowerCase();

  return (
    <>
      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle className="text-xl">Log a food</CardTitle>
          <CardDescription>Search the community species list and save your entry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-muted-foreground">
                {selected ? (
                  <SpeciesNames commonName={selected.common_name} latinName={selected.latin_name} />
                ) : (
                  "Search species…"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,420px)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Type a common or latin name…" value={query} onValueChange={setQuery} />
                <CommandList>
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching…
                      </span>
                    ) : searchError ? (
                      <span className="text-destructive">Search unavailable: {searchError}</span>
                    ) : (
                      "No matches. Add a new species below."
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Species">
                    {loading && query.trim() ? null : (
                      results.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id}
                          onSelect={() => {
                            setSelected(s);
                            setOpen(false);
                          }}
                          className="flex flex-col items-start gap-0.5 py-3"
                        >
                          <SpeciesNames commonName={s.common_name} latinName={s.latin_name} />
                          <p className="text-xs capitalize text-muted-foreground">{s.category}</p>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
              <Separator />
              <div className="p-2">
                <Dialog
                  open={addOpen}
                  onOpenChange={(o) => {
                    setAddOpen(o);
                    if (o && query.trim()) setNewCommon(query.trim());
                    if (!o) {
                      setNewCommon("");
                      setNewLatin("");
                      setNewAltNames("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      onClick={() => {
                        if (query.trim()) setNewCommon(query.trim());
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add new species
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a species</DialogTitle>
                      <DialogDescription>
                        The latin name uniquely identifies each species. Duplicates are not allowed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="cn">Common name</Label>
                        <Input id="cn" value={newCommon} onChange={(e) => setNewCommon(e.target.value)} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lat">Latin name</Label>
                        <Input
                          id="lat"
                          value={newLatin}
                          onChange={(e) => setNewLatin(e.target.value)}
                          placeholder="e.g. Bos taurus"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="alt">Alternative names (optional)</Label>
                        <Input
                          id="alt"
                          value={newAltNames}
                          onChange={(e) => setNewAltNames(e.target.value)}
                          placeholder="beef, burger, steak"
                        />
                        <p className="text-xs text-muted-foreground">Comma-separated. Used for search matching.</p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select value={newCategory} onValueChange={(v) => setNewCategory(v as typeof newCategory)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={onCreateSpecies}
                        disabled={creating || !newCommon.trim() || !newLatin.trim()}
                      >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save species"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </PopoverContent>
          </Popover>

          {selected ? (
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4">
              <SpeciesNames commonName={selected.common_name} latinName={selected.latin_name} />

              <div className="grid gap-2 rounded-md border border-dashed bg-background/60 p-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Tag className="h-3.5 w-3.5" />
                  Add search alias
                </Label>
                <p className="text-xs text-muted-foreground">
                  Help others find this species by another name (e.g. add &quot;steak&quot; to Cow).
                </p>
                <div className="flex gap-2">
                  <Input
                    value={altNameInput}
                    onChange={(e) => setAltNameInput(e.target.value)}
                    placeholder="steak, burger, …"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onAddAlternativeName();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={addingAlt || !altNameInput.trim()}
                    onClick={() => void onAddAlternativeName()}
                  >
                    {addingAlt ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
                {canQuickAddQuery ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto justify-start px-0 text-xs text-primary"
                    disabled={addingAlt}
                    onClick={() => void onAddAlternativeName(query.trim())}
                  >
                    Add &quot;{query.trim()}&quot; from your search
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nt">Notes (optional)</Label>
                <Input id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meal, source, etc." />
              </div>
              <Button onClick={onLog} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm log"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <NewSpeciesCelebration
        open={!!celebration}
        onOpenChange={(o) => !o && setCelebration(null)}
        commonName={celebration?.commonName ?? ""}
        latinName={celebration?.latinName ?? null}
        points={celebration?.points ?? 0}
      />
    </>
  );
}
