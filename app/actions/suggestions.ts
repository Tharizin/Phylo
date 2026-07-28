"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SpeciesCategoryValue } from "@/lib/categories";
import { isSchemaMissingError } from "@/lib/supabase/errors";
import { requireAdminProfile } from "@/lib/supabase/admin-auth";

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
  notified?: boolean;
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
  notified?: boolean;
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

  const prof = await requireAdminProfile(supabase, user.id);
  if (!prof) return { ok: false as const, error: "Forbidden", supabase: null };

  return { ok: true as const, supabase, userId: user.id };
}

function parseAlternativeNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function markSuggestionRejected(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "species_suggestions" | "alias_suggestions",
  id: string,
  reviewerNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = {
    status: "rejected" as const,
    reviewed_at: new Date().toISOString(),
    reviewer_notes: reviewerNotes?.trim() || null,
    notified: false,
  };

  const { error } = await supabase.from(table).update(payload).eq("id", id).eq("status", "pending");
  if (!error) return { ok: true };

  if (isSchemaMissingError(error.message)) {
    const { notified: _notified, ...withoutNotified } = payload;
    const retry = await supabase.from(table).update(withoutNotified).eq("id", id).eq("status", "pending");
    if (retry.error) return { ok: false, error: retry.error.message };
    return { ok: true };
  }

  return { ok: false, error: error.message };
}

async function markSuggestionApproved(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "species_suggestions" | "alias_suggestions",
  id: string,
  reviewerNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = {
    status: "approved" as const,
    reviewed_at: new Date().toISOString(),
    reviewer_notes: reviewerNotes?.trim() || null,
    notified: false,
  };

  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (!error) return { ok: true };

  if (isSchemaMissingError(error.message)) {
    const { notified: _notified, ...withoutNotified } = payload;
    const retry = await supabase.from(table).update(withoutNotified).eq("id", id);
    if (retry.error) return { ok: false, error: retry.error.message };
    return { ok: true };
  }

  return { ok: false, error: error.message };
}

const REVIEWED_STATUSES = ["approved", "rejected"] as const;

async function countUnreadSuggestionReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const [speciesRes, aliasRes] = await Promise.all([
    supabase
      .from("species_suggestions")
      .select("id")
      .eq("submitted_by", userId)
      .in("status", [...REVIEWED_STATUSES])
      .eq("notified", false),
    supabase
      .from("alias_suggestions")
      .select("id")
      .eq("submitted_by", userId)
      .in("status", [...REVIEWED_STATUSES])
      .eq("notified", false),
  ]);

  if (speciesRes.error) {
    if (isSchemaMissingError(speciesRes.error.message)) return { ok: true, count: 0 };
    return { ok: false, error: speciesRes.error.message };
  }
  if (aliasRes.error) {
    if (isSchemaMissingError(aliasRes.error.message)) return { ok: true, count: 0 };
    return { ok: false, error: aliasRes.error.message };
  }

  return { ok: true, count: (speciesRes.data?.length ?? 0) + (aliasRes.data?.length ?? 0) };
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
  category: SpeciesCategoryValue;
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

  revalidatePath("/profile");
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

  revalidatePath("/profile");
  return { ok: true };
}

export async function adminApproveSpeciesSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true; speciesId: string } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: suggestion, error: fetchErr } = await supabase
    .from("species_suggestions")
    .select("*")
    .eq("id", input.id)
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

  const approval = await markSuggestionApproved(supabase, "species_suggestions", input.id, input.reviewerNotes);
  if (!approval.ok) return { ok: false, error: approval.error };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/species");
  revalidatePath("/profile");
  return { ok: true, speciesId: inserted.id as string };
}

export async function adminRejectSpeciesSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const rejection = await markSuggestionRejected(supabase, "species_suggestions", input.id, input.reviewerNotes);
  if (!rejection.ok) return { ok: false, error: rejection.error };

  revalidatePath("/admin");
  revalidatePath("/profile");
  return { ok: true };
}

export async function adminApproveAliasSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: suggestion, error: fetchErr } = await supabase
    .from("alias_suggestions")
    .select("id, species_id, suggested_alias")
    .eq("id", input.id)
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

  const approval = await markSuggestionApproved(supabase, "alias_suggestions", input.id, input.reviewerNotes);
  if (!approval.ok) return { ok: false, error: approval.error };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true };
}

export async function adminRejectAliasSuggestionAction(input: {
  id: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const rejection = await markSuggestionRejected(supabase, "alias_suggestions", input.id, input.reviewerNotes);
  if (!rejection.ok) return { ok: false, error: rejection.error };

  revalidatePath("/admin");
  revalidatePath("/profile");
  return { ok: true };
}

export async function getUnreadApprovedSuggestionCountAction(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true, count: 0 };

  return countUnreadSuggestionReviews(supabase, user.id);
}

export async function markSuggestionsNotifiedAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const [speciesRes, aliasRes] = await Promise.all([
    supabase
      .from("species_suggestions")
      .update({ notified: true })
      .eq("submitted_by", user.id)
      .in("status", [...REVIEWED_STATUSES])
      .eq("notified", false),
    supabase
      .from("alias_suggestions")
      .update({ notified: true })
      .eq("submitted_by", user.id)
      .in("status", [...REVIEWED_STATUSES])
      .eq("notified", false),
  ]);

  if (speciesRes.error) {
    if (isSchemaMissingError(speciesRes.error.message)) return { ok: true };
    return { ok: false, error: speciesRes.error.message };
  }
  if (aliasRes.error) {
    if (isSchemaMissingError(aliasRes.error.message)) return { ok: true };
    return { ok: false, error: aliasRes.error.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}
