"use client";
import { useState } from "react";
import Link from "next/link";
import { Avatar, Empty, Pill } from "@/components/ui";

export type Row = { id: string; name: string; sub: string; phone: string | null; status: "review" | "ok" | "new" | "quiet" | "ended"; next: string | null };

const PILLS = {
  review: <Pill tone="blue">Photos to review</Pill>, ok: <Pill tone="good">On track</Pill>, new: <Pill tone="grey">New</Pill>,
  quiet: <Pill tone="bad">Not logging</Pill>, ended: <Pill tone="grey">Ended</Pill>,
};

/** Instant search by name, phone or goal. */
export function ClientList({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const list = s ? rows.filter((r) => `${r.name} ${r.phone ?? ""} ${r.sub}`.toLowerCase().includes(s)) : rows;
  if (!rows.length) return <Empty title="No clients here yet"><Link href="/pro/clients/new" className="font-semibold text-accent">Add your first client</Link> and send them their login.</Empty>;
  return (
    <>
      <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${rows.length} clients by name, phone or goal`} aria-label="Search clients" />
      <section className="card md:grid md:grid-cols-2 md:gap-x-6">
        {list.map((r) => (
          <Link key={r.id} href={`/pro/clients/${r.id}`} className="flex items-center gap-2.5 border-t border-line pt-2.5 first:border-0 first:pt-0 md:[&:nth-child(2)]:border-0 md:[&:nth-child(2)]:pt-0">
            <Avatar name={r.name} />
            <span className="min-w-0 flex-1 leading-tight"><b>{r.name}</b><br /><span className="text-sm text-muted">{r.sub}</span>
              {r.next && <span className="block text-xs text-accent">Next: {new Date(r.next).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>}
            </span>
            {PILLS[r.status]}
          </Link>
        ))}
        {!list.length && <p className="text-sm text-muted">No client matches &ldquo;{q}&rdquo;.</p>}
      </section>
    </>
  );
}
