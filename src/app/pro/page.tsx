import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { todayIST } from "@/lib/constants";
import { fileUrls, photoUrls } from "@/lib/photos";
import { FoodTile, Pill, Stat, TopBar } from "@/components/ui";
import { Body, Cols } from "@/components/Shell";
import { SessionRow } from "@/components/SessionRow";
import { FileList } from "@/components/FileList";
import { Icons } from "@/components/icons";
import type { ClientFile, Session } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, user, profile, me } = await requireNutritionist();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 864e5).toISOString();
  const since3 = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const [{ data: links }, { data: pending }, { data: sessions }, { data: recent }, { data: files }, { count: weekCount }, { data: msgs }] = await Promise.all([
    supabase.from("client_links").select("client_id, phone, created_at, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("status", "active"),
    supabase.from("meal_logs").select("id, meal_name, photo_path").eq("nutritionist_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    supabase.from("bookings").select("*").eq("nutritionist_id", user.id).eq("status", "confirmed").gte("ends_at", now.toISOString()).order("starts_at").limit(6),
    supabase.from("meal_logs").select("client_id").eq("nutritionist_id", user.id).gte("log_date", since3),
    supabase.from("client_files").select("*").eq("nutritionist_id", user.id).neq("uploaded_by", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id).eq("status", "confirmed").gte("starts_at", now.toISOString()).lt("starts_at", weekEnd),
    supabase.from("messages").select("client_id, sender_id, created_at").eq("nutritionist_id", user.id).gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(100),
  ]);
  const name = new Map((links ?? []).map((l) => [l.client_id, (l.profiles as unknown as { full_name: string | null } | null)?.full_name || "Client"]));
  const phone = new Map((links ?? []).map((l) => [l.client_id, l.phone as string | null]));
  const active = new Set((recent ?? []).map((r) => r.client_id));
  // quiet: client for 3+ days and no meal photo in 3 days
  const quiet = (links ?? []).filter((l) => Date.now() - Date.parse(l.created_at) > 3 * 864e5 && !active.has(l.client_id));
  // unanswered: the latest message in a chat came from the client
  const lastBy = new Map<string, string>();
  for (const m of msgs ?? []) if (!lastBy.has(m.client_id)) lastBy.set(m.client_id, m.sender_id);
  const waiting = [...lastBy].filter(([c, s]) => c === s && name.has(c)).map(([c]) => c);
  const [urls, furls] = await Promise.all([
    photoUrls(supabase, (pending ?? []).slice(0, 6).map((p) => p.photo_path)),
    fileUrls(supabase, (files ?? []).map((f) => f.path)),
  ]);
  const today = todayIST();
  const todays = (sessions ?? []).filter((s) => new Date(s.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === today);
  const first = (profile.full_name || "").split(" ")[0];

  return (
    <>
      <TopBar title={`Hi${first ? ", " + first : ""}`} right={<Link href="/pro/clients/new" className="btn btn-sm">{Icons.plus}<span className="max-sm:sr-only">Add client</span></Link>} />
      <Body>
        {!me.meet_url && (
          <Link href="/pro/more" className="card border-saffron bg-saffron-soft">
            <b>Add your Google Meet link</b>
            <span className="text-sm">Save it once in Settings and every session you schedule gets a Join button for you and your client.</span>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Active clients" value={links?.length ?? 0} />
          <Stat label="Sessions this week" value={weekCount ?? 0} />
          <Stat label="Photos to review" value={pending?.length ?? 0} />
          <Stat label="Need attention" value={quiet.length + waiting.length} />
        </div>
        <Cols>
          <section className="card">
            <div className="flex items-center justify-between"><h2 className="h3">{todays.length ? "Today" : "Upcoming sessions"}</h2><Link href="/pro/sessions" className="text-sm font-semibold text-accent">All sessions</Link></div>
            {sessions?.length ? (todays.length ? todays : sessions).map((s) => <SessionRow key={s.id} s={s as Session} who={name.get(s.client_id) ?? "Client"} pro compact phone={phone.get(s.client_id)} clientId={s.client_id} />)
              : <p className="text-sm text-muted">Nothing scheduled. <Link href="/pro/sessions?new=1" className="font-semibold text-accent">Schedule a session</Link></p>}
            {!!todays.length && sessions!.length > todays.length && <p className="text-xs text-muted">{sessions!.length - todays.length} more later this week.</p>}
          </section>
          <Link href="/pro/photos" className="card border-transparent bg-accent-soft">
            <div className="flex items-center gap-2">
              <span className="flex-1"><b>{pending?.length ? `${pending.length} meal photos to review` : "No meal photos waiting"}</b><br /><span className="text-sm text-muted">Mark on plan or off plan and reply in one tap.</span></span>
              <span className="btn btn-sm">Review</span>
            </div>
            {!!pending?.length && <div className="flex gap-2 overflow-hidden">{pending.slice(0, 6).map((p) => <FoodTile key={p.id} label={p.meal_name} url={p.photo_path ? urls[p.photo_path] : null} />)}</div>}
          </Link>
          {(quiet.length > 0 || waiting.length > 0) && (
            <section className="card">
              <h2 className="h3">Needs your attention</h2>
              {waiting.slice(0, 5).map((c) => <Link key={"w" + c} href={`/pro/clients/${c}?tab=chat`} className="flex items-center gap-2.5"><Pill tone="blue">Chat</Pill><span className="flex-1"><b>{name.get(c)}</b> is waiting for your reply</span></Link>)}
              {quiet.slice(0, 5).map((l) => <Link key={l.client_id} href={`/pro/clients/${l.client_id}?tab=chat`} className="flex items-center gap-2.5"><Pill tone="bad">Quiet</Pill><span className="flex-1"><b>{name.get(l.client_id)}</b> hasn&apos;t sent meal photos for 3 days</span></Link>)}
            </section>
          )}
          <section className="card">
            <h2 className="h3">New from clients</h2>
            <FileList files={(files ?? []) as ClientFile[]} urls={furls} meId={user.id} names={Object.fromEntries(name)} empty="Reports and files your clients upload show up here." />
          </section>
          {!links?.length && (
            <section className="card border-transparent bg-accent-soft">
              <h2 className="h3">Get started in 3 steps</h2>
              <ol className="list-decimal pl-5 text-sm leading-7">
                <li><Link href="/pro/clients/new" className="font-semibold text-accent">Add your first client</Link>. You get a login to send them on WhatsApp.</li>
                <li>Share their diet plan as a PDF, or build one in the app.</li>
                <li>Schedule a session. It comes with a Google Meet link.</li>
              </ol>
            </section>
          )}
        </Cols>
      </Body>
    </>
  );
}
