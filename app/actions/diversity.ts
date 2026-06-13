"use server";

import { createClient } from "@/lib/supabase/server";
import { completedWeekStartsToProcess } from "@/lib/diversity";
import { isSchemaMissingError } from "@/lib/supabase/errors";

/** Process diversity multipliers for all completed weeks not yet applied for this user. */
export async function ensureDiversityProcessedAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("diversity_week_processed")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr && isSchemaMissingError(profErr.message)) return;

  const lastProcessed = prof?.diversity_week_processed
    ? new Date(prof.diversity_week_processed as string)
    : null;

  const weeks = completedWeekStartsToProcess(lastProcessed);
  if (!weeks.length) return;

  for (const weekStart of weeks) {
    const { error } = await supabase.rpc("apply_weekly_diversity_multiplier", {
      p_user_id: user.id,
      p_week_start: weekStart.toISOString(),
    });
    if (error && isSchemaMissingError(error.message)) return;
  }

  const latest = weeks[weeks.length - 1];
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ diversity_week_processed: latest.toISOString() })
    .eq("id", user.id);

  if (updErr && isSchemaMissingError(updErr.message)) return;
}
