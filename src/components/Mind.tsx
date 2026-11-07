import { CHECKUPS, MOODS, band, fmtDate, type CheckupKind } from "@/lib/constants";
import { LineChart, Pill } from "./ui";

type MoodLog = { log_date: string; mood: number; feelings?: string[] | null; note?: string | null };

/** Last N days as a row of faces; empty days stay blank. */
export function MoodStrip({ logs, days = 14 }: { logs: MoodLog[]; days?: number }) {
  const byDate = new Map(logs.map((l) => [l.log_date, l.mood]));
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return { d, m: byDate.get(d) };
  });
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }} role="img" aria-label={`Mood for the last ${days} days`}>
      {cells.map((c) => (
        <span key={c.d} title={`${fmtDate(c.d)}: ${c.m ? MOODS[c.m - 1].label : "no check-in"}`}
          className={`grid aspect-square place-items-center rounded-md text-[13px] ${c.m ? (c.m <= 2 ? "bg-bad-soft" : c.m === 3 ? "bg-surface-2" : "bg-good-soft") : "border border-dashed border-line"}`}>
          {c.m ? MOODS[c.m - 1].face : ""}
        </span>
      ))}
    </div>
  );
}

export function topFeelings(logs: MoodLog[], n = 4) {
  const count = new Map<string, number>();
  for (const l of logs) for (const f of l.feelings ?? []) count.set(f, (count.get(f) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function ScoreHistory({ kind, rows }: { kind: CheckupKind; rows: { score: number | null; done_at: string | null; risk?: boolean }[] }) {
  const done = rows.filter((r) => r.score !== null).sort((a, b) => (a.done_at! < b.done_at! ? -1 : 1));
  const last = done.at(-1);
  const C = CHECKUPS[kind];
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="h3">{C.name} <span className="text-sm font-normal text-muted">{C.about}</span></h2>
        {last && <Pill tone={last.risk || last.score! >= 15 ? "bad" : last.score! >= 10 ? "warn" : "good"}>{last.score}/{C.max} · {band(kind, last.score!)}</Pill>}
      </div>
      {done.length ? <LineChart data={done.map((r) => r.score!)} unit="" /> : <p className="text-sm text-muted">No answers yet.</p>}
      {done.length > 1 && <span className="text-xs text-muted">Lower is better. First {done[0].score} on {fmtDate(done[0].done_at!)}, latest {last!.score} on {fmtDate(last!.done_at!)}.</span>}
    </section>
  );
}
