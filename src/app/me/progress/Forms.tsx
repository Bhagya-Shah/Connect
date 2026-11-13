"use client";
import { useActionState } from "react";
import { logWeight, sendCheckin } from "../actions";

export function WeightForm() {
  const [s, a, busy] = useActionState(logWeight, undefined);
  return (
    <form action={a} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="weight" inputMode="decimal" className="input" placeholder="Weight (kg)" aria-label="Today's weight in kg" required />
        <input name="waist" inputMode="decimal" className="input" placeholder="Waist (cm)" aria-label="Waist in cm" />
        <button className="btn btn-sm" disabled={busy}>Log</button>
      </div>
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      {s?.ok && <p className="text-sm text-good">Logged. Your nutritionist can see it too.</p>}
    </form>
  );
}

export function CheckinForm({ nutritionistId, name }: { nutritionistId: string; name: string }) {
  const [s, a, busy] = useActionState(sendCheckin, undefined);
  if (s?.ok) return <p className="rounded-xl bg-good-soft p-3 text-sm">Check-in sent to {name}.</p>;
  const scale = (field: string, label: string) => (
    <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="flex-1 cursor-pointer rounded-xl border border-line bg-surface py-2 text-center font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink">
          <input type="radio" name={field} value={n} defaultChecked={n === 3} className="sr-only" />{n}
        </label>
      ))}</div>
    </fieldset>
  );
  return (
    <form action={a} className="flex flex-col gap-3">
      <input type="hidden" name="nutritionist" value={nutritionistId} />
      {scale("energy", "Energy this week (1 low, 5 high)")}
      {scale("hunger", "Hunger between meals (1 low, 5 high)")}
      <textarea name="note" className="input min-h-16" placeholder="How did the week go?" aria-label="Notes" />
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      <button className="btn" disabled={busy}>Send check-in</button>
    </form>
  );
}
