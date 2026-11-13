import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder, paymentsLive } from "@/lib/razorpay";
import { feeFor } from "@/lib/payments";

export async function POST(req: Request) {
  if (!paymentsLive()) return NextResponse.json({ error: "Payments are in test mode" }, { status: 400 });
  const { bookingId } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).eq("client_id", user.id).single();
  if (!b || b.status !== "pending_payment") return NextResponse.json({ error: "This booking can't be paid" }, { status: 400 });
  const { fee, linkedAccount } = await feeFor(b);
  try {
    const order = await createOrder({ amountRupees: b.amount, feeRupees: fee, receipt: b.id.slice(0, 32), linkedAccount, notes: { booking_id: b.id } });
    await createAdminClient().from("payments").insert({ booking_id: b.id, nutritionist_id: b.nutritionist_id, client_id: b.client_id, amount: b.amount, platform_fee: fee, razorpay_order_id: order.id });
    return NextResponse.json({ order_id: order.id, amount: order.amount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
