"use client";
import { useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { switchPlanTest } from "../actions";
import { PLANS, planText, rs, type PlanId } from "@/lib/constants";

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } } }

export function PlanPicker({ current, live, keyId, specialty }: { current: PlanId; live: boolean; keyId?: string; specialty?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const choose = (p: PlanId) => start(async () => {
    setError(null);
    if (!live) { await switchPlanTest(p); router.refresh(); return; }
    if (p === "starter") { setError("To move to Starter, cancel your plan from the email Razorpay sent you, or contact support."); return; }
    const res = await fetch("/api/razorpay/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error || "Could not start checkout"); return; }
    new window.Razorpay!({
      key: keyId, subscription_id: j.subscription_id, name: "Connect", description: `${PLANS[p].name} plan`,
      handler: async (r: Record<string, string>) => {
        await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "subscription", plan: p, ...r }) });
        router.refresh();
      },
    }).open();
  });
  return (
    <section id="plan" className="card">
      {live && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}
      <h2 className="h3">Your plan</h2>
      {!live && <p className="rounded-xl bg-saffron-soft p-2.5 text-xs">Test mode: plans switch without payment until Razorpay keys are added.</p>}
      {(Object.keys(PLANS) as PlanId[]).map((p) => {
        const P = { ...PLANS[p], ...planText(p, specialty) }, on = p === current;
        return (
          <div key={p} className={`flex flex-col gap-1.5 rounded-2xl border p-3 ${on ? "border-accent bg-accent-soft" : "border-line"}`}>
            <div className="flex items-baseline gap-2"><b className="flex-1 font-display">{P.name}</b><span className="font-display font-semibold">{P.price ? `${rs(P.price)}/mo` : "Free"}</span></div>
            <span className="text-xs text-muted">{P.blurb}</span>
            <ul className="list-disc pl-5 text-sm">{P.features.map((f) => <li key={f}>{f}</li>)}</ul>
            {on ? <span className="text-sm font-semibold text-accent">Current plan</span> : <button className="btn btn-sm self-start" disabled={pending} onClick={() => choose(p)}>Switch to {P.name}</button>}
          </div>
        );
      })}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <span className="text-xs text-muted">On every plan, Connect takes 10% only on new clients who find you through Connect search. Never on your own clients.</span>
    </section>
  );
}
