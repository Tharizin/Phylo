import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-20">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Phylo</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Eat the diversity of the living world.</h1>
        <p className="text-lg text-muted-foreground">
          Log foods at the species level, grow your weekly roster of plants, animals, and fungi, and see how your plate
          compares—without any corporate food database. Every species starts with someone in the community.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
