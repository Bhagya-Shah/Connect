import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { fmtDate, fmtTime, rs } from "@/lib/constants";
import { Avatar, Empty, Pill, Row, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { LogoutButton } from "@/components/LogoutButton";
import { callState } from "@/lib/call";

export default async function Account({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireClient();
  const [{ data: bookings }, { data: links }, { data: pays }] = await Promise.all([
    supabase.from("bookings").select("*, n:nutritionist_id(handle, profiles(full_name))").eq("client_id", user.id).neq("status", "cancelled").order("starts_at", { ascending: false }).limit(20),
    supabase.from("client_links").select("nutritionist_id, program, n:nutritionist_id(handle, profiles(full_name))").eq("client_id", user.id).eq("status", "active"),
    supabase.from("payments").select("amount, created_at, booking_id").eq("client_id", user.id).eq("status", "paid").order("created_at", { ascending: false }),
  ]);
  type N = { handle: string; profiles: { full_name: string } };
  const now = Date.now();
  const upcoming = (bookings ?? []).filter((b) => Date.parse(b.ends_at) > now).reverse();
  const past = (bookings ?? []).filter((b) => Date.parse(b.ends_at) <= now);
  return (
    <>
      <TopBar title={profile.full_name || "Me"} />
      <Body>
        {sp.booked && <p className="rounded-xl bg-good-soft p-3 text-sm"><b>You&apos;re booked.</b> The session is below. They have your details.</p>}
        <section className="card">
          <h2 className="h3">Upcoming sessions</h2>
          {upcoming.length ? upcoming.map((b) => {
            const n = b.n as unknown as N;
            return (
              <div key={b.id} className="flex items-center gap-2.5">
                <Avatar name={n.profiles.full_name} />
                <span className="min-w-0 flex-1"><b>{b.service_name}</b><br /><span className="text-sm text-muted">{n.profiles.full_name} · {fmtDate(b.starts_at)} {fmtTime(b.starts_at)}</span></span>
                {b.status === "pending_payment" ? <Link href={`/pay/${b.id}`} className="btn btn-sm">Pay</Link>
                  : callState(b) === "open" ? <Link href={`/call/${b.id}`} className="btn btn-sm">Join call</Link> : <Pill tone="good">Confirmed</Pill>}
              </div>
            );
          }) : <p className="text-sm text-muted">No upcoming sessions.</p>}
        </section>
        <section className="card">
          <h2 className="h3">Working with</h2>
          {links?.length ? links.map((l) => {
            const n = l.n as unknown as N;
            return <div key={l.nutritionist_id} className="flex items-center gap-2.5"><Avatar name={n.profiles.full_name} /><span className="min-w-0 flex-1"><b>{n.profiles.full_name}</b><br /><span className="text-sm text-muted">{l.program || "Active"}</span></span><Link href={`/n/${n.handle}`} className="chip">Book again</Link></div>;
          }) : <Empty title="None yet"><Link href="/discover" className="text-accent">Find someone</Link></Empty>}
        </section>
        {!!past.length && <section className="card"><h2 className="h3">Past sessions</h2>{past.map((b) => <Row key={b.id} label={fmtDate(b.starts_at)}>{b.service_name}</Row>)}</section>}
        <section className="card">
          <h2 className="h3">Payments</h2>
          {pays?.length ? pays.map((p, i) => <Row key={i} label={fmtDate(p.created_at)}>{rs(p.amount)}</Row>) : <p className="text-sm text-muted">No payments yet.</p>}
        </section>
        <LogoutButton />
      </Body>
    </>
  );
}
