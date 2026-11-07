"use client";
import { useActionState, useState } from "react";
import { inviteClient } from "../actions";
import { CopyButton } from "@/components/CopyButton";

export function InviteForm() {
  const [open, setOpen] = useState(false);
  const [state, action, busy] = useActionState(inviteClient, undefined);
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>Add a client</button>;
  return (
    <form action={action} className="card">
      <h2 className="h3">Add a client</h2>
      <span className="text-sm text-muted">You get a link to send on WhatsApp. They open it, log in, and see your plan.</span>
      <label className="text-sm font-semibold" htmlFor="i-name">Name</label>
      <input id="i-name" name="name" className="input" required />
      <label className="text-sm font-semibold" htmlFor="i-email">Email (optional)</label>
      <input id="i-email" name="email" type="email" className="input" />
      <label className="text-sm font-semibold" htmlFor="i-program">Program</label>
      <input id="i-program" name="program" className="input" placeholder="e.g. 12-week weight loss" />
      <label className="text-sm font-semibold" htmlFor="i-goal">Goal</label>
      <input id="i-goal" name="goal" className="input" placeholder="e.g. Lose 8 kg" />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-muted">Height (cm)<input name="height" inputMode="decimal" className="input" /></label>
        <label className="text-xs text-muted">Weight (kg)<input name="weight" inputMode="decimal" className="input" /></label>
        <label className="text-xs text-muted">Goal (kg)<input name="target" inputMode="decimal" className="input" /></label>
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.link ? (
        <div className="flex flex-col gap-2 rounded-xl bg-good-soft p-3">
          <b>Invite link ready</b>
          <div className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate select-all">{state.link}</span><CopyButton text={state.link} /></div>
          <a className="btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent("Join me on Connect to share your meal photos and follow your plan: " + state.link)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
        </div>
      ) : <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create invite link"}</button>}
    </form>
  );
}
