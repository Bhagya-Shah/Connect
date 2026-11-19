"use client";
import { useActionState } from "react";
import Link from "next/link";
import { addClient, type LoginResult } from "../../actions";
import { LoginCard } from "@/components/LoginCard";
import { FOOD_TYPES, GOALS } from "@/lib/constants";

export function AddClientForm({ practice }: { practice: string | null }) {
  const [state, action, busy] = useActionState<LoginResult, FormData>(addClient, undefined);
  if (state?.ok && state.clientId) return (
    <div className="flex flex-col gap-3">
      <LoginCard name={state.name!} loginId={state.loginId!} password={state.password} phone={state.phone} existing={state.existing} practice={practice} />
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/pro/clients/${state.clientId}?tab=files`} className="btn-ghost">Share a diet plan</Link>
        <Link href={`/pro/clients/${state.clientId}?tab=sessions`} className="btn-ghost">Schedule a session</Link>
      </div>
      <button type="button" className="btn" onClick={() => window.location.reload()}>Add another client</button>
    </div>
  );
  return (
    <form action={action} className="card">
      <span className="text-sm text-muted">We make a login for them right away. They log in with their mobile number (or email) and a password you send on WhatsApp.</span>
      <label className="text-sm font-semibold" htmlFor="c-name">Full name</label>
      <input id="c-name" name="name" className="input" required autoComplete="off" maxLength={80} />
      <label className="text-sm font-semibold" htmlFor="c-phone">Mobile number</label>
      <input id="c-phone" name="phone" className="input" required inputMode="tel" placeholder="98765 43210" autoComplete="off" />
      <label className="text-sm font-semibold" htmlFor="c-email">Email <span className="font-normal text-muted">(optional, lets them use Google sign-in too)</span></label>
      <input id="c-email" name="email" type="email" className="input" autoComplete="off" />
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Goal and health details (optional)</summary>
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs text-muted">Goal
            <select name="goal" className="input" defaultValue=""><option value="">Choose</option>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          </label>
          <label className="text-xs text-muted">Program<input name="program" className="input" placeholder="e.g. 12-week weight loss" /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-muted">Height (cm)<input name="height" inputMode="decimal" className="input" /></label>
            <label className="text-xs text-muted">Weight (kg)<input name="weight" inputMode="decimal" className="input" /></label>
            <label className="text-xs text-muted">Goal (kg)<input name="target" inputMode="decimal" className="input" /></label>
          </div>
          <label className="text-xs text-muted">Food
            <select name="food_type" className="input" defaultValue=""><option value="">Choose</option>{FOOD_TYPES.map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <label className="text-xs text-muted">Health conditions<input name="conditions" className="input" placeholder="e.g. Thyroid, PCOS" /></label>
        </div>
      </details>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Creating login…" : "Add client and create login"}</button>
    </form>
  );
}
