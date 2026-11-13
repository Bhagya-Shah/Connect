"use client";
import { useActionState } from "react";
import Link from "next/link";
import { saveInvoiceSettings } from "../actions";

type N = { business_name: string | null; gstin: string | null; business_address: string | null; gst_rate: number };

export function InvoiceSettings({ n, allowed }: { n: N; allowed: boolean }) {
  const [s, a, busy] = useActionState(saveInvoiceSettings, undefined);
  if (!allowed) return (
    <section className="card">
      <h2 className="h3">Invoices</h2>
      <p className="text-sm text-muted">Clients get a payment receipt for every payment. GST invoices with your GSTIN come with the Growth plan. <Link href="#plan" className="font-semibold text-accent">See plans</Link></p>
    </section>
  );
  return (
    <form action={a} className="card">
      <h2 className="h3">GST invoices</h2>
      <span className="text-sm text-muted">Every payment gets a numbered invoice the client can download. Add your GSTIN to make them tax invoices. Prices you set include GST.</span>
      <label className="text-xs text-muted">Business name (optional)<input name="business_name" defaultValue={n.business_name ?? ""} className="input" placeholder="e.g. Nourish Nutrition Clinic" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">GSTIN<input name="gstin" defaultValue={n.gstin ?? ""} className="input uppercase" placeholder="24ABCDE1234F1Z5" maxLength={15} /></label>
        <label className="text-xs text-muted">GST rate<select name="gst_rate" defaultValue={n.gst_rate} className="input"><option value={0}>0% (exempt)</option><option value={5}>5%</option><option value={18}>18%</option></select></label>
      </div>
      <label className="text-xs text-muted">Address on invoices<textarea name="business_address" defaultValue={n.business_address ?? ""} className="input min-h-16" /></label>
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      {s?.ok && <p className="text-sm text-good">Saved.</p>}
      <button className="btn btn-sm self-start" disabled={busy}>Save invoice details</button>
      <span className="text-xs text-muted">Not sure about GST? Most solo nutritionists and counsellors under ₹20 lakh a year don&apos;t need to register. Ask your CA.</span>
    </form>
  );
}
