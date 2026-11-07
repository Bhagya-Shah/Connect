"use client";
import { useActionState, useState } from "react";
import { startAsClient, startAsNutritionist } from "./actions";

type Role = "nutritionist" | "psychology" | "client";
const ROLES: [Role, string, string][] = [
  ["client", "I want help", "Find an expert, follow my plan"],
  ["nutritionist", "I'm a nutritionist", "Run my practice here"],
  ["psychology", "I'm a therapist", "Psychologist or counsellor"],
];

export default function Onboarding({ next, initial }: { next?: string; initial?: Role }) {
  const [role, setRole] = useState<Role | null>(initial ?? (next && !next.startsWith("/join-clinic/") ? "client" : null));
  const [nState, nAction, nBusy] = useActionState(startAsNutritionist, undefined);
  const [cState, cAction, cBusy] = useActionState(startAsClient, undefined);

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-xl font-semibold">Welcome to Connect</h1>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="I am a">
        {ROLES.map(([r, title, line]) => (
          <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
            className={`rounded-2xl border p-3 text-left ${role === r ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
            <span className="block font-display text-sm font-semibold leading-tight">{title}</span>
            <span className="text-xs text-muted">{line}</span>
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

      {(role === "nutritionist" || role === "psychology") && (
        <form action={nAction} className="card" key={role}>
          <input type="hidden" name="specialty" value={role === "psychology" ? "psychology" : "nutrition"} />
          <input type="hidden" name="next" value={next?.startsWith("/join-clinic/") ? next : ""} />
          <label htmlFor="nname" className="font-semibold">Your name as clients see it</label>
          <input id="nname" name="name" className="input" required placeholder={role === "psychology" ? "e.g. Dr. Aarti Kapoor" : "e.g. Priya Mehta"} />
          <label htmlFor="city" className="font-semibold">City</label>
          <input id="city" name="city" className="input" placeholder="e.g. Ahmedabad" />
          <label htmlFor="handle" className="font-semibold">Your booking link</label>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted">connect.app/n/</span><input id="handle" name="handle" className="input" required placeholder={role === "psychology" ? "aarti-therapy" : "priya-nutrition"} /></div>
          {nState?.error && <p role="alert" className="text-sm text-bad">{nState.error}</p>}
          <button className="btn" disabled={nBusy}>Create my practice</button>
          <span className="text-xs text-muted">You start on the free Starter plan (up to 5 clients). Upgrade any time.</span>
        </form>
      )}
    </main>
  );
}
