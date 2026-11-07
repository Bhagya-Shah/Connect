"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function book(_: { error?: string } | undefined, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in first." };
  const slot = String(form.get("slot") || "");
  if (!slot) return { error: "Pick a time." };
  const name = String(form.get("name") || "").trim();
  if (name) await supabase.from("profiles").update({ full_name: name }).eq("id", user.id).is("full_name", null);
  const intake = {
    goal: String(form.get("goal") || ""), food_type: String(form.get("food_type") || ""),
    conditions: form.getAll("conditions").map(String).join(", "), height_cm: String(form.get("height") || ""),
    weight: String(form.get("weight") || ""), note: String(form.get("note") || "").slice(0, 1000),
  };
  const { data: id, error } = await supabase.rpc("create_booking", { p_service: String(form.get("service")), p_starts: slot, p_intake: intake });
  if (error) return { error: error.message };
  const { data: b } = await supabase.from("bookings").select("status").eq("id", id).single();
  redirect(b?.status === "pending_payment" ? `/pay/${id}` : `/me/account?booked=${id}`);
}
