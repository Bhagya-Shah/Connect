import type { SupabaseClient } from "@supabase/supabase-js";

async function signed(supabase: SupabaseClient, bucket: string, paths: (string | null)[], opts?: { download?: boolean }) {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!list.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(list, 3600, opts);
  const out: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

/** Signed links for private meal photos (valid 1 hour). */
export const photoUrls = (supabase: SupabaseClient, paths: (string | null)[]) => signed(supabase, "meal-photos", paths);

/** Signed links to open shared files (valid 1 hour). */
export const fileUrls = (supabase: SupabaseClient, paths: (string | null)[]) => signed(supabase, "client-files", paths);
