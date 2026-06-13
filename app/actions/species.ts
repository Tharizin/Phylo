"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSchemaMissingError } from "@/lib/supabase/errors";

export type SpeciesSearchRow = {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string;
};

function parseAlternativeNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function findSpeciesByLatinName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  latinName: string
): Promise<{ id: string; common_name: string; latin_name: string } | null> {
  const trimmed = latinName.trim();
  if (!trimmed) return null;

  const { data } = await supabase
    .from("species")
    .select("id, common_name, latin_name")
    .ilike("latin_name", trimmed)
    .limit(1)
    .maybeSingle();

  return data as { id: string; common_name: string; latin_name: string } | null;
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

export async function searchSpeciesAction(
  query: string,
  limit = 24
): Promise<{ ok: true; results: SpeciesSearchRow[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const term = query.trim();
  const capped = Math.min(Math.max(limit, 1), 50);

  const { data, error } = await supabase.rpc("search_species", {
    search_query: term,
    limit_n: capped,
  });

  if (!error) {
    return {
      ok: true,
      results: ((data ?? []) as SpeciesSearchRow[]).map((row) => ({
        id: row.id,
        common_name: row.common_name,
        latin_name: row.latin_name,
        category: row.category,
      })),
    };
  }

  // Fallback when RPC is unavailable (e.g. migration not yet applied)
  let q = supabase
    .from("species")
    .select("id, common_name, latin_name, category")
    .order("common_name", { ascending: true })
    .limit(capped);

  if (term) {
    const pattern = `%${term}%`;
    q = q.or(`common_name.ilike.${pattern},latin_name.ilike.${pattern}`);
  }

  const { data: fallback, error: fbErr } = await q;
  if (fbErr) return { ok: false, error: fbErr.message };
  return { ok: true, results: (fallback ?? []) as SpeciesSearchRow[] };
}

export async function addAlternativeNameAction(
  speciesId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a name to add." };

  const { data: species, error: fetchErr } = await supabase
    .from("species")
    .select("common_name, latin_name, alternative_names")
    .eq("id", speciesId)
    .maybeSingle();

  if (fetchErr) {
    if (isSchemaMissingError(fetchErr.message)) {
      return { ok: false, error: "Alternative names require a database update. Run apply_to_existing_db.sql." };
    }
    return { ok: false, error: fetchErr.message };
  }
  if (!species) return { ok: false, error: "Species not found." };

  if (nameAlreadyListed(trimmed, species as { common_name: string; latin_name: string | null; alternative_names: string[] })) {
    return { ok: false, error: "That name is already listed for this species." };
  }

  const current = (species.alternative_names as string[] | null) ?? [];
  const { error } = await supabase
    .from("species")
    .update({ alternative_names: [...current, trimmed] })
    .eq("id", speciesId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createSpeciesAction(input: {
  commonName: string;
  latinName: string;
  category: "plant" | "animal" | "fungus" | "other";
  alternativeNames?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const name = input.commonName.trim();
  if (!name) return { ok: false, error: "Common name is required." };

  const latin = input.latinName.trim();
  if (!latin) return { ok: false, error: "Latin name is required." };

  const existing = await findSpeciesByLatinName(supabase, latin);
  if (existing) {
    return {
      ok: false,
      error: `This species already exists as “${existing.common_name}” (${existing.latin_name}). Log that entry instead of creating a duplicate.`,
    };
  }

  const altNames = input.alternativeNames ? parseAlternativeNames(input.alternativeNames) : [];

  let { data, error } = await supabase
    .from("species")
    .insert({
      common_name: name,
      latin_name: latin,
      category: input.category,
      alternative_names: altNames,
      added_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (error && isSchemaMissingError(error.message)) {
    ({ data, error } = await supabase
      .from("species")
      .insert({
        common_name: name,
        latin_name: latin,
        category: input.category,
        added_by_user_id: user.id,
      })
      .select("id")
      .single());
  }

  if (error?.code === "23505" || error?.message?.includes("species_latin_name_unique")) {
    const dupe = await findSpeciesByLatinName(supabase, latin);
    return {
      ok: false,
      error: dupe
        ? `This species already exists as “${dupe.common_name}” (${dupe.latin_name}).`
        : "A species with this latin name already exists.",
    };
  }

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/species");
  return { ok: true, id: data.id as string };
}

export async function adminUpdateSpeciesAction(input: {
  id: string;
  commonName?: string;
  latinName?: string | null;
  category?: "plant" | "animal" | "fungus" | "other";
  alternativeNames?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false, error: "Forbidden" };

  const patch: Record<string, unknown> = {};
  if (input.commonName !== undefined) patch.common_name = input.commonName.trim();
  if (input.latinName !== undefined) patch.latin_name = input.latinName?.trim() || null;
  if (input.category) patch.category = input.category;
  if (input.alternativeNames !== undefined) {
    patch.alternative_names = parseAlternativeNames(input.alternativeNames);
  }

  const { error } = await supabase.from("species").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/history");
  return { ok: true };
}

export async function adminMergeSpeciesAction(input: {
  keepSpeciesId: string;
  mergeSpeciesId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false, error: "Forbidden" };

  if (input.keepSpeciesId === input.mergeSpeciesId) return { ok: false, error: "Choose two different species." };

  const { error: uErr } = await supabase
    .from("food_logs")
    .update({ species_id: input.keepSpeciesId })
    .eq("species_id", input.mergeSpeciesId);
  if (uErr) return { ok: false, error: uErr.message };

  const { error: dErr } = await supabase.from("species").delete().eq("id", input.mergeSpeciesId);
  if (dErr) return { ok: false, error: dErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/species");
  return { ok: true };
}

export async function adminDeleteSpeciesAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return { ok: false, error: "Forbidden" };

  const { count, error: cErr } = await supabase
    .from("food_logs")
    .select("id", { count: "exact", head: true })
    .eq("species_id", id);
  if (cErr) return { ok: false, error: cErr.message };
  if ((count ?? 0) > 0) return { ok: false, error: "Reassign or merge logs before deleting this species." };

  const { error } = await supabase.from("species").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
