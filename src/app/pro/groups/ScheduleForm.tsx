"use client";
import { useActionState } from "react";
import { scheduleGroup } from "../actions";

export function ScheduleForm({ services }: { services: { id: string; name: string; capacity: number | null }[] }) {
  const [s, a, busy] = useActionState(scheduleGroup, undefined);
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <form action={a} className="card">
      <h2 className="h3">Schedule a group session</h2>
      <label className="text-xs text-muted">Service<select name="service" className="input">{services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs text-muted">Title (optional)<input name="title" className="input" placeholder="e.g. Week 1: Understanding hunger" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Date<input name="date" type="date" className="input" defaultValue={tomorrow} required /></label>
        <label className="text-xs text-muted">Time<input name="time" type="time" className="input" defaultValue="18:00" required /></label>
        <label className="text-xs text-muted">Length (min)<input name="minutes" inputMode="numeric" className="input" defaultValue={60} /></label>
        <label className="text-xs text-muted">Seats<input name="capacity" inputMode="numeric" className="input" defaultValue={services[0]?.capacity ?? 10} /></label>
      </div>
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      {s?.ok && <p className="text-sm text-good">Scheduled. It&apos;s on your public page now.</p>}
      <button className="btn btn-sm self-end" disabled={busy}>Schedule</button>
    </form>
  );
}
