import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUserAndProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile };
}

/** For nutritionist pages. Sends people to the right place when they are not one. */
export async function requireNutritionist() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "nutritionist") redirect(profile?.role === "client" ? "/me" : "/onboarding");
  const { data: me } = await supabase.from("nutritionists").select("*").eq("id", user.id).single();
  if (!me) redirect("/onboarding");
  return { supabase, user, profile: profile!, me };
}

export async function requireClient() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role === "nutritionist") redirect("/pro");
  if (!profile?.role) redirect("/onboarding");
  return { supabase, user, profile: profile! };
}
