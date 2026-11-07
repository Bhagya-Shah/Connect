import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSubscription, paymentsLive, verifyPaymentSignature, verifySubscriptionSignature } from "@/lib/razorpay";
import { markPaid } from "@/lib/payments";

export async function POST(req: Request) {
  if (!paymentsLive()) return NextResponse.json({ error: "Payments are in test mode" }, { status: 400 });
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  if (body.kind === "order") {
    const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s, bookingId } = body;
    if (!verifyPaymentSignature(o, p, s)) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    const { data: pay } = await createAdminClient().from("payments").select("booking_id, client_id").eq("razorpay_order_id", o).single();
    if (!pay || pay.booking_id !== bookingId || pay.client_id !== user.id) return NextResponse.json({ error: "Unknown order" }, { status: 400 });
    await markPaid({ bookingId, orderId: o, paymentId: p });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "subscription") {
    const { razorpay_payment_id: p, razorpay_subscription_id: sub, razorpay_signature: s } = body;
    if (!verifySubscriptionSignature(p, sub, s)) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    const admin = createAdminClient();
    const { data: n } = await admin.from("nutritionists").select("razorpay_subscription_id").eq("id", user.id).single();
    if (n?.razorpay_subscription_id !== sub) return NextResponse.json({ error: "Unknown subscription" }, { status: 400 });
    const details = await fetchSubscription(sub);
    await admin.from("nutritionists").update({ plan: details.notes?.plan, plan_renews_at: details.current_end ? new Date(details.current_end * 1000).toISOString() : null }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}
