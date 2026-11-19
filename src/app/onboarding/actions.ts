"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanPhone } from "@/lib/constants";

export type FormState = { error?: string } | undefined;

/** First Google sign-in: set up the nutritionist's practice. */
export async function startPractice(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") || "").trim().slice(0, 80);
  if (!name) return { error: "Please enter your name." };
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role === "client") redirect("/me");
  const phone = cleanPhone(String(form.get("phone") || ""));
  const { error: pe } = await supabase.from("profiles").update({ role: "nutritionist", full_name: name, phone: phone || null }).eq("id", user.id);
  if (pe) return { error: pe.message };
  const { error } = await supabase.from("nutritionists").upsert({
    id: user.id, practice_name: String(form.get("practice") || "").trim().slice(0, 80) || null,
    city: String(form.get("city") || "").trim().slice(0, 60) || null, languages: ["English"], food_types: ["Veg"],
  });
  if (error) return { error: error.message };
  redirect("/pro/more?welcome=1");
}
