"use client";
import { useActionState } from "react";
import { startPractice } from "./actions";
import { LogoutButton } from "@/components/LogoutButton";

export default function Onboarding({ name, email }: { name: string; email: string }) {
  const [state, action, busy] = useActionState(startPractice, undefined);
  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-xl font-semibold">Set up your practice</h1>
      <p className="text-sm text-muted">Takes 20 seconds. You can change all of this later in Settings.</p>
      <form action={action} className="card">
        <label htmlFor="name" className="text-sm font-semibold">Your name, as clients see it</label>
        <input id="name" name="name" className="input" required defaultValue={name} placeholder="e.g. Priya Mehta" maxLength={80} />
        <label htmlFor="practice" className="text-sm font-semibold">Practice name <span className="font-normal text-muted">(optional)</span></label>
        <input id="practice" name="practice" className="input" placeholder="e.g. Nourish Nutrition Clinic" maxLength={80} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Mobile<input name="phone" className="input" inputMode="tel" /></label>
          <label className="text-xs text-muted">City<input name="city" className="input" maxLength={60} /></label>
        </div>
        {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Setting up…" : "Start my practice"}</button>
      </form>
      <div className="card bg-surface-2 text-sm">
        <span>Signed in as <b>{email}</b>.</span>
        <span className="text-muted">Are you a client? Your nutritionist adds you and sends your login. Log out and use that instead.</span>
        <LogoutButton />
      </div>
    </main>
  );
}
