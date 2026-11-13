import Link from "next/link";
import { notFound } from "next/navigation";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, fmtDate, fmtTime, rs, type Meal, goalName } from "@/lib/constants";
import { photoUrls } from "@/lib/photos";
import { Avatar, Empty, FoodTile, LineChart, Pill, Row, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { WeekGrid } from "@/components/WeekGrid";
import { Chat } from "@/components/Chat";
import { addNote, endClient, reviewMeal, updateClient } from "../../actions";
import { PSY_TABS, PsyClient } from "./PsyClient";

const TABS = [["overview", "Overview"], ["plan", "Diet plan"], ["food", "Food log"], ["notes", "Notes"], ["chat", "Chat"]] as const;

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab || "overview";
  const { supabase, user, me } = await requireNutritionist();
  const { data: link } = await supabase.from("client_links").select("*, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("client_id", id).single();
  if (!link) notFound();
  const name = link.profiles?.full_name || "Client";
  const plan = PLANS[me.plan as keyof typeof PLANS];
  const psy = me.specialty === "psychology";
  const { data: dplan } = psy ? { data: null } : await supabase.from("diet_plans").select("*").eq("nutritionist_id", user.id).eq("client_id", id).eq("active", true).maybeSingle();

  let content: React.ReactNode = null;
  if (psy) content = await PsyClient({ supabase, uid: user.id, id, name, link, tab, tools: plan.tools, chat: plan.chat });
  else if (tab === "overview") {
    const [{ data: weights }, { data: checkins }, { data: bookings }, { data: pays }] = await Promise.all([
      supabase.from("weight_logs").select("log_date, weight, waist").eq("client_id", id).order("log_date"),
      supabase.from("checkins").select("*").eq("client_id", id).eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("bookings").select("*").eq("client_id", id).eq("nutritionist_id", user.id).order("starts_at", { ascending: false }).limit(5),
      supabase.from("payments").select("amount, status, created_at").eq("client_id", id).eq("nutritionist_id", user.id).eq("status", "paid"),
    ]);
    const w = (weights ?? []).map((x) => Number(x.weight));
    const now = w.at(-1) ?? link.start_weight;
    const start = link.start_weight ?? w[0];
    content = <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Start" value={start ? `${start} kg` : "–"} />
        <Stat label="Now" value={now ? `${now} kg` : "–"} />
        <Stat label="Goal" value={link.target_weight ? `${link.target_weight} kg` : "–"} />
      </div>
      <section className="card">
        <div className="flex items-center justify-between"><h2 className="h3">Weight</h2>{start && now && start > now && <Pill tone="good">−{(start - now).toFixed(1)} kg</Pill>}</div>
        <LineChart data={w} unit="kg" goal={link.target_weight} />
        {link.height_cm && now ? <Row label="BMI">{(now / (link.height_cm / 100) ** 2).toFixed(1)}</Row> : null}
        {weights?.at(-1)?.waist ? <Row label="Waist">{weights.at(-1)!.waist} cm</Row> : null}
      </section>
      <section className="card">
        <h2 className="h3">Weekly check-ins</h2>
        {checkins?.length ? checkins.map((c) => (
          <div key={c.id} className="rounded-xl bg-surface-2 p-3 text-sm">
            <div className="text-xs text-muted">{fmtDate(c.created_at)} · Energy {c.energy}/5 · Hunger {c.hunger}/5</div>{c.note}
          </div>
        )) : <p className="text-sm text-muted">No check-ins yet.</p>}
      </section>
      <form action={updateClient.bind(null, id)} className="card">
        <h2 className="h3">About</h2>
        <label className="text-xs text-muted">Program<input name="program" defaultValue={link.program ?? ""} className="input" /></label>
        <label className="text-xs text-muted">Goal<input name="goal" defaultValue={link.goal ? goalName(link.goal) : ""} className="input" /></label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted">Height (cm)<input name="height" defaultValue={link.height_cm ?? ""} inputMode="decimal" className="input" /></label>
          <label className="text-xs text-muted">Start (kg)<input name="weight" defaultValue={link.start_weight ?? ""} inputMode="decimal" className="input" /></label>
          <label className="text-xs text-muted">Goal (kg)<input name="target" defaultValue={link.target_weight ?? ""} inputMode="decimal" className="input" /></label>
        </div>
        {link.food_type && <Row label="Food">{link.food_type}</Row>}
        {link.conditions && <Row label="Health">{link.conditions}</Row>}
        <button className="btn-ghost btn-sm">Save</button>
      </form>
      <section className="card">
        <h2 className="h3">Sessions and payments</h2>
        {bookings?.length ? bookings.map((b) => <Row key={b.id} label={`${fmtDate(b.starts_at)} ${fmtTime(b.starts_at)}`}>{b.service_name} · {b.status.replace("_", " ")}</Row>) : <p className="text-sm text-muted">No sessions booked.</p>}
        <Row label="Total paid">{rs((pays ?? []).reduce((a, p) => a + p.amount, 0))}</Row>
      </section>
      <form action={endClient.bind(null, id)}><button className="w-full text-sm font-semibold text-bad">End program (frees a client slot)</button></form>
    </>;
  }

  if (!psy && tab === "plan") {
    content = dplan ? <>
      {sp.saved && <p className="rounded-xl bg-good-soft p-3 text-sm">Plan sent to {name}. They see it in their Today tab.</p>}
      <section className="card">
        <div><b>{dplan.name}</b><br /><span className="text-sm text-muted">{dplan.kcal ? `About ${dplan.kcal} kcal a day · ` : ""}updated {fmtDate(dplan.updated_at)}</span></div>
        {(dplan.meals as Meal[]).map((m) => (
          <div key={m.name} className="border-t border-line pt-2">
            <div className="flex justify-between"><b>{m.name}</b><span className="text-xs text-muted">{m.time}</span></div>
            <ul className="list-disc pl-5 text-sm">{m.items.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        ))}
      </section>
      <Link href={`/pro/plans/${dplan.id}?client=${id}`} className="btn">Edit this plan</Link>
    </> : <>
      <Empty title={`${name} has no diet plan yet`}>Start from a template or a blank plan.</Empty>
      <Link href={`/pro/plans?client=${id}`} className="btn">Choose a plan</Link>
    </>;
  }

  if (!psy && tab === "food") {
    const { data: logs } = await supabase.from("meal_logs").select("*").eq("client_id", id).eq("nutritionist_id", user.id)
      .gte("log_date", new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).order("created_at", { ascending: false });
    const urls = await photoUrls(supabase, (logs ?? []).slice(0, 20).map((l) => l.photo_path));
    content = <>
      {plan.grid ? (dplan ? <section className="card"><WeekGrid meals={dplan.meals as Meal[]} logs={logs ?? []} /></section> : null)
        : <p className="rounded-xl bg-saffron-soft p-3 text-sm">The weekly photo grid comes with the Growth plan. <Link href="/pro/business#plan" className="font-semibold underline">Upgrade</Link></p>}
      {logs?.length ? logs.slice(0, 20).map((l) => (
        <div key={l.id} className="card">
          <div className="flex items-center gap-2.5">
            <FoodTile label={l.meal_name} url={l.photo_path ? urls[l.photo_path] : null} />
            <span className="min-w-0 flex-1"><b>{l.meal_name}</b> <span className="text-xs text-muted">{fmtDate(l.created_at)} {fmtTime(l.created_at)}</span><br /><span className="text-sm text-muted">{l.note || l.planned}</span></span>
            {l.status === "on_plan" ? <Pill tone="good">On plan</Pill> : l.status === "off_plan" ? <Pill tone="warn">Off plan</Pill> : <Pill>New</Pill>}
          </div>
          {l.reply ? <div className="rounded-xl bg-good-soft px-3 py-2 text-sm">You: {l.reply}</div> : (
            <form action={async (f: FormData) => { "use server"; await reviewMeal(l.id, null, String(f.get("reply") || "")); }} className="flex gap-2">
              <input name="reply" className="input" placeholder="Reply to this meal" aria-label={`Reply to ${l.meal_name}`} />
              <button className="btn btn-sm">Send</button>
            </form>
          )}
        </div>
      )) : <Empty title="No meal photos this week">Send a reminder from the Chat tab.</Empty>}
    </>;
  }

  if (!psy && tab === "notes") {
    const { data: notes } = await supabase.from("notes").select("*").eq("client_id", id).eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    content = <section className="card">
      <span className="text-sm text-muted">Private to you. {name} never sees these.</span>
      <form action={addNote.bind(null, id)} className="flex flex-col gap-2">
        <textarea name="body" className="input min-h-20" placeholder="Notes from today's session" aria-label="New note" required />
        <button className="btn btn-sm self-end">Save note</button>
      </form>
      {notes?.map((n) => <div key={n.id} className="rounded-xl bg-surface-2 p-3 text-sm"><div className="text-xs text-muted">{fmtDate(n.created_at)}</div>{n.body}</div>)}
    </section>;
  }

  if (!psy && tab === "chat") {
    const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("nutritionist_id", user.id).eq("client_id", id).order("created_at").limit(200);
    content = <Chat nutritionistId={user.id} clientId={id} meId={user.id} initial={msgs ?? []}
      disabledReason={plan.chat ? undefined : "Chat comes with the Growth plan. Reminders you send from Meal photos still reach the client."} />;
  }

  return (
    <>
      <TopBar title={name} back="/pro/clients" />
      <Body>
        <div className="flex items-center gap-3">
          <Avatar name={name} size={56} />
          <div className="min-w-0 flex-1"><b>{link.program || "Client"}</b><br /><span className="text-sm text-muted">Since {fmtDate(link.started_at)}{link.source === "search" ? " · found you in search" : ""}</span></div>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface p-[3px]" aria-label="Client sections">
          {(psy ? PSY_TABS : TABS).map(([k, l]) => <Link key={k} href={`/pro/clients/${id}?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={`flex-1 whitespace-nowrap rounded-[9px] px-1.5 py-1.5 text-center text-[12.5px] font-semibold ${tab === k ? "bg-accent-soft text-accent" : "text-muted"}`}>{l}</Link>)}
        </nav>
        {content}
      </Body>
    </>
  );
}
