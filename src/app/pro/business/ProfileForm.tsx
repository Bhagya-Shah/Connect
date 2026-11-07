"use client";
import { useActionState } from "react";
import { updateProfile } from "../actions";
import { APPROACHES, CONCERNS, DEFAULT_CONSENT, FOOD_TYPES, GOALS, LANGUAGES } from "@/lib/constants";
import type { Nutritionist } from "@/lib/types";

function Checks({ name, options, value }: { name: string; options: readonly { id: string; name: string }[] | string[]; value: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const id = typeof o === "string" ? o : o.id, label = typeof o === "string" ? o : o.name;
        return (
          <label key={id} className="chip has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-bg">
            <input type="checkbox" name={name} value={id} defaultChecked={value.includes(id)} className="sr-only" />{label}
          </label>
        );
      })}
    </div>
  );
}

export function ProfileForm({ n, name }: { n: Nutritionist; name: string }) {
  const [state, action, busy] = useActionState(updateProfile, undefined);
  const psy = n.specialty === "psychology";
  return (
    <form action={action} className="card">
      <h2 className="h3">Your public profile</h2>
      <label className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm font-semibold">
        <input type="checkbox" name="published" defaultChecked={n.published} className="h-4 w-4 accent-[var(--accent)]" /> Show my profile so clients can find and book me
      </label>
      <label className="text-xs text-muted">Name<input name="name" defaultValue={name} className="input" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">City<input name="city" defaultValue={n.city ?? ""} className="input" /></label>
        <label className="text-xs text-muted">Consults<select name="mode" defaultValue={n.mode ?? "Online"} className="input"><option>Online</option><option>Online + clinic</option><option>Clinic only</option></select></label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Qualification<input name="qualification" defaultValue={n.qualification ?? ""} className="input" placeholder={psy ? "M.A. Clinical Psychology, RCI" : "M.Sc. Nutrition, RD"} /></label>
        <label className="text-xs text-muted">Years of experience<input name="experience" inputMode="numeric" defaultValue={n.experience_years ?? ""} className="input" /></label>
      </div>
      <label className="text-xs text-muted">About you<textarea name="about" defaultValue={n.about ?? ""} className="input min-h-20" placeholder="Who you help and how" /></label>
      <span className="text-xs text-muted">{psy ? "What you help with" : "Goals you help with"}</span><Checks name="goals" options={psy ? CONCERNS : GOALS} value={n.goals} />
      <span className="text-xs text-muted">Languages</span><Checks name="languages" options={LANGUAGES} value={n.languages} />
      {psy ? <>
        <span className="text-xs text-muted">Approaches you use</span><Checks name="approaches" options={APPROACHES} value={n.approaches} />
        <label className="text-xs text-muted">Consent form clients agree to before the first session
          <textarea name="consent_text" defaultValue={n.consent_text ?? DEFAULT_CONSENT} className="input min-h-40 text-sm" /></label>
      </> : <><span className="text-xs text-muted">Food plans you make</span><Checks name="food_types" options={FOOD_TYPES} value={n.food_types} /></>}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Session length (min)<input name="session_minutes" inputMode="numeric" defaultValue={n.session_minutes} className="input" /></label>
        <span className="self-end pb-2.5 text-xs text-muted">Video calls happen inside Connect. A Join button appears 5 min before each session.</span>
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">Saved.</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
