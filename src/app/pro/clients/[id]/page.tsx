import Link from "next/link";
import { notFound } from "next/navigation";
import { requireNutritionist } from "@/lib/auth";
import { FOOD_TYPES, GOALS, fmtDate, fmtTime, goalName, type Meal } from "@/lib/constants";
import { fileUrls, photoUrls } from "@/lib/photos";
import { whatsappLink } from "@/lib/meet";
import { Avatar, Empty, FoodTile, LineChart, Notice, Pill, Row, Stat, Tabs, TopBar } from "@/components/ui";
import { Body, Cols } from "@/components/Shell";
import { WeekGrid } from "@/components/WeekGrid";
import { Chat } from "@/components/Chat";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { SessionRow } from "@/components/SessionRow";
import { ScheduleForm } from "@/components/ScheduleForm";
import type { ClientFile, Session } from "@/lib/types";
import { addNote, deleteFile, endClient, restoreClient, reviewMeal, updateClient } from "../../actions";
import { ResetLogin } from "./ResetLogin";

const TABS = [["overview", "Overview"], ["files", "Files"], ["sessions", "Sessions"], ["plan", "Diet plan"], ["food", "Meal photos"], ["notes", "Notes"], ["chat", "Chat"]] as const;

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "overview";
  const { supabase, user, me } = await requireNutritionist();
  const { data: link } = await supabase.from("client_links").select("*, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("client_id", id).neq("status", "invited").single();
  if (!link) notFound();
  const name: string = link.profiles?.full_name || link.invite_name || "Client";
  const first = name.split(" ")[0];
  const ended = link.status === "ended";

  let content: React.ReactNode = null;
  if (tab === "overview") {
    const [{ data: weights }, { data: checkins }, { data: next }] = await Promise.all([
      supabase.from("weight_logs").select("log_date, weight, waist").eq("client_id", id).order("log_date"),
      supabase.from("checkins").select("*").eq("client_id", id).eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("bookings").select("starts_at, meet_url").eq("client_id", id).eq("nutritionist_id", user.id).eq("status", "confirmed").gte("ends_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
    ]);
    const w = (weights ?? []).map((x) => Number(x.weight));
    const now = w.at(-1) ?? link.start_weight;
    const start = link.start_weight ?? w[0];
    content = <Cols>
      <div className="flex flex-col gap-3">
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
          )) : <p className="text-sm text-muted">No check-ins yet. {first} can send one from their Progress tab.</p>}
        </section>
      </div>
      <div className="flex flex-col gap-3">
        <section className="card">
          <h2 className="h3">Login</h2>
          <Row label={link.invite_email ? "Email" : "Mobile"}>{link.invite_email || link.phone || "–"}</Row>
          {link.phone && link.invite_email && <Row label="Mobile">{link.phone}</Row>}
          {next && <Row label="Next session">{fmtDate(next.starts_at)}, {fmtTime(next.starts_at)}</Row>}
          <div className="flex flex-wrap gap-2">
            {link.phone && <a className="chip" href={whatsappLink(`Hi ${first}, `, link.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}
            {link.phone && <a className="chip" href={`tel:+91${link.phone}`}>Call</a>}
          </div>
          {!ended && link.login_owner && <ResetLogin clientId={id} practice={me.practice_name} />}
        </section>
        <form action={updateClient.bind(null, id)} className="card">
          <h2 className="h3">Details</h2>
          {link.login_owner && <label className="text-xs text-muted">Name<input name="name" defaultValue={name} className="input" maxLength={80} /></label>}
          <label className="text-xs text-muted">Goal
            <select name="goal" className="input" defaultValue={link.goal ?? ""}><option value="">Choose</option>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              {link.goal && !GOALS.some((g) => g.id === link.goal) && <option value={link.goal}>{link.goal}</option>}</select>
          </label>
          <label className="text-xs text-muted">Program<input name="program" defaultValue={link.program ?? ""} className="input" /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-muted">Height (cm)<input name="height" defaultValue={link.height_cm ?? ""} inputMode="decimal" className="input" /></label>
            <label className="text-xs text-muted">Start (kg)<input name="weight" defaultValue={link.start_weight ?? ""} inputMode="decimal" className="input" /></label>
            <label className="text-xs text-muted">Goal (kg)<input name="target" defaultValue={link.target_weight ?? ""} inputMode="decimal" className="input" /></label>
          </div>
          <label className="text-xs text-muted">Food
            <select name="food_type" className="input" defaultValue={link.food_type ?? ""}><option value="">Choose</option>{FOOD_TYPES.map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <label className="text-xs text-muted">Health conditions<input name="conditions" defaultValue={link.conditions ?? ""} className="input" /></label>
          <button className="btn-ghost btn-sm">Save details</button>
        </form>
        {ended
          ? <form action={restoreClient.bind(null, id)}><button className="btn w-full">Make active again</button></form>
          : <form action={endClient.bind(null, id)}><button className="w-full text-sm font-semibold text-bad">End program (moves to past clients, keeps their history)</button></form>}
      </div>
    </Cols>;
  }

  if (tab === "files") {
    const { data: files } = await supabase.from("client_files").select("*").eq("nutritionist_id", user.id).eq("client_id", id).order("created_at", { ascending: false });
    const urls = await fileUrls(supabase, (files ?? []).map((f) => f.path));
    content = <Cols>
      {!ended && <FileUpload nutritionistId={user.id} clientId={id} uploaderId={user.id} />}
      <section className="card">
        <h2 className="h3">Shared files</h2>
        <FileList files={(files ?? []) as ClientFile[]} urls={urls} meId={user.id} names={{ [id]: first }} deleteAction={deleteFile} empty={`Nothing shared yet. Diet plans you upload and reports ${first} uploads show up here.`} />
      </section>
    </Cols>;
  }

  if (tab === "sessions") {
    const { data: sessions } = await supabase.from("bookings").select("*").eq("nutritionist_id", user.id).eq("client_id", id).order("starts_at", { ascending: false }).limit(30);
    const up = (sessions ?? []).filter((s) => Date.parse(s.ends_at) > Date.now() && s.status === "confirmed").reverse();
    const past = (sessions ?? []).filter((s) => !up.includes(s));
    content = <Cols>
      {!ended && <ScheduleForm clients={[]} clientId={id} defaultMeet={me.meet_url} minutes={me.session_minutes} startOpen={!up.length} />}
      <div className="flex flex-col gap-3">
        <section className="card"><h2 className="h3">Upcoming</h2>{up.length ? up.map((s) => <SessionRow key={s.id} s={s as Session} who={name} pro phone={link.phone} />) : <p className="text-sm text-muted">Nothing scheduled.</p>}</section>
        {!!past.length && <section className="card"><h2 className="h3">Past</h2>{past.map((s) => <SessionRow key={s.id} s={s as Session} who={name} pro phone={link.phone} />)}</section>}
      </div>
    </Cols>;
  }

  if (tab === "plan") {
    const { data: dplan } = await supabase.from("diet_plans").select("*").eq("nutritionist_id", user.id).eq("client_id", id).eq("active", true).maybeSingle();
    content = dplan ? <>
      {sp.saved && <Notice>Plan sent to {first}. They see it on their Today screen, meal by meal.</Notice>}
      <section className="card">
        <div><b>{dplan.name}</b><br /><span className="text-sm text-muted">{dplan.kcal ? `About ${dplan.kcal} kcal a day · ` : ""}updated {fmtDate(dplan.updated_at)}</span></div>
        <div className="grid gap-x-6 md:grid-cols-2">
          {(dplan.meals as Meal[]).map((m) => (
            <div key={m.name} className="border-t border-line py-2">
              <div className="flex justify-between"><b>{m.name}</b><span className="text-xs text-muted">{m.time}</span></div>
              <ul className="list-disc pl-5 text-sm">{m.items.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-2"><Link href={`/pro/plans/${dplan.id}?client=${id}`} className="btn">Edit this plan</Link><Link href={`/pro/plans?client=${id}`} className="btn-ghost">Start from a template</Link></div>
    </> : <>
      <Empty title={`${first} has no in-app meal plan yet`}>Build one here so {first} can tick off meals with photos, or upload a PDF plan in Files.</Empty>
      <div className="flex flex-wrap gap-2"><Link href={`/pro/plans?client=${id}`} className="btn">Build a meal plan</Link><Link href={`/pro/clients/${id}?tab=files`} className="btn-ghost">Upload a PDF plan</Link></div>
    </>;
  }

  if (tab === "food") {
    const [{ data: logs }, { data: dplan }] = await Promise.all([
      supabase.from("meal_logs").select("*").eq("client_id", id).eq("nutritionist_id", user.id).gte("log_date", new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).order("created_at", { ascending: false }),
      supabase.from("diet_plans").select("meals").eq("nutritionist_id", user.id).eq("client_id", id).eq("active", true).maybeSingle(),
    ]);
    const urls = await photoUrls(supabase, (logs ?? []).slice(0, 20).map((l) => l.photo_path));
    content = <>
      {dplan && <section className="card"><WeekGrid meals={dplan.meals as Meal[]} logs={logs ?? []} /></section>}
      <div className="grid gap-3 md:grid-cols-2">
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
        )) : <Empty title="No meal photos this week">{first} sends them from the Today screen.</Empty>}
      </div>
    </>;
  }

  if (tab === "notes") {
    const { data: notes } = await supabase.from("notes").select("*").eq("client_id", id).eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    content = <section className="card">
      <span className="text-sm text-muted">Private to you. {first} never sees these.</span>
      <form action={addNote.bind(null, id)} className="flex flex-col gap-2">
        <textarea name="body" className="input min-h-20" placeholder="Notes from today's session" aria-label="New note" required />
        <button className="btn btn-sm self-end">Save note</button>
      </form>
      {notes?.map((n) => <div key={n.id} className="whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm"><div className="text-xs text-muted">{fmtDate(n.created_at)}</div>{n.body}</div>)}
    </section>;
  }

  if (tab === "chat") {
    const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("nutritionist_id", user.id).eq("client_id", id).order("created_at").limit(200);
    content = <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col"><Chat nutritionistId={user.id} clientId={id} meId={user.id} initial={msgs ?? []} disabledReason={ended ? "This client's program has ended." : undefined} /></div>;
  }

  return (
    <>
      <TopBar title={name} back="/pro/clients" />
      <Body>
        <div className="flex items-center gap-3">
          <Avatar name={name} size={52} />
          <div className="min-w-0 flex-1 leading-tight"><b>{(link.goal && goalName(link.goal)) || link.program || "Client"}</b><br /><span className="text-sm text-muted">Since {fmtDate(link.started_at)}{link.phone ? ` · ${link.phone}` : ""}</span></div>
          {ended && <Pill tone="grey">Ended</Pill>}
        </div>
        <Tabs label="Client sections" current={tab} items={TABS.map(([k, l]) => [k, l, `/pro/clients/${id}?tab=${k}`])} />
        {content}
      </Body>
    </>
  );
}
