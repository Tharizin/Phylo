"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Link2, Loader2 } from "lucide-react";
import { searchSpeciesAction, type SpeciesSearchRow } from "@/app/actions/species";
import {
  submitAliasSuggestionAction,
  submitSpeciesSuggestionAction,
} from "@/app/actions/suggestions";
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
  const [hasExactMatch, setHasExactMatch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpeciesSearchRow | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [celebration, setCelebration] = useState<{
    commonName: string;
    latinName: string | null;
    points: number;
  } | null>(null);

  const [speciesSuggestOpen, setSpeciesSuggestOpen] = useState(false);
  const [newCommon, setNewCommon] = useState("");
  const [newLatin, setNewLatin] = useState("");
  const [newAltNames, setNewAltNames] = useState("");
  const [newCategory, setNewCategory] = useState<(typeof categoryOptions)[number]["value"]>("plant");
  const [suggestionNotes, setSuggestionNotes] = useState("");
  const [submittingSpecies, setSubmittingSpecies] = useState(false);

  const [aliasSuggestOpen, setAliasSuggestOpen] = useState(false);
  const [aliasSpeciesQuery, setAliasSpeciesQuery] = useState("");
  const [aliasSpeciesResults, setAliasSpeciesResults] = useState<SpeciesSearchRow[]>([]);
  const [aliasSpeciesLoading, setAliasSpeciesLoading] = useState(false);
  const [aliasTarget, setAliasTarget] = useState<SpeciesSearchRow | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const [submittingAlias, setSubmittingAlias] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    const res = await searchSpeciesAction(q, 24);
    setLoading(false);
    if (!res.ok) {
      console.error("species search failed:", res.error);
      setSearchError(res.error);
      setResults([]);
      setHasExactMatch(false);
      return;
    }
    setSearchError(null);
    setResults(res.results);
    setHasExactMatch(res.hasExactMatch);
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
    if (!aliasSuggestOpen) return;
    const t = setTimeout(async () => {
      setAliasSpeciesLoading(true);
      const res = await searchSpeciesAction(aliasSpeciesQuery, 20);
      setAliasSpeciesLoading(false);
      if (res.ok) setAliasSpeciesResults(res.results);
      else setAliasSpeciesResults([]);
    }, 220);
    return () => clearTimeout(t);
  }, [aliasSpeciesQuery, aliasSuggestOpen]);

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
  }

  async function onSubmitSpeciesSuggestion() {
    if (!newLatin.trim()) {
      toast({ title: "Latin name required", description: "Enter the scientific name.", variant: "destructive" });
      return;
    }
    setSubmittingSpecies(true);
    const res = await submitSpeciesSuggestionAction({
      commonName: newCommon,
      latinName: newLatin,
      category: newCategory,
      alternativeNames: newAltNames,
      notes: suggestionNotes,
    });
    setSubmittingSpecies(false);
    if (!res.ok) {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Thanks! Your suggestion has been sent for review." });
    setSpeciesSuggestOpen(false);
    setNewCommon("");
    setNewLatin("");
    setNewAltNames("");
    setSuggestionNotes("");
    setNewCategory("plant");
  }

  async function onSubmitAliasSuggestion() {
    if (!aliasTarget) {
      toast({ title: "Select a species", description: "Pick the species this alias belongs to.", variant: "destructive" });
      return;
    }
    if (!aliasInput.trim()) {
      toast({ title: "Alias required", description: "Enter the alias you want to suggest.", variant: "destructive" });
      return;
    }
    setSubmittingAlias(true);
    const res = await submitAliasSuggestionAction({
      speciesId: aliasTarget.id,
      suggestedAlias: aliasInput,
    });
    setSubmittingAlias(false);
    if (!res.ok) {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Thanks! We'll review your suggested alias." });
    setAliasSuggestOpen(false);
    setAliasTarget(null);
    setAliasInput("");
    setAliasSpeciesQuery("");
  }

  function openSpeciesSuggest() {
    setOpen(false);
    if (query.trim()) setNewCommon(query.trim());
    setSpeciesSuggestOpen(true);
  }

  function openAliasSuggest() {
    setOpen(false);
    setAliasInput(query.trim());
    setAliasSpeciesQuery("");
    setAliasTarget(null);
    setAliasSuggestOpen(true);
  }

  const showSuggestOptions = !!query.trim() && !loading && !searchError && results.length === 0 && !hasExactMatch;

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
                      "No matches found."
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
              {showSuggestOptions ? (
                <>
                  <Separator />
                  <div className="space-y-2 p-2">
                    <p className="px-1 text-xs text-muted-foreground">No matches — suggest a contribution:</p>
                    <Button type="button" variant="secondary" className="w-full gap-2" onClick={openSpeciesSuggest}>
                      <Lightbulb className="h-4 w-4" />
                      Suggest a new species
                    </Button>
                    <Button type="button" variant="outline" className="w-full gap-2" onClick={openAliasSuggest}>
                      <Link2 className="h-4 w-4" />
                      Suggest an alias for an existing species
                    </Button>
                  </div>
                </>
              ) : null}
            </PopoverContent>
          </Popover>

          {selected ? (
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4">
              <SpeciesNames commonName={selected.common_name} latinName={selected.latin_name} />
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

      <Dialog open={speciesSuggestOpen} onOpenChange={setSpeciesSuggestOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggest a new species</DialogTitle>
            <DialogDescription>
              Your suggestion goes to an admin for review before it appears in the catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="s-cn">Common name</Label>
              <Input id="s-cn" value={newCommon} onChange={(e) => setNewCommon(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-lat">Latin name</Label>
              <Input
                id="s-lat"
                value={newLatin}
                onChange={(e) => setNewLatin(e.target.value)}
                placeholder="e.g. Bos taurus"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-alt">Alternative names (optional)</Label>
              <Input
                id="s-alt"
                value={newAltNames}
                onChange={(e) => setNewAltNames(e.target.value)}
                placeholder="beef, burger, steak"
              />
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
            <div className="grid gap-2">
              <Label htmlFor="s-notes">Notes (optional)</Label>
              <textarea
                id="s-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={suggestionNotes}
                onChange={(e) => setSuggestionNotes(e.target.value)}
                placeholder="Why should this species be added? Source or context…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={onSubmitSpeciesSuggestion}
              disabled={submittingSpecies || !newCommon.trim() || !newLatin.trim()}
            >
              {submittingSpecies ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aliasSuggestOpen} onOpenChange={setAliasSuggestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest an alias</DialogTitle>
            <DialogDescription>
              Help others find a species by another name (e.g. &quot;rocket&quot; for arugula).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Find species</Label>
              {aliasTarget ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Selected</p>
                  <SpeciesNames commonName={aliasTarget.common_name} latinName={aliasTarget.latin_name} />
                </div>
              ) : null}
              <Command shouldFilter={false} className="rounded-md border">
                <CommandInput
                  placeholder="Search existing species…"
                  value={aliasSpeciesQuery}
                  onValueChange={setAliasSpeciesQuery}
                />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                    {aliasSpeciesLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching…
                      </span>
                    ) : (
                      "Type to search species."
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {!aliasSpeciesLoading &&
                      aliasSpeciesResults.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id}
                          onSelect={() => setAliasTarget(s)}
                          onMouseDown={(e) => e.preventDefault()}
                          className={`flex cursor-pointer flex-col items-start gap-0.5 py-3 ${
                            aliasTarget?.id === s.id ? "bg-accent" : ""
                          }`}
                        >
                          <SpeciesNames commonName={s.common_name} latinName={s.latin_name} />
                          <p className="text-xs capitalize text-muted-foreground">{s.category}</p>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alias-input">Suggested alias</Label>
              <Input
                id="alias-input"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. rocket"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={onSubmitAliasSuggestion}
              disabled={submittingAlias || !aliasTarget || !aliasInput.trim()}
            >
              {submittingAlias ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
