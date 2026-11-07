"use client";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { CHECKUPS, CRISIS_LINES, FEELINGS, MOODS, band, type CheckupKind } from "@/lib/constants";
import { addJournal, completeHomework, logMood, submitCheckup } from "./actions";

export function MoodForm({ current }: { current?: { mood: number; feelings: string[]; note: string | null } | null }) {
  const [s, a, busy] = useActionState(logMood, undefined);
  const [edit, setEdit] = useState(!current);
  if (current && !edit && !s?.error) return (
    <div className="flex items-center gap-3">
      <span className="text-3xl" aria-hidden="true">{MOODS[current.mood - 1].face}</span>
      <span className="min-w-0 flex-1"><b>Today: {MOODS[current.mood - 1].label}</b><br /><span className="text-sm text-muted">{current.feelings.join(", ") || "Logged"}</span></span>
      <button type="button" className="chip" onClick={() => setEdit(true)}>Change</button>
    </div>
  );
  return (
    <form action={async (f) => { await a(f); setEdit(false); }} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-sm font-semibold">How are you feeling today?</legend>
        <div className="grid grid-cols-5 gap-1.5">{MOODS.map((m) => (
          <label key={m.v} className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border border-line bg-surface py-2 text-[11px] font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input type="radio" name="mood" value={m.v} defaultChecked={current?.mood === m.v} className="sr-only" required /><span className="text-2xl" aria-hidden="true">{m.face}</span>{m.label}
          </label>
        ))}</div>
      </fieldset>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Feelings">{FEELINGS.map((f) => (
        <label key={f} className="chip has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-bg"><input type="checkbox" name="feelings" value={f} defaultChecked={current?.feelings.includes(f)} className="sr-only" />{f}</label>
      ))}</div>
      <textarea name="note" defaultValue={current?.note ?? ""} className="input min-h-14" placeholder="Anything on your mind? (optional)" aria-label="Note" />
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save check-in"}</button>
    </form>
  );
}

export function HomeworkItem({ h, therapist }: { h: { id: string; title: string; details: string | null; due_date: string | null; done_at: string | null; client_reply: string | null }; therapist: string }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2.5 first:border-0 first:pt-0">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1"><b>{h.title}</b>{h.due_date && !h.done_at && <span className="text-xs text-muted"> · due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}</span>
        {h.done_at ? <span className="pill bg-good-soft text-good">Done</span> : <button type="button" className="chip" onClick={() => setOpen(!open)}>{open ? "Close" : "Mark done"}</button>}
      </div>
      {h.details && <span className="text-sm text-muted">{h.details}</span>}
      {open && !h.done_at && (
        <div className="flex flex-col gap-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} className="input min-h-14" placeholder={`How did it go? ${therapist} will see this (optional)`} aria-label="How did it go" />
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <button type="button" className="btn btn-sm self-end" disabled={pending} onClick={() => start(async () => { const r = await completeHomework(h.id, reply); if (r?.error) setErr(r.error); else setOpen(false); })}>Done</button>
        </div>
      )}
      {h.client_reply && <span className="rounded-xl bg-surface-2 px-3 py-2 text-sm">You: {h.client_reply}</span>}
    </div>
  );
}

export function CheckupForm({ id, kind }: { id: string; kind: CheckupKind }) {
  const C = CHECKUPS[kind];
  const [answers, setAnswers] = useState<(number | null)[]>(C.questions.map(() => null));
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ error?: string; score?: number; risk?: boolean } | null>(null);
  if (res && !res.error) return (
    <div className="flex flex-col gap-3">
      {res.risk && <CrisisCard strong />}
      <section className="card">
        <b>Thank you. Your answers are with your therapist.</b>
        <span className="text-sm text-muted">Your score is {res.score} out of {C.max} ({band(kind, res.score!).toLowerCase()}). This is a check-up, not a diagnosis. You&apos;ll talk it through in your next session.</span>
        <Link href="/me" className="btn">Back to Today</Link>
      </section>
    </div>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => setRes(await submitCheckup(id, answers as number[]))); }} className="flex flex-col gap-3">
      <p className="text-sm text-muted">Over the <b>last 2 weeks</b>, how often have you been bothered by the following?</p>
      {C.questions.map((q, i) => (
        <fieldset key={i} className="card">
          <legend className="sr-only">Question {i + 1}</legend>
          <span className="text-sm font-semibold">{i + 1}. {q}</span>
          <div className="grid grid-cols-2 gap-1.5">{C.options.map((o, v) => (
            <label key={o} className="cursor-pointer rounded-xl border border-line bg-surface px-2 py-2 text-center text-xs font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name={`q${i}`} value={v} className="sr-only" checked={answers[i] === v} onChange={() => setAnswers(answers.map((a, j) => (j === i ? v : a)))} />{o}
            </label>
          ))}</div>
        </fieldset>
      ))}
      {res?.error && <p role="alert" className="text-sm text-bad">{res.error}</p>}
      <button className="btn" disabled={pending || answers.some((a) => a === null)}>{pending ? "Sending…" : answers.some((a) => a === null) ? `Answer all ${C.questions.length} questions` : "Send answers"}</button>
    </form>
  );
}

export function CrisisCard({ strong = false }: { strong?: boolean }) {
  return (
    <section className={`card ${strong ? "border-bad bg-bad-soft" : ""}`}>
      <b>{strong ? "You don't have to wait for your next session" : "Need to talk to someone right now?"}</b>
      <span className="text-sm">{strong ? "If you're having thoughts of hurting yourself, please call now. It's free, private and open day and night." : "Free, private and open day and night."}</span>
      {CRISIS_LINES.map((l) => (
        <a key={l.number} href={`tel:${l.number.replace(/\D/g, "")}`} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">{l.name}</span><b className="select-all font-display tabular-nums">{l.number}</b>
        </a>
      ))}
    </section>
  );
}

export function JournalForm() {
  const [s, a, busy] = useActionState(addJournal, undefined);
  return (
    <form action={a} className="card" key={s?.ok ? Date.now() : "j"}>
      <textarea name="body" className="input min-h-28" placeholder="Write whatever is on your mind. Only you can see it unless you share it." aria-label="Journal entry" required />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shared" className="h-4 w-4 accent-[var(--accent)]" /> Share this entry with my therapist</label>
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save entry"}</button>
    </form>
  );
}
