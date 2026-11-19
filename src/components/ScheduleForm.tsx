"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleSession, type Result } from "@/app/pro/actions";
import { NEW_MEET_URL } from "@/lib/meet";

const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function ScheduleForm({ clients, clientId, defaultMeet, minutes, startOpen = false }: {
  clients: { id: string; name: string }[]; clientId?: string; defaultMeet: string | null; minutes: number; startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [state, setState] = useState<Result>(undefined);
  const [busy, setBusy] = useState(false);
  const [meet, setMeet] = useState(defaultMeet ?? "");
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    scheduleSession(undefined, fd)
      .then((r) => {
        setState(r);
        if (r?.ok) { form.current?.reset(); setMeet(defaultMeet ?? ""); router.refresh(); }
      })
      .catch(() => setState({ error: "Not saved. Check your connection and try again." }))
      .finally(() => setBusy(false));
  };
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>Schedule a session</button>;
  return (
    <form ref={form} onSubmit={submit} className="card">
      <div className="flex items-center justify-between"><h2 className="h3">Schedule a session</h2><button type="button" className="text-sm text-muted" onClick={() => setOpen(false)}>Close</button></div>
      {clientId ? <input type="hidden" name="client" value={clientId} /> : (
        <label className="text-xs text-muted">Client
          <select name="client" className="input" required defaultValue="">
            <option value="" disabled>Pick a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs text-muted">What<input name="title" className="input" defaultValue="Consultation" maxLength={80} /></label>
      <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
        <label className="text-xs text-muted">Date<input name="date" type="date" className="input" required min={todayIST()} defaultValue={todayIST()} /></label>
        <label className="text-xs text-muted">Time<input name="time" type="time" className="input" required defaultValue="11:00" /></label>
        <label className="text-xs text-muted">Minutes<input name="minutes" inputMode="numeric" className="input" defaultValue={minutes} /></label>
      </div>
      <label className="text-xs text-muted">Google Meet link
        <input name="meet_url" className="input" value={meet} onChange={(e) => setMeet(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" inputMode="url" />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <a href={NEW_MEET_URL} target="_blank" rel="noreferrer" className="chip">Get a new Meet link</a>
        <span>Opens Google Meet. Copy the link and paste it above.</span>
      </div>
      {meet && meet !== defaultMeet && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="save_default" /> Use this link for all my sessions</label>}
      <label className="text-xs text-muted">Note for the client (optional)<textarea name="notes" className="input min-h-14" maxLength={2000} placeholder="e.g. Keep your last 3 days of food photos ready" /></label>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">Session added. The client sees it in their app with a Join button.</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Add session"}</button>
    </form>
  );
}
