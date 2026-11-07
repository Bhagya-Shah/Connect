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
