import { requireNutritionist } from "@/lib/auth";
import { fmtDate } from "@/lib/constants";
import { Empty, Tabs, TopBar } from "@/components/ui";
import { Body, Cols } from "@/components/Shell";
import { SessionRow } from "@/components/SessionRow";
import { ScheduleForm } from "@/components/ScheduleForm";
import type { Session } from "@/lib/types";

export const metadata = { title: "Sessions · Connect" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ show?: string; new?: string }> }) {
  const sp = await searchParams;
  const past = sp.show === "past";
  const { supabase, user, me } = await requireNutritionist();
  const nowIso = new Date().toISOString();
  const q = supabase.from("bookings").select("*").eq("nutritionist_id", user.id);
  const [{ data: sessions }, { data: links }] = await Promise.all([
    past ? q.lt("ends_at", nowIso).order("starts_at", { ascending: false }).limit(60)
      : q.gte("ends_at", nowIso).neq("status", "cancelled").order("starts_at").limit(100),
    supabase.from("client_links").select("client_id, phone, invite_name, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("status", "active"),
  ]);
  const clients = (links ?? []).map((l) => ({ id: l.client_id, name: (l.profiles as unknown as { full_name: string | null } | null)?.full_name || l.invite_name || "Client", phone: l.phone as string | null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const by = new Map(clients.map((c) => [c.id, c]));
  // group by day
  const days = new Map<string, Session[]>();
  for (const s of (sessions ?? []) as Session[]) {
    const d = new Date(s.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    days.set(d, [...(days.get(d) ?? []), s]);
  }
  return (
    <>
      <TopBar title="Sessions" />
      <Body>
        <Tabs label="Sessions" current={past ? "past" : "up"} items={[["up", "Upcoming", "/pro/sessions"], ["past", "Past", "/pro/sessions?show=past"]]} />
        <Cols>
          {!past && <ScheduleForm clients={clients} defaultMeet={me.meet_url} minutes={me.session_minutes} startOpen={!!sp.new} />}
          <div className="flex flex-col gap-3">
            {days.size ? [...days].map(([d, list]) => (
              <section key={d} className="card">
                <h2 className="label">{fmtDate(d + "T12:00:00+05:30", { weekday: "long", day: "numeric", month: "long" })}</h2>
                {list.map((s) => <SessionRow key={s.id} s={s} who={by.get(s.client_id)?.name ?? "Client"} pro phone={by.get(s.client_id)?.phone} clientId={s.client_id} />)}
              </section>
            )) : <Empty title={past ? "No past sessions" : "No sessions coming up"}>{past ? "" : "Schedule one and your client gets a Join button in their app."}</Empty>}
          </div>
        </Cols>
      </Body>
    </>
  );
}
