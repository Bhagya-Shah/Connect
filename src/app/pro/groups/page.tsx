import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, fmtDate, fmtTime, type PlanId } from "@/lib/constants";
import { callState } from "@/lib/call";
import { Avatar, Empty, Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { ScheduleForm } from "./ScheduleForm";
import { cancelGroup } from "../actions";

export default async function GroupsPage() {
  const { supabase, user, me } = await requireNutritionist();
  const psy = me.specialty === "psychology";
  const word = psy ? "support group" : "group class";
  if (!PLANS[me.plan as PlanId].groups) return (
    <>
      <TopBar title="Group sessions" back="/pro/business" />
      <Body>
        <section className="card border-transparent bg-accent-soft">
          <b>{psy ? "Support groups" : "Group classes"} come with the Pro plan</b>
          <span className="text-sm">Run one session for up to 100 people, each with their own paid seat, in a shared video room. Great for {psy ? "anxiety, grief or parenting groups" : "weight-loss batches, PCOS workshops and cooking demos"}.</span>
          <Link href="/pro/business#plan" className="btn btn-sm self-start">See plans</Link>
        </section>
      </Body>
    </>
  );
  const [{ data: services }, { data: sessions }] = await Promise.all([
    supabase.from("services").select("id, name, capacity, price").eq("nutritionist_id", user.id).eq("type", "group").eq("active", true),
    supabase.from("group_sessions").select("*, bookings(id, status, client:client_id(full_name))").eq("nutritionist_id", user.id).eq("cancelled", false)
      .gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  return (
    <>
      <TopBar title="Group sessions" back="/pro/business" />
      <Body>
        {services?.length ? <ScheduleForm services={services} /> : (
          <Empty title={`Add a ${word} first`}>In Business, add a service with the type &quot;Group class&quot;, a price per seat and the number of seats.</Empty>
        )}
        {sessions?.length ? sessions.map((g) => {
          const seats = (g.bookings as { id: string; status: string; client: { full_name: string | null } | null }[]).filter((b) => b.status === "confirmed");
          const open = callState({ ...g, status: "confirmed" }) === "open";
          return (
            <section key={g.id} className="card">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1"><b>{g.title}</b><br /><span className="text-sm text-muted">{fmtDate(g.starts_at)} · {fmtTime(g.starts_at)}–{fmtTime(g.ends_at)}</span></span>
                <Pill tone={seats.length >= g.capacity ? "warn" : "blue"}>{seats.length}/{g.capacity} booked</Pill>
              </div>
              {seats.length ? <div className="flex flex-wrap gap-2">{seats.map((b) => <span key={b.id} className="flex items-center gap-1.5 text-sm"><Avatar name={b.client?.full_name} size={24} />{b.client?.full_name || "Client"}</span>)}</div>
                : <span className="text-sm text-muted">No one has booked yet. Share your booking link.</span>}
              <div className="flex gap-2">
                {open && <Link href={`/call/${g.id}`} className="btn btn-sm">Start group call</Link>}
                <form action={cancelGroup.bind(null, g.id)}><button className="chip text-bad">Cancel session</button></form>
              </div>
            </section>
          );
        }) : services?.length ? <p className="text-sm text-muted">No upcoming group sessions.</p> : null}
      </Body>
    </>
  );
}
