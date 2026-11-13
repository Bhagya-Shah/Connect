import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/constants";
import { loadPayments } from "@/lib/reports";
import { invoiceNo } from "@/lib/invoice";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Please log in", { status: 401 });
  const { data: n } = await supabase.from("nutritionists").select("plan").eq("id", user.id).single();
  if (!n || !PLANS[n.plan as PlanId].reports) return new Response("Reports come with the Pro plan", { status: 403 });
  const rows = await loadPayments(supabase, user.id);
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [["Date", "Invoice", "Client", "Service", "Client came from", "Amount", "Connect fee", "You received"].join(",")];
  for (const r of rows) lines.push([
    new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), invoiceNo(r.created_at, r.invoice_no), r.client, r.service,
    r.source === "search" ? "Connect search" : "Your own client", r.amount, r.platform_fee, r.amount - r.platform_fee,
  ].map(esc).join(","));
  return new Response(lines.join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="connect-earnings-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
