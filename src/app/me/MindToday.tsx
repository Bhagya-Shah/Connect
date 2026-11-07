import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHECKUPS, todayIST, type CheckupKind } from "@/lib/constants";
import { HomeworkItem, MoodForm } from "./MindForms";
import { giveConsent } from "./actions";

export type PsyLink = { nutritionist_id: string; consent_at: string | null; name: string; consent_text: string | null };

/** Today screen for therapy clients: consent, mood check-in, check-ups, homework, journal, help. */
export async function MindToday({ supabase, uid, links }: { supabase: SupabaseClient; uid: string; links: PsyLink[] }) {
  const ids = links.map((l) => l.nutritionist_id);
  const [{ data: mood }, { data: checks }, { data: hw }] = await Promise.all([
    supabase.from("mood_logs").select("mood, feelings, note").eq("client_id", uid).eq("log_date", todayIST()).maybeSingle(),
    supabase.from("assessments").select("id, kind, nutritionist_id, created_at").eq("client_id", uid).eq("status", "requested").in("nutritionist_id", ids),
    supabase.from("homework").select("*").eq("client_id", uid).in("nutritionist_id", ids).order("created_at", { ascending: false }).limit(20),
  ]);
  const nameOf = (id: string) => links.find((l) => l.nutritionist_id === id)?.name.split(" ").filter((w) => !/^Dr\.?$/.test(w))[0] ?? "your therapist";
  const pendingConsent = links.filter((l) => !l.consent_at);
  const weekAgo = Date.now() - 7 * 864e5;
  const homework = (hw ?? []).filter((h) => !h.done_at || Date.parse(h.done_at) > weekAgo);
  return (
    <>
      {pendingConsent.map((l) => (
        <section key={l.nutritionist_id} className="card border-accent">
          <b>Before your first session with {l.name}</b>
          <p className="whitespace-pre-line text-sm text-muted">{l.consent_text || "Please confirm you understand that sessions are confidential, that you can stop at any time, and that Connect is not an emergency service."}</p>
          <form action={giveConsent.bind(null, l.nutritionist_id)}><button className="btn w-full">I have read this and agree</button></form>
        </section>
      ))}
      <section className="card"><MoodForm current={mood} /></section>
      {checks?.map((c) => (
        <Link key={c.id} href={`/me/checkup/${c.id}`} className="card border-transparent bg-accent-soft">
          <div className="flex items-center gap-2">
            <span className="flex flex-1 flex-col"><b>{CHECKUPS[c.kind as CheckupKind].about} from {nameOf(c.nutritionist_id)}</b><span className="text-sm text-muted">{CHECKUPS[c.kind as CheckupKind].questions.length} quick questions, about 2 minutes</span></span>
            <span className="btn btn-sm">Start</span>
          </div>
        </Link>
      ))}
      {!!homework.length && (
        <section className="card">
          <h2 className="h3">Homework</h2>
          {homework.map((h) => <HomeworkItem key={h.id} h={h} therapist={nameOf(h.nutritionist_id)} />)}
        </section>
      )}
      <Link href="/me/journal" className="card">
        <div className="flex items-center gap-2"><span className="flex flex-1 flex-col"><b>Journal</b><span className="text-sm text-muted">Private by default. Share an entry with {nameOf(ids[0])} if you want to.</span></span><span className="chip">Write</span></div>
      </Link>
      <Link href="/help" className="text-center text-sm font-semibold text-bad">Need to talk to someone right now?</Link>
    </>
  );
}
