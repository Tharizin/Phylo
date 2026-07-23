import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpeciesJoin } from "@/lib/supabase/relations";
import { ProfileSettings } from "@/components/profile-settings";
import { MySuggestions } from "@/components/my-suggestions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let username = user.email?.split("@")[0] ?? "User";
  let avatarUrl: string | null = null;

  const withAv = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single();
  if (!withAv.error && withAv.data) {
    username = withAv.data.username as string;
    avatarUrl = (withAv.data.avatar_url as string | null) ?? null;
  } else {
    const basic = await supabase.from("profiles").select("username").eq("id", user.id).single();
    if (!basic.error && basic.data) username = basic.data.username as string;
  }

  const { data: speciesSuggestions } = await supabase
    .from("species_suggestions")
    .select("*")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });

  const { data: aliasSuggestionsRaw } = await supabase
    .from("alias_suggestions")
    .select("*, species ( common_name, latin_name )")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your account settings, profile photo, and suggestion history.</p>
      </div>
      <ProfileSettings username={username} avatarUrl={avatarUrl} email={user.email ?? ""} />
      <MySuggestions
        speciesSuggestions={(speciesSuggestions ?? []).map((s) => ({
          id: s.id as string,
          submitted_by: s.submitted_by as string,
          common_name: s.common_name as string,
          latin_name: (s.latin_name as string | null) ?? null,
          category: s.category as string,
          alternative_names: (s.alternative_names as string[] | null) ?? [],
          notes: (s.notes as string | null) ?? null,
          status: s.status as string,
          reviewer_notes: (s.reviewer_notes as string | null) ?? null,
          created_at: s.created_at as string,
          reviewed_at: (s.reviewed_at as string | null) ?? null,
        }))}
        aliasSuggestions={(aliasSuggestionsRaw ?? []).map((s) => ({
          id: s.id as string,
          submitted_by: s.submitted_by as string,
          species_id: s.species_id as string,
          suggested_alias: s.suggested_alias as string,
          status: s.status as string,
          reviewer_notes: (s.reviewer_notes as string | null) ?? null,
          created_at: s.created_at as string,
          reviewed_at: (s.reviewed_at as string | null) ?? null,
          species: normalizeSpeciesJoin(s.species) as { common_name: string; latin_name: string | null },
        }))}
      />
    </div>
  );
}
