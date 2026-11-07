"use client";
import { useActionState, useState } from "react";
import { book } from "./actions";
import { CONDITIONS, FOOD_TYPES, GOALS } from "@/lib/constants";

export function BookForm({ serviceId, days, needName, price }: { serviceId: string; days: { date: string; slots: string[] }[]; needName: boolean; price: number }) {
  const [state, action, busy] = useActionState(book, undefined);
  const [day, setDay] = useState(days[0]?.date);
  const [slot, setSlot] = useState<string | null>(null);
  const cur = days.find((d) => d.date === day);
  if (!days.length) return <p className="card text-sm">No open times in the next 2 weeks. Please check back later.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="service" value={serviceId} />
      <input type="hidden" name="slot" value={slot ?? ""} />
      <span className="label">Pick a day</span>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const dt = new Date(d.date + "T12:00:00+05:30");
          return (
            <button type="button" key={d.date} onClick={() => { setDay(d.date); setSlot(null); }} aria-pressed={day === d.date}
              className={`flex w-14 flex-none flex-col items-center rounded-xl border py-2 text-xs ${day === d.date ? "border-accent bg-accent-soft" : "border-line bg-surface text-muted"}`}>
              {dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}<b className="font-display text-base text-ink">{dt.getUTCDate()}</b>
            </button>
          );
        })}
      </div>
      <span className="label">Open times</span>
      <div className="grid grid-cols-3 gap-2">
        {cur?.slots.map((s) => (
          <button type="button" key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
            className={`rounded-xl border py-2 font-semibold tabular-nums ${slot === s ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}>{s.slice(11, 16)}</button>
        ))}
      </div>
      <section className="card">
        <h2 className="h3">About you</h2>
        <span className="text-xs text-muted">Only your nutritionist sees this.</span>
        {needName && <label className="text-xs text-muted">Your name<input name="name" className="input" required /></label>}
        <label className="text-xs text-muted">Main goal<select name="goal" className="input">{GOALS.map((g) => <option key={g.id}>{g.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Height (cm)<input name="height" inputMode="numeric" className="input" /></label>
          <label className="text-xs text-muted">Weight (kg)<input name="weight" inputMode="decimal" className="input" /></label>
        </div>
        <label className="text-xs text-muted">What do you eat?<select name="food_type" className="input">{FOOD_TYPES.map((f) => <option key={f}>{f}</option>)}</select></label>
        <span className="text-xs text-muted">Health conditions</span>
        <div className="flex flex-wrap gap-1.5">{CONDITIONS.map((c) => (
          <label key={c} className="chip has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-bg"><input type="checkbox" name="conditions" value={c} className="sr-only" />{c}</label>
        ))}</div>
        <label className="text-xs text-muted">Anything else?<textarea name="note" className="input min-h-16" placeholder="e.g. I work night shifts" /></label>
      </section>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn" disabled={!slot || busy}>{busy ? "Booking…" : price ? "Continue to pay" : "Confirm booking"}</button>
    </form>
  );
}
