import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, fmtDate, rs, type PlanId } from "@/lib/constants";
import { lastMonths, loadPayments, monthKey } from "@/lib/reports";
import { Row, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";

const monthName = (k: string) => new Date(k + "-15").toLocaleDateString("en-IN", { month: "short" });

export default async function ReportsPage() {
  const { supabase, user, me } = await requireNutritionist();
  const allowed = PLANS[me.plan as PlanId].reports;
  const rows = await loadPayments(supabase, user.id);
  const months = lastMonths(12);
  const byMonth = months.map((m) => {
    const r = rows.filter((x) => monthKey(x.created_at) === m);
    return { m, count: r.length, gross: r.reduce((a, x) => a + x.amount, 0), fee: r.reduce((a, x) => a + x.platform_fee, 0) };
  });
  const cur = byMonth.at(-1)!, prev = byMonth.at(-2)!;
  const net = (x: { gross: number; fee: number }) => x.gross - x.fee;
  const change = net(prev) ? Math.round(((net(cur) - net(prev)) / net(prev)) * 100) : null;
  const max = Math.max(1, ...byMonth.map(net));

  if (!allowed) return (
    <>
      <TopBar title="Earnings report" back="/pro/business" />
      <Body>
        <div className="grid grid-cols-2 gap-2"><Stat label="This month (after fees)" value={rs(net(cur))} /><Stat label="Payments" value={cur.count} /></div>
        <section className="card border-transparent bg-accent-soft">
          <b>Full reports come with the Pro plan</b>
          <span className="text-sm">12-month trend, earnings per service, own clients vs clients from Connect search, top clients, and a CSV download for your CA.</span>
          <Link href="/pro/business#plan" className="btn btn-sm self-start">See plans</Link>
        </section>
      </Body>
    </>
  );

  const services = [...rows.reduce((m, r) => m.set(r.service, { n: (m.get(r.service)?.n ?? 0) + 1, net: (m.get(r.service)?.net ?? 0) + r.amount - r.platform_fee }), new Map<string, { n: number; net: number }>())]
    .sort((a, b) => b[1].net - a[1].net);
  const own = rows.filter((r) => r.source === "own"), search = rows.filter((r) => r.source === "search");
  const sum = (r: typeof rows) => r.reduce((a, x) => a + x.amount - x.platform_fee, 0);
  const clients = [...rows.reduce((m, r) => m.set(r.client_id ?? r.client, { name: r.client, net: (m.get(r.client_id ?? r.client)?.net ?? 0) + r.amount - r.platform_fee }), new Map<string, { name: string; net: number }>()).values()]
    .sort((a, b) => b.net - a.net).slice(0, 5);
  const yearNet = byMonth.reduce((a, x) => a + net(x), 0);

  return (
    <>
      <TopBar title="Earnings report" back="/pro/business" right={<a href="/api/reports/csv" className="btn-ghost btn-sm">CSV</a>} />
      <Body>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="This month" value={rs(net(cur))} />
          <Stat label="vs last month" value={change === null ? "–" : `${change > 0 ? "+" : ""}${change}%`} />
          <Stat label="Last 12 months" value={rs(yearNet)} />
        </div>
        <section className="card">
          <h2 className="h3">After fees, by month</h2>
          <div className="flex h-36 items-end gap-1" role="img" aria-label="Earnings for the last 12 months">
            {byMonth.map((x) => (
              <div key={x.m} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-md bg-accent" style={{ height: `${Math.max(2, (net(x) / max) * 100)}%`, opacity: x === cur ? 1 : 0.55 }} title={`${monthName(x.m)}: ${rs(net(x))}`} />
                <span className="text-[10px] text-muted">{monthName(x.m)}</span>
              </div>
            ))}
          </div>
          <Row label="Connect fees this month">{rs(cur.fee)}</Row>
          <Row label="Payments this month">{cur.count}</Row>
        </section>
        <section className="card">
          <h2 className="h3">Where your income comes from</h2>
          <Row label={`Your own clients (${new Set(own.map((r) => r.client_id)).size})`}>{rs(sum(own))}</Row>
          <Row label={`From Connect search (${new Set(search.map((r) => r.client_id)).size})`}>{rs(sum(search))}</Row>
          <span className="text-xs text-muted">Connect takes 10% only on clients from search.</span>
        </section>
        <section className="card">
          <h2 className="h3">By service</h2>
          {services.length ? services.map(([name, v]) => <Row key={name} label={`${name} × ${v.n}`}>{rs(v.net)}</Row>) : <p className="text-sm text-muted">No payments yet.</p>}
        </section>
        <section className="card">
          <h2 className="h3">Top clients</h2>
          {clients.map((c, i) => <Row key={i} label={c.name}>{rs(c.net)}</Row>)}
        </section>
        <section className="card">
          <h2 className="h3">Recent payments</h2>
          {rows.slice(0, 15).map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{fmtDate(r.created_at)} · {r.client} · {r.service}</span>
              <b className="tabular-nums">{rs(r.amount)}</b><Link href={`/invoice/${r.id}`} className="font-semibold text-accent">Invoice</Link>
            </div>
          ))}
        </section>
      </Body>
    </>
  );
}
