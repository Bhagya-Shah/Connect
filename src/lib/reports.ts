import type { SupabaseClient } from "@supabase/supabase-js";

export type PayRow = { id: string; created_at: string; amount: number; platform_fee: number; invoice_no: number | null; client_id: string | null; service: string; client: string; source: "own" | "search" };

/** All paid payments for one practice, with client name, service and where the client came from. */
export async function loadPayments(supabase: SupabaseClient, uid: string): Promise<PayRow[]> {
  const [{ data: pays }, { data: links }] = await Promise.all([
    supabase.from("payments").select("id, created_at, amount, platform_fee, invoice_no, client_id, booking:booking_id(service_name), client:client_id(full_name)")
      .eq("nutritionist_id", uid).eq("status", "paid").order("created_at", { ascending: false }).limit(5000),
    supabase.from("client_links").select("client_id, source").eq("nutritionist_id", uid),
  ]);
  const src = new Map((links ?? []).map((l) => [l.client_id, l.source]));
  return (pays ?? []).map((p) => ({
    id: p.id, created_at: p.created_at, amount: p.amount, platform_fee: p.platform_fee, invoice_no: p.invoice_no, client_id: p.client_id,
    service: (p.booking as unknown as { service_name: string } | null)?.service_name ?? "Consultation",
    client: (p.client as unknown as { full_name: string | null } | null)?.full_name ?? "Client",
    source: src.get(p.client_id) === "search" ? "search" : "own",
  }));
}

export const monthKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

export function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 15));
    out.push(x.toISOString().slice(0, 7));
  }
  return out;
}
