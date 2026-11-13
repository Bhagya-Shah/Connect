"use client";
import { useState, useTransition } from "react";
import { saveAvailability } from "../actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type W = { weekday: number; start_time: string; end_time: string };

export function Availability({ initial }: { initial: W[] }) {
  const [rows, setRows] = useState<W[]>(initial.map((w) => ({ ...w, start_time: w.start_time.slice(0, 5), end_time: w.end_time.slice(0, 5) })));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const upd = (i: number, p: Partial<W>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <section className="card">
      <h2 className="h3">Weekly hours</h2>
      <span className="text-sm text-muted">Clients can book sessions inside these times (India time).</span>
      {DAYS.map((d, wd) => {
        const list = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === wd);
        return (
          <div key={d} className="flex items-start gap-2 border-t border-line pt-2">
            <span className="w-10 pt-2 text-sm font-semibold">{d}</span>
            <div className="flex flex-1 flex-col gap-1.5">
              {!list.length && <span className="pt-2 text-sm text-muted">Closed</span>}
              {list.map(({ r, i }) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input type="time" className="input !py-1.5" value={r.start_time} onChange={(e) => upd(i, { start_time: e.target.value })} aria-label={`${d} from`} />
                  <span className="text-muted">to</span>
                  <input type="time" className="input !py-1.5" value={r.end_time} onChange={(e) => upd(i, { end_time: e.target.value })} aria-label={`${d} to`} />
                  <button className="chip" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove ${d} hours`}>×</button>
                </div>
              ))}
            </div>
            <button className="chip" onClick={() => setRows([...rows, { weekday: wd, start_time: "10:00", end_time: "13:00" }])} aria-label={`Add hours on ${d}`}>+</button>
          </div>
        );
      })}
      {msg && <p className="text-sm text-good">{msg}</p>}
      <button className="btn btn-sm self-end" disabled={pending} onClick={() => start(async () => { const r = await saveAvailability(rows); setMsg(r?.error ?? "Hours saved."); })}>Save hours</button>
    </section>
  );
}
