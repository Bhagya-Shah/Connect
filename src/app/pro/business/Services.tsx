"use client";
import { useActionState, useTransition } from "react";
import { addService, toggleService } from "../actions";
import { SERVICE_TYPES, rs } from "@/lib/constants";
import type { Service } from "@/lib/types";

export function Services({ services }: { services: Service[] }) {
  const [state, action, busy] = useActionState(addService, undefined);
  const [pending, start] = useTransition();
  return (
    <section className="card">
      <h2 className="h3">Services and prices</h2>
      {services.map((s) => (
        <div key={s.id} className={`flex items-center gap-2 ${s.active ? "" : "opacity-50"}`}>
          <span className="min-w-0 flex-1"><b>{s.name}</b><br /><span className="text-xs text-muted">{SERVICE_TYPES[s.type as keyof typeof SERVICE_TYPES]}{s.details ? ` · ${s.details}` : ""}</span></span>
          <span className="font-display font-semibold tabular-nums">{s.price ? rs(s.price) : "Free"}</span>
          <button className="chip" disabled={pending} onClick={() => start(() => toggleService(s.id, !s.active))}>{s.active ? "Hide" : "Show"}</button>
        </div>
      ))}
      <form action={action} className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="text-sm font-semibold">Add a service</span>
        <input name="name" className="input" placeholder="e.g. 12-week weight loss plan" required aria-label="Service name" />
        <div className="grid grid-cols-2 gap-2">
          <select name="type" className="input" aria-label="Type">{Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="price" className="input" inputMode="numeric" placeholder="Price in ₹" required aria-label="Price" />
        </div>
        <input name="details" className="input" placeholder="What's included, e.g. 12 check-ins + weekly plans" aria-label="Details" />
        {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
        <button className="btn btn-sm self-end" disabled={busy}>Add service</button>
      </form>
    </section>
  );
}
