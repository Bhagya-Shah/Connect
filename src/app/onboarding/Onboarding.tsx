"use client";
import { useActionState, useState } from "react";
import { startAsClient, startAsNutritionist } from "./actions";

export default function Onboarding({ next, initial }: { next?: string; initial?: "nutritionist" }) {
  const [role, setRole] = useState<"nutritionist" | "client" | null>(initial ?? (next ? "client" : null));
  const [nState, nAction, nBusy] = useActionState(startAsNutritionist, undefined);
  const [cState, cAction, cBusy] = useActionState(startAsClient, undefined);

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-xl font-semibold">Welcome to Connect</h1>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="I am a">
        {(["client", "nutritionist"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
            className={`rounded-2xl border p-3 text-left ${role === r ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
            <span className="block font-display font-semibold">{r === "client" ? "I want help" : "I'm a nutritionist"}</span>
            <span className="text-xs text-muted">{r === "client" ? "Find a nutritionist, follow my plan" : "Run my practice here"}</span>
          </button>
        ))}
      </div>

      {role === "client" && (
        <form action={cAction} className="card">
          <input type="hidden" name="next" value={next ?? ""} />
          <label htmlFor="cname" className="font-semibold">Your name</label>
          <input id="cname" name="name" className="input" required autoComplete="name" />
          {cState?.error && <p role="alert" className="text-sm text-bad">{cState.error}</p>}
          <button className="btn" disabled={cBusy}>Continue</button>
        </form>
      )}

      {role === "nutritionist" && (
        <form action={nAction} className="card">
          <label htmlFor="nname" className="font-semibold">Your name as clients see it</label>
          <input id="nname" name="name" className="input" required placeholder="e.g. Priya Mehta" />
          <label htmlFor="city" className="font-semibold">City</label>
          <input id="city" name="city" className="input" placeholder="e.g. Ahmedabad" />
          <label htmlFor="handle" className="font-semibold">Your booking link</label>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted">connect.app/n/</span><input id="handle" name="handle" className="input" required placeholder="priya-nutrition" /></div>
          {nState?.error && <p role="alert" className="text-sm text-bad">{nState.error}</p>}
          <button className="btn" disabled={nBusy}>Create my practice</button>
          <span className="text-xs text-muted">You start on the free Starter plan (up to 5 clients). Upgrade any time.</span>
        </form>
      )}
    </main>
  );
}
