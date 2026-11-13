import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhook } from "@/lib/razorpay";
import { markPaid } from "@/lib/payments";

/** Razorpay webhook: Dashboard > Webhooks, events payment.captured, subscription.charged, subscription.cancelled, subscription.halted. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-razorpay-signature") || "")) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  const evt = JSON.parse(raw);
  const admin = createAdminClient();
  if (evt.event === "payment.captured") {
    const p = evt.payload.payment.entity;
    const { data: pay } = await admin.from("payments").select("booking_id").eq("razorpay_order_id", p.order_id).maybeSingle();
    if (pay?.booking_id) await markPaid({ bookingId: pay.booking_id, orderId: p.order_id, paymentId: p.id });
  }
  if (evt.event?.startsWith("subscription.")) {
    const s = evt.payload.subscription.entity;
    const nid = s.notes?.nutritionist_id;
    if (nid) {
      if (evt.event === "subscription.charged" || evt.event === "subscription.activated") {
        await admin.from("nutritionists").update({ plan: s.notes.plan, plan_renews_at: s.current_end ? new Date(s.current_end * 1000).toISOString() : null }).eq("id", nid).eq("razorpay_subscription_id", s.id);
      }
      if (["subscription.cancelled", "subscription.halted", "subscription.completed"].includes(evt.event)) {
        await admin.from("nutritionists").update({ plan: "starter", plan_renews_at: null }).eq("id", nid).eq("razorpay_subscription_id", s.id);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
