"use client";
import { useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { payTest } from "./actions";

export function PayButton({ bookingId, amount, live, keyId, email }: { bookingId: string; amount: number; live: boolean; keyId?: string; email?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pay = () => start(async () => {
    setError(null);
    if (!live) { await payTest(bookingId); return; }
    const res = await fetch("/api/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error || "Could not start payment"); return; }
    new window.Razorpay!({
      key: keyId, order_id: j.order_id, amount: j.amount, currency: "INR", name: "Connect", prefill: { email },
      handler: async (r: Record<string, string>) => {
        const v = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "order", bookingId, ...r }) });
        if (v.ok) router.replace(`/me/account?booked=${bookingId}`); else setError("Payment received but not confirmed yet. It will update in a minute.");
      },
    }).open();
  });
  return (
    <>
      {live && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}
      <button className="btn" onClick={pay} disabled={pending}>{pending ? "Opening…" : `Pay ₹${amount.toLocaleString("en-IN")}`}</button>
      {!live && <span className="text-center text-xs text-muted">Test mode: no money moves. Add Razorpay keys to take real payments.</span>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </>
  );
}
