"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSchemaMissingError } from "@/lib/supabase/errors";

export type SpeciesSuggestionRow = {
  id: string;
  submitted_by: string;
  common_name: string;
  latin_name: string | null;
  category: string;
  alternative_names: string[];
  notes: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type AliasSuggestionRow = {
  id: string;
  submitted_by: string;
  species_id: string;
  suggested_alias: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  species: { common_name: string; latin_name: string | null };
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized", supabase: null };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false as const, error: "Forbidden", supabase: null };

  return { ok: true as const, supabase, userId: user.id };
}

function parseAlternativeNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function nameAlreadyListed(
  name: string,
  species: { common_name: string; latin_name: string | null; alternative_names?: string[] | null }
): boolean {
  const n = normalizeName(name);
  if (normalizeName(species.common_name) === n) return true;
  if (species.latin_name && normalizeName(species.latin_name) === n) return true;
  return (species.alternative_names ?? []).some((a) => normalizeName(a) === n);
}

export async function submitSpeciesSuggestionAction(input: {
  commonName: string;
  latinName: string;
  category: "plant" | "animal" | "fungus" | "other";
  alternativeNames?: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const commonName = input.commonName.trim();
  const latinName = input.latinName.trim();
  if (!commonName) return { ok: false, error: "Common name is required." };
  if (!latinName) return { ok: false, error: "Latin name is required." };

  const { data: existingSpecies } = await supabase
    .from("species")
    .select("common_name, latin_name")
    .ilike("latin_name", latinName)
    .limit(1)
    .maybeSingle();

  if (existingSpecies) {
    return {
      ok: false,
      error: `This species is already in the catalog as “${existingSpecies.common_name as string}” (${existingSpecies.latin_name as string}). Log that entry instead.`,
    };
  }

  const { error } = await supabase.from("species_suggestions").insert({
    submitted_by: user.id,
    common_name: commonName,
    latin_name: latinName,
    category: input.category,
    alternative_names: input.alternativeNames ? parseAlternativeNames(input.alternativeNames) : [],
    notes: input.notes?.trim() || null,
    status: "pending",
  });

  if (error) {
    if (isSchemaMissingError(error.message)) {
      return { ok: false, error: "Suggestion queue is not set up yet. Ask an admin to run species_suggestions.sql." };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function submitAliasSuggestionAction(input: {
  speciesId: string;
  suggestedAlias: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const alias = input.suggestedAlias.trim();
  if (!alias) return { ok: false, error: "Enter an alias to suggest." };

  const { data: species, error: spErr } = await supabase
    .from("species")
    .select("common_name, latin_name, alternative_names")
    .eq("id", input.speciesId)
    .maybeSingle();

  if (spErr || !species) return { ok: false, error: "Species not found." };

  if (
    nameAlreadyListed(alias, species as { common_name: string; latin_name: string | null; alternative_names: string[] })
  ) {
    return { ok: false, error: "That name is already listed for this species." };
  }

  const { error } = await supabase.from("alias_suggestions").insert({
    submitted_by: user.id,
    species_id: input.speciesId,
    suggested_alias: alias,
    status: "pending",
  });

  if (error) {
    if (isSchemaMissingError(error.message)) {
      return { ok: false, error: "Suggestion queue is not set up yet. Ask an admin to run species_suggestions.sql." };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function adminApproveSpeciesSuggestionAction(
  id: string
): Promise<{ ok: true; speciesId: string } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: suggestion, error: fetchErr } = await supabase
    .from("species_suggestions")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!suggestion) return { ok: false, error: "Pending suggestion not found." };

  const latin = (suggestion.latin_name as string | null)?.trim();
  if (!latin) return { ok: false, error: "Suggestion is missing a latin name." };

  const { data: existing } = await supabase
    .from("species")
    .select("id, common_name")
    .ilike("latin_name", latin)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: `Species already exists as “${existing.common_name}”. Reject this suggestion instead.`,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("species")
    .insert({
      common_name: suggestion.common_name as string,
      latin_name: latin,
      category: suggestion.category as string,
      alternative_names: (suggestion.alternative_names as string[] | null) ?? [],
      added_by_user_id: suggestion.submitted_by as string,
    })
    .select("id")
    .single();

  if (insertErr) return { ok: false, error: insertErr.message };

  const { error: updateErr } = await supabase
    .from("species_suggestions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewer_notes: null })
    .eq("id", id);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/species");
  return { ok: true, speciesId: inserted.id as string };
}

export async function adminRejectSpeciesSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { error } = await supabase
    .from("species_suggestions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewer_notes: input.reviewerNotes?.trim() || null,
    })
    .eq("id", input.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminApproveAliasSuggestionAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: suggestion, error: fetchErr } = await supabase
    .from("alias_suggestions")
    .select("id, species_id, suggested_alias")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!suggestion) return { ok: false, error: "Pending suggestion not found." };

  const alias = (suggestion.suggested_alias as string).trim();
  const speciesId = suggestion.species_id as string;

  const { data: species, error: spErr } = await supabase
    .from("species")
    .select("common_name, latin_name, alternative_names")
    .eq("id", speciesId)
    .maybeSingle();

  if (spErr || !species) return { ok: false, error: "Species not found." };

  if (
    nameAlreadyListed(alias, species as { common_name: string; latin_name: string | null; alternative_names: string[] })
  ) {
    return { ok: false, error: "That alias is already listed for this species." };
  }

  const current = (species.alternative_names as string[] | null) ?? [];
  const { error: updateSpeciesErr } = await supabase
    .from("species")
    .update({ alternative_names: [...current, alias] })
    .eq("id", speciesId);

  if (updateSpeciesErr) return { ok: false, error: updateSpeciesErr.message };

  const { error: updateErr } = await supabase
    .from("alias_suggestions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewer_notes: null })
    .eq("id", id);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminRejectAliasSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { error } = await supabase
    .from("alias_suggestions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewer_notes: input.reviewerNotes?.trim() || null,
    })
    .eq("id", input.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
