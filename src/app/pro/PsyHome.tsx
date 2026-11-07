import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHECKUPS, PLANS, band, fmtDate, fmtTime, rs, todayIST, type CheckupKind } from "@/lib/constants";
import { callState } from "@/lib/call";
import { Avatar, Pill, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { CopyButton } from "@/components/CopyButton";
import type { Nutritionist } from "@/lib/types";

type Name = { full_name: string | null } | null;

/** Home screen for psychologists and counsellors: who needs attention first, then today's sessions. */
export async function PsyHome({ supabase, uid, me, first }: { supabase: SupabaseClient; uid: string; me: Nutritionist; first: string }) {
  const monthStart = todayIST().slice(0, 8) + "01";
  const since = new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10);
  const [{ data: links }, { data: bookings }, { data: pays }, { data: moods }, { data: checks }, { data: hw }] = await Promise.all([
    supabase.from("client_links").select("client_id, consent_at, profiles:client_id(full_name)").eq("nutritionist_id", uid).eq("status", "active"),
    supabase.from("bookings").select("id, starts_at, ends_at, service_name, status, client:client_id(full_name)").eq("nutritionist_id", uid).in("status", ["confirmed", "pending_payment"]).gte("ends_at", new Date().toISOString()).order("starts_at").limit(6),
    supabase.from("payments").select("amount, platform_fee").eq("nutritionist_id", uid).eq("status", "paid").gte("created_at", monthStart + "T00:00:00+05:30"),
    supabase.from("mood_logs").select("client_id, log_date, mood").gte("log_date", since).order("log_date", { ascending: false }),
    supabase.from("assessments").select("id, client_id, kind, score, risk, done_at").eq("nutritionist_id", uid).eq("status", "done").gte("done_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("done_at", { ascending: false }),
    supabase.from("homework").select("client_id, done_at").eq("nutritionist_id", uid).gte("created_at", new Date(Date.now() - 14 * 864e5).toISOString()),
  ]);
  const nameOf = new Map((links ?? []).map((l) => [l.client_id, (l.profiles as unknown as Name)?.full_name || "Client"]));
  const mine = new Set(nameOf.keys());
  const alerts: { id: string; tone: "bad" | "warn"; text: string; tab: string }[] = [];
  for (const c of checks ?? []) if (c.risk && mine.has(c.client_id)) alerts.push({ id: c.client_id, tone: "bad", text: `${nameOf.get(c.client_id)} answered PHQ-9 question 9 (thoughts of self-harm) above 0. Please reach out today.`, tab: "checkups" });
  for (const id of mine) {
    const m = (moods ?? []).filter((x) => x.client_id === id);
    if (m.some((x) => x.mood === 1) || (m.length >= 2 && m[0].mood <= 2 && m[1].mood <= 2)) alerts.push({ id, tone: "warn", text: `${nameOf.get(id)} has logged low mood ${m.some((x) => x.mood === 1) ? "(very low)" : "two days in a row"}.`, tab: "overview" });
  }
  const seen = new Set<string>();
  const uniq = alerts.filter((a) => (seen.has(a.id + a.tone) ? false : (seen.add(a.id + a.tone), true)));
  const noConsent = (links ?? []).filter((l) => !l.consent_at).length;
  const hwDone = (hw ?? []).filter((h) => h.done_at).length;
  const earned = (pays ?? []).reduce((a, p) => a + p.amount - p.platform_fee, 0);
  const plan = PLANS[me.plan];
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const todayStr = todayIST();

  return (
    <>
      <TopBar title={`Hi${first ? ", " + first : ""}`} />
      <Body>
        {!me.published && (
          <Link href="/pro/business" className="card border-saffron bg-saffron-soft">
            <span className="font-semibold">Your profile is hidden</span>
            <span className="text-sm">Add your details and switch on &quot;Show my profile&quot; so clients can book you.</span>
          </Link>
        )}
        <section className={`card ${uniq.length ? "border-bad" : ""}`}>
          <h2 className="h3">Needs attention</h2>
          {uniq.length ? uniq.map((a, i) => (
            <Link key={i} href={`/pro/clients/${a.id}?tab=${a.tab}`} className="flex items-start gap-2.5">
              <Pill tone={a.tone}>{a.tone === "bad" ? "Risk" : "Mood"}</Pill><span className="flex-1 text-sm">{a.text}</span>
            </Link>
          )) : <p className="text-sm text-muted">No alerts. Low moods and risky check-up answers show up here.</p>}
        </section>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Earned this month" value={rs(earned)} />
          <Stat label="Active clients" value={`${mine.size}${plan.clients ? "/" + plan.clients : ""}`} />
          <Stat label="Homework done" value={`${hwDone}/${hw?.length ?? 0}`} />
        </div>
        <section className="card">
          <h2 className="h3">Sessions</h2>
          {bookings?.length ? bookings.map((b) => {
            const c = b.client as unknown as Name;
            const today = new Date(b.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === todayStr;
            return (
              <div key={b.id} className="flex items-center gap-2.5">
                <span className="w-16 flex-none text-sm"><b className="font-display">{fmtTime(b.starts_at)}</b><br /><span className="text-xs text-muted">{today ? "Today" : fmtDate(b.starts_at)}</span></span>
                <Avatar name={c?.full_name} />
                <span className="min-w-0 flex-1"><b>{c?.full_name || "Client"}</b><br /><span className="text-sm text-muted">{b.service_name}</span></span>
                {b.status === "pending_payment" ? <Pill tone="warn">Unpaid</Pill> : callState(b) === "open" && <Link href={`/call/${b.id}`} className="btn btn-sm">Join call</Link>}
              </div>
            );
          }) : <p className="text-sm text-muted">No upcoming sessions. Share your booking link below.</p>}
        </section>
        {!!checks?.length && (
          <section className="card">
            <h2 className="h3">Latest check-ups</h2>
            {checks.filter((c) => mine.has(c.client_id)).slice(0, 5).map((c) => (
              <Link key={c.id} href={`/pro/clients/${c.client_id}?tab=checkups`} className="flex items-center gap-2 text-sm">
                <span className="flex-1"><b>{nameOf.get(c.client_id)}</b> · {CHECKUPS[c.kind as CheckupKind].name}</span>
                <span className="tabular-nums">{c.score}</span><Pill tone={c.risk || c.score >= 15 ? "bad" : c.score >= 10 ? "warn" : "good"}>{band(c.kind as CheckupKind, c.score)}</Pill>
              </Link>
            ))}
          </section>
        )}
        {noConsent > 0 && <p className="rounded-xl bg-surface-2 p-3 text-sm">{noConsent === 1 ? "1 client hasn't" : `${noConsent} clients haven't`} agreed to your consent form yet. They see it when they open the app.</p>}
        <section className="card">
          <h2 className="h3">Your booking link</h2>
          <span className="text-sm text-muted">Put it in your Instagram bio. Clients book a free intro call or a session here.</span>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 py-2 pl-3 pr-2 text-sm"><span className="min-w-0 flex-1 truncate select-all">{site}/n/{me.handle}</span><CopyButton text={`${site}/n/${me.handle}`} /></div>
        </section>
      </Body>
    </>
  );
}
