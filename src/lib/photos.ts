import type { SupabaseClient } from "@supabase/supabase-js";

/** Signed links for private meal photos (valid 1 hour). */
export async function photoUrls(supabase: SupabaseClient, paths: (string | null)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (!list.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from("meal-photos").createSignedUrls(list, 3600);
  const out: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}
