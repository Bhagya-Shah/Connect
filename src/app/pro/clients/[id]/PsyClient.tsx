import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHECKUPS, EXERCISES, MOODS, band, fmtDate, fmtTime, rs, type CheckupKind } from "@/lib/constants";
import { Empty, Pill, Row, Stat } from "@/components/ui";
import { MoodStrip, ScoreHistory, topFeelings } from "@/components/Mind";
import { Chat } from "@/components/Chat";
import { endClient, updateClient } from "../../actions";
import { addSessionNote, assignHomework, cancelCheckup, deleteHomework, requestCheckup } from "../../psy-actions";

export const PSY_TABS = [["overview", "Overview"], ["notes", "Session notes"], ["homework", "Homework"], ["checkups", "Check-ups"], ["journal", "Journal"], ["chat", "Chat"]] as const;

type Link_ = { client_id: string; program: string | null; goal: string | null; consent_at: string | null };

const Upgrade = ({ what }: { what: string }) => (
  <p className="rounded-xl bg-saffron-soft p-3 text-sm">{what} come with the Growth plan. <Link href="/pro/business#plan" className="font-semibold underline">Upgrade</Link></p>
);

export async function PsyClient({ supabase, uid, id, name, link, tab, tools, chat }: {
  supabase: SupabaseClient; uid: string; id: string; name: string; link: Link_; tab: string; tools: boolean; chat: boolean;
}) {
  const first = name.split(" ")[0];

  if (tab === "overview") {
    const [{ data: moods }, { data: checks }, { data: bookings }, { data: pays }] = await Promise.all([
      supabase.from("mood_logs").select("log_date, mood, feelings, note").eq("client_id", id).gte("log_date", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).order("log_date", { ascending: false }),
      supabase.from("assessments").select("kind, score, risk, done_at").eq("client_id", id).eq("nutritionist_id", uid).eq("status", "done").order("done_at", { ascending: false }),
      supabase.from("bookings").select("*").eq("client_id", id).eq("nutritionist_id", uid).order("starts_at", { ascending: false }).limit(6),
      supabase.from("payments").select("amount").eq("client_id", id).eq("nutritionist_id", uid).eq("status", "paid"),
    ]);
    const m = moods ?? [];
    const avg = m.length ? (m.reduce((a, x) => a + x.mood, 0) / m.length).toFixed(1) : "–";
    const lastPhq = checks?.find((c) => c.kind === "phq9"), lastGad = checks?.find((c) => c.kind === "gad7");
    const sessions = (bookings ?? []).filter((b) => b.status === "confirmed" || b.status === "completed");
    return <>
      {!link.consent_at && <p className="rounded-xl bg-saffron-soft p-3 text-sm">{first} hasn&apos;t agreed to your consent form yet. They see it when they open the app.</p>}
      {checks?.some((c) => c.risk) && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad"><b>Risk flag.</b> {first} answered PHQ-9 question 9 above 0 on {fmtDate(checks.find((c) => c.risk)!.done_at!)}. Follow your safety plan and check in with them.</p>}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Mood, 30 days" value={`${avg}/5`} />
        <Stat label="PHQ-9" value={lastPhq ? `${lastPhq.score}` : "–"} />
        <Stat label="GAD-7" value={lastGad ? `${lastGad.score}` : "–"} />
      </div>
      <section className="card">
        <h2 className="h3">Mood, last 14 days</h2>
        <MoodStrip logs={m} />
        {!!m.length && <div className="flex flex-wrap gap-1.5">{topFeelings(m).map(([f, n]) => <Pill key={f} tone="grey">{f} × {n}</Pill>)}</div>}
        {m.filter((x) => x.note).slice(0, 3).map((x) => (
          <div key={x.log_date} className="rounded-xl bg-surface-2 p-3 text-sm"><div className="text-xs text-muted">{fmtDate(x.log_date)} · {MOODS[x.mood - 1].face} {MOODS[x.mood - 1].label}</div>{x.note}</div>
        ))}
        {!m.length && <p className="text-sm text-muted">No mood check-ins yet. {first} can log mood from their Today screen.</p>}
      </section>
      <form action={updateClient.bind(null, id)} className="card">
        <h2 className="h3">About</h2>
        <label className="text-xs text-muted">Program<input name="program" defaultValue={link.program ?? ""} className="input" placeholder="e.g. Weekly CBT sessions" /></label>
        <label className="text-xs text-muted">Main concern<input name="goal" defaultValue={link.goal ?? ""} className="input" /></label>
        <Row label="Consent">{link.consent_at ? `Agreed ${fmtDate(link.consent_at)}` : "Not yet"}</Row>
        <button className="btn-ghost btn-sm">Save</button>
      </form>
      <section className="card">
        <h2 className="h3">Sessions and payments</h2>
        <Row label="Sessions so far">{sessions.length}</Row>
        {bookings?.length ? bookings.map((b) => <Row key={b.id} label={`${fmtDate(b.starts_at)} ${fmtTime(b.starts_at)}`}>{b.service_name} · {b.status.replace("_", " ")}</Row>) : <p className="text-sm text-muted">No sessions booked.</p>}
        <Row label="Total paid">{rs((pays ?? []).reduce((a, p) => a + p.amount, 0))}</Row>
      </section>
      <form action={endClient.bind(null, id)}><button className="w-full text-sm font-semibold text-bad">End therapy (frees a client slot)</button></form>
    </>;
  }

  if (tab === "notes") {
    const { data: notes } = await supabase.from("notes").select("*").eq("client_id", id).eq("nutritionist_id", uid).order("created_at", { ascending: false });
    return <section className="card">
      <span className="text-sm text-muted">Private to you. {first} never sees these.</span>
      <form action={addSessionNote.bind(null, id)} className="flex flex-col gap-2">
        <label className="text-xs text-muted">What we talked about<textarea name="talked" className="input min-h-16" placeholder="Main themes, events since last session" /></label>
        <label className="text-xs text-muted">What I noticed<textarea name="noticed" className="input min-h-14" placeholder="Mood, affect, risk, progress" /></label>
        <label className="text-xs text-muted">Plan for next time<textarea name="plan" className="input min-h-14" placeholder="Homework, focus for next session" /></label>
        <button className="btn btn-sm self-end">Save note</button>
      </form>
      {notes?.map((n) => <div key={n.id} className="whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm"><div className="text-xs text-muted">{fmtDate(n.created_at)} {fmtTime(n.created_at)}</div>{n.body}</div>)}
    </section>;
  }

  if (tab === "homework") {
    if (!tools) return <Upgrade what="Homework and the exercise library" />;
    const { data: hw } = await supabase.from("homework").select("*").eq("client_id", id).eq("nutritionist_id", uid).order("created_at", { ascending: false });
    return <>
      <form action={assignHomework.bind(null, id)} className="card">
        <h2 className="h3">Give homework</h2>
        <label className="text-xs text-muted">From the library<select name="exercise" className="input" defaultValue=""><option value="">Write my own below</option>{EXERCISES.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
        <label className="text-xs text-muted">Or your own title<input name="title" className="input" placeholder="e.g. Notice 3 worries and rate them" /></label>
        <label className="text-xs text-muted">Instructions (optional)<textarea name="details" className="input min-h-14" /></label>
        <label className="text-xs text-muted">Due<input name="due" type="date" className="input" /></label>
        <button className="btn btn-sm self-end">Send to {first}</button>
      </form>
      {hw?.length ? hw.map((h) => (
        <div key={h.id} className="card">
          <div className="flex items-start gap-2"><b className="flex-1">{h.title}</b>{h.done_at ? <Pill tone="good">Done {fmtDate(h.done_at)}</Pill> : <Pill tone="grey">{h.due_date ? `Due ${fmtDate(h.due_date)}` : "Open"}</Pill>}</div>
          {h.details && <span className="text-sm text-muted">{h.details}</span>}
          {h.client_reply && <div className="rounded-xl bg-good-soft px-3 py-2 text-sm"><b>{first}:</b> {h.client_reply}</div>}
          {!h.done_at && <form action={deleteHomework.bind(null, id, h.id)}><button className="text-xs font-semibold text-muted">Remove</button></form>}
        </div>
      )) : <Empty title="No homework yet">Pick an exercise above. {first} sees it on their Today screen.</Empty>}
    </>;
  }

  if (tab === "checkups") {
    if (!tools) return <Upgrade what="PHQ-9 and GAD-7 check-ups" />;
    const { data: rows } = await supabase.from("assessments").select("*").eq("client_id", id).eq("nutritionist_id", uid).order("created_at", { ascending: false });
    const open = (rows ?? []).filter((r) => r.status === "requested");
    const done = (rows ?? []).filter((r) => r.status === "done");
    return <>
      <section className="card">
        <h2 className="h3">Send a check-up</h2>
        <span className="text-sm text-muted">{first} answers on their phone. Scores are worked out for you. Every 2 to 4 weeks works well.</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(CHECKUPS) as CheckupKind[]).map((k) => (
            <form key={k} action={requestCheckup.bind(null, id, k)}><button className="btn-ghost btn-sm w-full">{CHECKUPS[k].name} · {CHECKUPS[k].about}</button></form>
          ))}
        </div>
        {open.map((o) => (
          <div key={o.id} className="flex items-center gap-2 text-sm"><Pill>Waiting</Pill><span className="flex-1">{CHECKUPS[o.kind as CheckupKind].name} sent {fmtDate(o.created_at)}</span>
            <form action={cancelCheckup.bind(null, id, o.id)}><button className="chip">Cancel</button></form></div>
        ))}
      </section>
      {(Object.keys(CHECKUPS) as CheckupKind[]).map((k) => <ScoreHistory key={k} kind={k} rows={done.filter((d) => d.kind === k)} />)}
      {done.length > 0 && <section className="card">
        <h2 className="h3">All answers</h2>
        {done.map((d) => {
          const C = CHECKUPS[d.kind as CheckupKind];
          return (
            <details key={d.id} className="rounded-xl bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer"><b>{C.name}</b> · {fmtDate(d.done_at)} · {d.score} ({band(d.kind as CheckupKind, d.score)}){d.risk && <span className="font-semibold text-bad"> · risk</span>}</summary>
              <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">{C.questions.map((q, i) => <li key={i} className={d.kind === "phq9" && i === 8 && d.answers[i] > 0 ? "font-semibold text-bad" : ""}>{q}: <b>{C.options[d.answers[i]]}</b></li>)}</ol>
            </details>
          );
        })}
      </section>}
    </>;
  }

  if (tab === "journal") {
    if (!tools) return <Upgrade what="Shared journal entries" />;
    const { data: entries } = await supabase.from("journal_entries").select("*").eq("client_id", id).eq("shared", true).order("created_at", { ascending: false }).limit(50);
    return entries?.length ? <>
      <span className="text-sm text-muted">Only entries {first} chose to share with you.</span>
      {entries.map((e) => <div key={e.id} className="card whitespace-pre-line text-sm"><span className="text-xs text-muted">{fmtDate(e.created_at)} {fmtTime(e.created_at)}</span>{e.body}</div>)}
    </> : <Empty title="Nothing shared yet">{first} can write in their journal and choose to share an entry with you.</Empty>;
  }

  if (tab === "chat") {
    const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("nutritionist_id", uid).eq("client_id", id).order("created_at").limit(200);
    return <Chat nutritionistId={uid} clientId={id} meId={uid} initial={msgs ?? []}
      disabledReason={chat ? undefined : "Chat comes with the Growth plan."} />;
  }
  return null;
}
