"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CONSENT } from "@/lib/constants";

export type FormState = { error?: string } | undefined;

export async function startAsNutritionist(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") || "").trim();
  const city = String(form.get("city") || "").trim();
  const handle = String(form.get("handle") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!name) return { error: "Please enter your name." };
  if (handle.length < 3) return { error: "Your link name needs at least 3 letters." };
  const { error: pe } = await supabase.from("profiles").update({ role: "nutritionist", full_name: name }).eq("id", user.id);
  if (pe) return { error: pe.message };
  const psy = form.get("specialty") === "psychology";
  const { error } = await supabase.from("nutritionists").insert(psy
    ? { id: user.id, handle, city, languages: ["English"], food_types: [], specialty: "psychology", session_minutes: 50, consent_text: DEFAULT_CONSENT }
    : { id: user.id, handle, city, languages: ["English"], food_types: ["Veg"] });
  if (error) return { error: error.code === "23505" ? "That link name is taken. Try another." : error.message };
  // sensible defaults they can change later
  const windows = [1, 2, 3, 4, 5, 6].flatMap((d) => [{ weekday: d, start_time: "10:00", end_time: "13:00" }, { weekday: d, start_time: "16:00", end_time: "19:00" }]);
  await supabase.from("availability").insert(windows.map((w) => ({ ...w, nutritionist_id: user.id })));
  await supabase.from("services").insert(psy ? [
    { nutritionist_id: user.id, name: "Free 15 min intro call", type: "call", details: "See if we are a good fit", price: 0 },
    { nutritionist_id: user.id, name: "Therapy session", type: "call", details: "50 min video session", price: 1200 },
  ] : [
    { nutritionist_id: user.id, name: "First consultation", type: "call", details: "45 min video call", price: 999 },
    { nutritionist_id: user.id, name: "Free 10 min intro call", type: "call", details: "Meet before you decide", price: 0 },
  ]);
  redirect("/pro/business?welcome=1");
}

export async function startAsClient(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Please enter your name." };
  const { error } = await supabase.from("profiles").update({ role: "client", full_name: name }).eq("id", user.id);
  if (error) return { error: error.message };
  const next = String(form.get("next") || "");
  redirect(next.startsWith("/") ? next : "/me");
}
