"use server";
import { createClient } from "@/lib/supabase/server";

/** Saves the nutritionist's call notes to the client's private notes. */
export async function saveCallNote(bookingId: string, body: string): Promise<{ ok?: true; error?: string }> {
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  const { data: b } = await supabase.from("bookings").select("client_id, nutritionist_id, service_name, starts_at").eq("id", bookingId).maybeSingle();
  if (!b || b.nutritionist_id !== user.id) return { error: "Only the nutritionist can save notes." };
  const day = new Date(b.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  const { error } = await supabase.from("notes").insert({ nutritionist_id: user.id, client_id: b.client_id, body: `Call ${day} (${b.service_name}): ${text}` });
  return error ? { error: "Couldn't save. Try again." } : { ok: true };
}
