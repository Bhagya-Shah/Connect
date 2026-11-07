import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentsLive } from "@/lib/razorpay";
import { fmtDate, fmtTime, rs } from "@/lib/constants";
import { Row, TopBar } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";
import { PayButton } from "./PayButton";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pay/${id}`);
  const { data: b } = await supabase.from("bookings").select("*, n:nutritionist_id(profiles(full_name))").eq("id", id).eq("client_id", user.id).single();
  if (!b) notFound();
  if (b.status !== "pending_payment") redirect(`/me/account?booked=${id}`);
  const name = (b.n as unknown as { profiles: { full_name: string } } | null)?.profiles?.full_name;
  return (
    <Shell>
      <TopBar title="Pay" />
      <Body>
        <section className="card">
          <Row label="Service">{b.service_name}</Row>
          <Row label="With">{name}</Row>
          <Row label="When">{fmtDate(b.starts_at)} at {fmtTime(b.starts_at)}</Row>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="font-display">{rs(b.amount)}</span></div>
        </section>
        <span className="text-sm text-muted">Pay by UPI, card or net banking. Your slot is held for you while you pay.</span>
        <PayButton bookingId={id} amount={b.amount} live={paymentsLive()} keyId={process.env.RAZORPAY_KEY_ID} email={user.email} />
      </Body>
    </Shell>
  );
}
