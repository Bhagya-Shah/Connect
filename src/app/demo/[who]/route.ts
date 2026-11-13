import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO, demoPassword, ensureDemo, type DemoWho } from "@/lib/demo";

export const maxDuration = 60;

/** One-tap demo login: makes the sample practices if needed, then signs in as one of them. */
export async function GET(request: Request, { params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  const url = new URL(request.url);
  const acc = DEMO[who as DemoWho];
  if (!acc) return NextResponse.redirect(new URL("/login", url));
  try {
    await ensureDemo(createAdminClient(), url.origin);
    const supabase = await createClient();
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: demoPassword(acc.email) });
    if (error) throw error;
  } catch (e) {
    console.error("demo login", e);
    return NextResponse.redirect(new URL("/login?demo=error", url));
  }
  return NextResponse.redirect(new URL("/go", url));
}
