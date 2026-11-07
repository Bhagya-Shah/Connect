import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/constants";
import { gstSplit, invoiceNo, money } from "@/lib/invoice";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Invoice · Connect" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invoice/${id}`);
  // RLS: only the client who paid or the practice that was paid can read it
  const { data: p } = await supabase.from("payments").select("*, booking:booking_id(service_name, starts_at)").eq("id", id).eq("status", "paid").maybeSingle();
  if (!p) notFound();
  const { data: n } = await supabase.from("nutritionists").select("handle, plan, specialty, business_name, gstin, business_address, gst_rate, city, profiles(full_name)").eq("id", p.nutritionist_id).single();
  const { data: c } = await supabase.from("profiles").select("full_name").eq("id", p.client_id).maybeSingle();
  if (!n) notFound();
  const proName = (n.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "";
  const tax = PLANS[n.plan as PlanId].invoices && !!n.gstin;
  const rate = tax ? n.gst_rate : 0;
  const split = gstSplit(p.amount, rate);
  const booking = p.booking as unknown as { service_name: string; starts_at: string } | null;
  const date = new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const back = user.id === p.nutritionist_id ? "/pro/business" : "/me/account";
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-surface p-6 text-ink print:p-0">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href={back} className="text-sm font-semibold text-accent">‹ Back</Link>
        <PrintButton />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{tax ? "Tax invoice" : "Receipt"}</h1>
          <p className="text-sm text-muted">{invoiceNo(p.created_at, p.invoice_no)} · {date}</p>
        </div>
        <div className="text-right text-sm">
          <b className="block">{n.business_name || proName}</b>
          {n.business_name && <span className="block">{proName}</span>}
          {n.business_address ? <span className="block whitespace-pre-line text-muted">{n.business_address}</span> : n.city && <span className="block text-muted">{n.city}</span>}
          {tax && <span className="block">GSTIN: {n.gstin}</span>}
        </div>
      </header>
      <section className="text-sm"><span className="text-muted">Billed to</span><br /><b>{c?.full_name || "Client"}</b></section>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 font-semibold">Service</th>{tax && <th className="py-2 font-semibold">SAC</th>}<th className="py-2 text-right font-semibold">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-2">{booking?.service_name ?? "Consultation"}{booking?.starts_at && <span className="block text-xs text-muted">Session on {new Date(booking.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</span>}</td>
              {tax && <td className="py-2">{n.specialty === "psychology" ? "999312" : "999319"}</td>}
              <td className="py-2 text-right">{money(split.taxable)}</td>
            </tr>
            {tax && rate > 0 && <>
              <tr><td className="py-1 text-muted" colSpan={2}>CGST {rate / 2}%</td><td className="py-1 text-right">{money(split.cgst)}</td></tr>
              <tr><td className="py-1 text-muted" colSpan={2}>SGST {rate / 2}%</td><td className="py-1 text-right">{money(split.sgst)}</td></tr>
            </>}
            <tr className="border-t border-ink font-semibold"><td className="py-2" colSpan={tax ? 2 : 1}>Total paid</td><td className="py-2 text-right">{money(p.amount)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Paid online{p.razorpay_payment_id ? ` · Razorpay ref ${p.razorpay_payment_id}` : ""}. {tax && rate === 0 ? "GST not charged on this service." : ""} {!tax ? "This is a payment receipt, not a tax invoice." : ""}</p>
      <p className="text-xs text-muted">Issued through Connect on behalf of {n.business_name || proName}.</p>
    </main>
  );
}
