import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettings } from "@/components/profile-settings";

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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your account settings and profile photo.</p>
      </div>
      <ProfileSettings username={username} avatarUrl={avatarUrl} email={user.email ?? ""} />
    </div>
  );
}
