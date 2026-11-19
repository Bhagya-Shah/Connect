"use client";
import { useActionState } from "react";
import { updateSettings, type Result } from "../actions";
import { NEW_MEET_URL } from "@/lib/meet";

type Init = { name: string; phone: string; practice_name: string; city: string; qualification: string; meet_url: string; session_minutes: number; chat_start: string; chat_end: string };

export function SettingsForm({ initial: v }: { initial: Init }) {
  const [state, action, busy] = useActionState<Result, FormData>(updateSettings, undefined);
  return (
    <form action={action} className="card">
      <h2 className="h3">Your practice</h2>
      <label className="text-xs text-muted">Your name, as clients see it<input name="name" defaultValue={v.name} className="input" required maxLength={80} /></label>
      <label className="text-xs text-muted">Practice name<input name="practice_name" defaultValue={v.practice_name} className="input" placeholder="e.g. Nourish Nutrition Clinic" maxLength={80} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Mobile<input name="phone" defaultValue={v.phone} className="input" inputMode="tel" /></label>
        <label className="text-xs text-muted">City<input name="city" defaultValue={v.city} className="input" maxLength={60} /></label>
      </div>
      <label className="text-xs text-muted">Qualification<input name="qualification" defaultValue={v.qualification} className="input" placeholder="e.g. M.Sc. Nutrition, RD" maxLength={120} /></label>
      <h2 className="h3 mt-2">Google Meet</h2>
      <label className="text-xs text-muted">Your Meet link, used for every session unless you change it
        <input name="meet_url" defaultValue={v.meet_url} className="input" placeholder="https://meet.google.com/abc-defg-hij" inputMode="url" />
      </label>
      <p className="text-xs text-muted">
        Tip: in Google Calendar make one event, add Google Meet, and copy its link. That room stays the same, so it works for all sessions.
        Or <a href={NEW_MEET_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent">make a new Meet link</a> and paste it here.
      </p>
      <label className="text-xs text-muted">Usual session length (minutes)<input name="session_minutes" defaultValue={v.session_minutes} className="input" inputMode="numeric" /></label>
      <h2 className="h3 mt-2">Chat hours</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">From<input name="chat_start" type="time" defaultValue={v.chat_start} className="input" /></label>
        <label className="text-xs text-muted">To<input name="chat_end" type="time" defaultValue={v.chat_end} className="input" /></label>
      </div>
      <span className="text-xs text-muted">Clients see these hours above the chat.</span>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">Saved.</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
