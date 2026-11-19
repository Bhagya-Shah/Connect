import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Nutritionist } from "@/lib/types";

type Profile = { id: string; role: "nutritionist" | "client" | null; full_name: string | null; phone: string | null };

/** One lookup per request, shared by the layout and the page. */
export const getUserAndProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, me: null };
  const [{ data: profile }, { data: me }] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name, phone").eq("id", user.id).single<Profile>(),
    supabase.from("nutritionists").select("id, practice_name, city, qualification, meet_url, session_minutes, chat_start, chat_end").eq("id", user.id).maybeSingle<Nutritionist>(),
  ]);
  return { supabase, user, profile, me };
});

/** For nutritionist pages. Sends people to the right place when they are not one. */
export async function requireNutritionist() {
  const { supabase, user, profile, me } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role === "client") redirect("/me");
  if (profile?.role !== "nutritionist" || !me) redirect("/onboarding");
  return { supabase, user, profile: profile!, me };
}

export async function requireClient() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role === "nutritionist") redirect("/pro");
  if (profile?.role !== "client") redirect("/onboarding");
  return { supabase, user, profile: profile! };
}

/** The client's nutritionist (the app is one practice per client). */
export const getMyNutritionist = cache(async () => {
  const { supabase, user } = await requireClient();
  const { data } = await supabase.from("client_links")
    .select("nutritionist_id, program, goal, start_weight, target_weight, height_cm, n:nutritionist_id(practice_name, meet_url, chat_start, chat_end, profiles(full_name, phone))")
    .eq("client_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const n = data.n as unknown as { practice_name: string | null; meet_url: string | null; chat_start: string | null; chat_end: string | null; profiles: { full_name: string | null; phone: string | null } };
  return { ...data, id: data.nutritionist_id, name: n?.profiles?.full_name || "Your nutritionist", practice: n?.practice_name, chat_start: n?.chat_start, chat_end: n?.chat_end };
});
