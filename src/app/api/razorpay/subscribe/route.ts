import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSubscription, paymentsLive } from "@/lib/razorpay";

const PLAN_IDS: Record<string, string | undefined> = {
  growth: process.env.RAZORPAY_PLAN_GROWTH, pro: process.env.RAZORPAY_PLAN_PRO, clinic: process.env.RAZORPAY_PLAN_CLINIC,
};

export async function POST(req: Request) {
  if (!paymentsLive()) return NextResponse.json({ error: "Payments are in test mode" }, { status: 400 });
  const { plan } = await req.json();
  const planId = PLAN_IDS[plan];
  if (!planId) return NextResponse.json({ error: "This plan is not set up in Razorpay yet" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  try {
    const sub = await createSubscription(planId, { nutritionist_id: user.id, plan });
    await createAdminClient().from("nutritionists").update({ razorpay_subscription_id: sub.id }).eq("id", user.id);
    return NextResponse.json({ subscription_id: sub.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
