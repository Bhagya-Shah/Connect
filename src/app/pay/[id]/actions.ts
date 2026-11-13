"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentsLive } from "@/lib/razorpay";
import { markPaid } from "@/lib/payments";

/** Test mode only (no Razorpay keys): pretend the payment succeeded. */
export async function payTest(bookingId: string) {
  if (paymentsLive()) throw new Error("Real payments are on");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: b } = await supabase.from("bookings").select("id, client_id").eq("id", bookingId).single();
  if (!user || !b || b.client_id !== user.id) throw new Error("Not your booking");
  await markPaid({ bookingId, orderId: `test_${bookingId.slice(0, 8)}`, paymentId: `test_pay_${Date.now()}` });
  redirect(`/me/account?booked=${bookingId}`);
}
