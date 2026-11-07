"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/constants";

export type R = { ok?: boolean; error?: string } | undefined;

export async function logWeight(_: R, form: FormData): Promise<R> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  const weight = parseFloat(String(form.get("weight") || ""));
  const waist = parseFloat(String(form.get("waist") || ""));
  if (!(weight >= 20 && weight <= 300)) return { error: "Enter your weight in kg." };
  const { error } = await supabase.from("weight_logs").upsert({ client_id: user.id, log_date: todayIST(), weight, waist: isNaN(waist) ? null : waist }, { onConflict: "client_id,log_date" });
  if (error) return { error: error.message };
  revalidatePath("/me/progress");
  return { ok: true };
}

export async function sendCheckin(_: R, form: FormData): Promise<R> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  const { error } = await supabase.from("checkins").insert({
    client_id: user.id, nutritionist_id: String(form.get("nutritionist")),
    energy: parseInt(String(form.get("energy") || "3")), hunger: parseInt(String(form.get("hunger") || "3")),
    note: String(form.get("note") || "").trim() || null,
  });
  if (error) return { error: "Check-in not sent. Try again." };
  return { ok: true };
}

/* ---------- Therapy ---------- */
export async function logMood(_: R, form: FormData): Promise<R> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  const mood = parseInt(String(form.get("mood") || ""));
  if (!(mood >= 1 && mood <= 5)) return { error: "Pick how you feel." };
  const { error } = await supabase.from("mood_logs").upsert({
    client_id: user.id, log_date: todayIST(), mood,
    feelings: form.getAll("feelings").map(String).slice(0, 12), note: String(form.get("note") || "").trim().slice(0, 2000) || null,
  }, { onConflict: "client_id,log_date" });
  if (error) return { error: "Not saved. Try again." };
  revalidatePath("/me");
  return { ok: true };
}

export async function giveConsent(nutritionistId: string) {
  const supabase = await createClient();
  await supabase.rpc("give_consent", { p_nutritionist: nutritionistId });
  revalidatePath("/me");
}

export async function completeHomework(id: string, reply: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_homework", { p_id: id, p_reply: reply });
  if (error) return { error: "Not saved. Try again." };
  revalidatePath("/me");
  return { ok: true };
}

export async function submitCheckup(id: string, answers: number[]): Promise<{ error?: string; score?: number; risk?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_assessment", { p_id: id, p_answers: answers });
  if (error) return { error: error.message };
  // no revalidate here: the page would swap to "already sent" before the result shows
  return { score: data?.[0]?.score, risk: data?.[0]?.risk };
}

export async function addJournal(_: R, form: FormData): Promise<R> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  const body = String(form.get("body") || "").trim();
  if (!body) return { error: "Write something first." };
  const { error } = await supabase.from("journal_entries").insert({ client_id: user.id, body: body.slice(0, 8000), shared: form.get("shared") === "on" });
  if (error) return { error: "Not saved. Try again." };
  revalidatePath("/me/journal");
  return { ok: true };
}

export async function setJournalShared(id: string, shared: boolean) {
  const supabase = await createClient();
  await supabase.from("journal_entries").update({ shared }).eq("id", id);
  revalidatePath("/me/journal");
}

export async function deleteJournal(id: string) {
  const supabase = await createClient();
  await supabase.from("journal_entries").delete().eq("id", id);
  revalidatePath("/me/journal");
}
