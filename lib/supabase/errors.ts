/** True when PostgREST/Supabase reports a missing column, table, or function. */
export function isSchemaMissingError(message: string): boolean {
  return /could not find|does not exist|schema cache|column.*not found/i.test(message);
}
