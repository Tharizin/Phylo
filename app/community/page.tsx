import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunityUsersAction } from "@/app/actions/community";
import { CommunityPanel } from "@/components/community-panel";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getCommunityUsersAction();

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-destructive">Could not load community: {result.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Community</h1>
        <p className="mt-2 text-muted-foreground">
          Find other Phylo members, send friend requests, and see how everyone is diversifying their diet.
        </p>
        {result.partial ? (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Community stats for other users require a database update. Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/apply_to_existing_db.sql</code> in the
            Supabase SQL editor, then reload the API schema (Settings → API → Reload schema).
          </p>
        ) : null}
      </div>
      <CommunityPanel currentUserId={user.id} users={result.users} />
    </div>
  );
}
