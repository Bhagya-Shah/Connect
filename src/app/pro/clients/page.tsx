import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { goalName } from "@/lib/constants";
import { TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { Icons } from "@/components/icons";
import { ClientList, type Row } from "./ClientList";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase, user } = await requireNutritionist();
  const ended = (await searchParams).show === "ended";
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const [{ data: links }, { data: recent }, { data: next }] = await Promise.all([
    supabase.from("client_links").select("client_id, status, program, goal, phone, invite_name, created_at, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("status", ended ? "ended" : "active").order("created_at", { ascending: false }),
    supabase.from("meal_logs").select("client_id, status").eq("nutritionist_id", user.id).gte("log_date", since),
    supabase.from("bookings").select("client_id, starts_at").eq("nutritionist_id", user.id).eq("status", "confirmed").gte("starts_at", new Date().toISOString()).order("starts_at"),
  ]);
  const rows: Row[] = (links ?? []).map((l) => {
    const r = (recent ?? []).filter((x) => x.client_id === l.client_id);
    const isNew = Date.now() - Date.parse(l.created_at) < 3 * 864e5;
    const status: Row["status"] = ended ? "ended" : r.some((x) => x.status === "pending") ? "review" : r.length ? "ok" : isNew ? "new" : "quiet";
    return {
      id: l.client_id, name: (l.profiles as unknown as { full_name: string | null } | null)?.full_name || l.invite_name || "Client",
      sub: (l.goal && goalName(l.goal)) || l.program || "No goal set", phone: l.phone, status,
      next: (next ?? []).find((b) => b.client_id === l.client_id)?.starts_at ?? null,
    };
  });
  return (
    <>
      <TopBar title={ended ? "Past clients" : "Clients"} back={ended ? "/pro/clients" : undefined} right={!ended && <Link href="/pro/clients/new" className="btn btn-sm">{Icons.plus}Add client</Link>} />
      <Body>
        <ClientList rows={rows} />
        {!ended && <Link href="/pro/clients?show=ended" className="self-center text-sm font-semibold text-muted">Past clients</Link>}
      </Body>
    </>
  );
}
