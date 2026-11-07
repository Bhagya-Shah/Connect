import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, SEARCH_COMMISSION, type PlanId } from "@/lib/constants";

/** Connect's cut of a booking: plan fee (Starter 5%), or 10% for clients who came from search, whichever is higher. */
export async function feeFor(booking: { nutritionist_id: string; client_id: string; amount: number }) {
  const admin = createAdminClient();
  const [{ data: n }, { data: link }] = await Promise.all([
    admin.from("nutritionists").select("plan, razorpay_account_id").eq("id", booking.nutritionist_id).single(),
    admin.from("client_links").select("source").eq("nutritionist_id", booking.nutritionist_id).eq("client_id", booking.client_id).maybeSingle(),
  ]);
  const rate = Math.max(PLANS[(n?.plan ?? "starter") as PlanId].fee, link?.source === "search" ? SEARCH_COMMISSION : 0);
  return { fee: Math.round(booking.amount * rate), linkedAccount: n?.razorpay_account_id ?? null };
}

/** Mark a booking paid. Safe to call twice (from the checkout callback and the webhook). */
export async function markPaid(opts: { bookingId: string; orderId?: string; paymentId?: string }) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("*").eq("id", opts.bookingId).single();
  if (!b) return;
  const { data: existing } = await admin.from("payments").select("id, status").eq("booking_id", b.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.status === "paid") return;
  const { fee } = await feeFor(b);
  if (existing) {
    await admin.from("payments").update({ status: "paid", razorpay_payment_id: opts.paymentId ?? null, platform_fee: fee }).eq("id", existing.id);
  } else {
    await admin.from("payments").insert({ booking_id: b.id, nutritionist_id: b.nutritionist_id, client_id: b.client_id, amount: b.amount, platform_fee: fee, status: "paid", razorpay_order_id: opts.orderId ?? null, razorpay_payment_id: opts.paymentId ?? null });
  }
  await admin.from("bookings").update({ status: "confirmed" }).eq("id", b.id).eq("status", "pending_payment");
}
