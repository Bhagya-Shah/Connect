import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Sends a logged-in person to their home: nutritionist, client, or onboarding. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(request.url);
  if (!user) return NextResponse.redirect(new URL("/login", url));
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const to = p?.role === "nutritionist" ? "/pro" : p?.role === "client" ? "/me" : "/onboarding";
  return NextResponse.redirect(new URL(to, url));
}
