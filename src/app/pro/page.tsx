import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, fmtDate, fmtTime, rs, todayIST } from "@/lib/constants";
import { photoUrls } from "@/lib/photos";
import { Avatar, FoodTile, Pill, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { CopyButton } from "@/components/CopyButton";
import { callState } from "@/lib/call";
import { PsyHome } from "./PsyHome";

export default async function ProHome() {
  const { supabase, user, profile, me } = await requireNutritionist();
  if (me.specialty === "psychology") return <PsyHome supabase={supabase} uid={user.id} me={me} first={(profile.full_name || "").replace(/^Dr\.?\s+/, "").split(" ")[0]} />;
  const monthStart = todayIST().slice(0, 8) + "01";
  const [{ data: links }, { data: pending }, { data: bookings }, { data: pays }, { data: recent }] = await Promise.all([
    supabase.from("client_links").select("client_id, program, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("status", "active"),
    supabase.from("meal_logs").select("id, meal_name, photo_path, planned").eq("nutritionist_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    supabase.from("bookings").select("id, starts_at, ends_at, service_name, status, client:client_id(full_name)").eq("nutritionist_id", user.id).in("status", ["confirmed", "pending_payment"]).gte("ends_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("payments").select("amount, platform_fee").eq("nutritionist_id", user.id).eq("status", "paid").gte("created_at", monthStart + "T00:00:00+05:30"),
    supabase.from("meal_logs").select("client_id, created_at").eq("nutritionist_id", user.id).gte("log_date", new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)),
  ]);
  const { data: planned } = await supabase.from("diet_plans").select("client_id, created_at").eq("nutritionist_id", user.id).eq("active", true).not("client_id", "is", null);
  const earned = (pays ?? []).reduce((a, p) => a + p.amount - p.platform_fee, 0);
  const plan = PLANS[me.plan as keyof typeof PLANS];
  const urls = await photoUrls(supabase, (pending ?? []).slice(0, 4).map((p) => p.photo_path));
  const activeIds = new Set((recent ?? []).map((r) => r.client_id));
  // only clients who have had a plan for at least a day and sent nothing in 3 days
  const withPlan = new Set((planned ?? []).filter((p) => Date.now() - Date.parse(p.created_at) > 864e5).map((p) => p.client_id));
  const quiet = (links ?? []).filter((l) => withPlan.has(l.client_id) && !activeIds.has(l.client_id));
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const first = (profile.full_name || "").split(" ")[0];

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
        <Link href="/pro/photos" className="card border-transparent bg-accent-soft">
          <div className="flex items-center gap-2">
            <span className="flex-1"><b>{pending?.length ?? 0} meal photos to review</b><br /><span className="text-sm text-muted">{quiet.length === 1 ? "1 client" : `${quiet.length} clients`} quiet for 3 days</span></span>
            <span className="btn btn-sm">Review</span>
          </div>
          {!!pending?.length && <div className="flex gap-2">{pending.slice(0, 4).map((p) => <FoodTile key={p.id} label={p.meal_name} url={p.photo_path ? urls[p.photo_path] : null} />)}</div>}
        </Link>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Earned this month" value={rs(earned)} />
          <Stat label="Active clients" value={`${links?.length ?? 0}${plan.clients ? "/" + plan.clients : ""}`} />
          <Stat label="Plan" value={plan.name} />
        </div>
        <section className="card">
          <h2 className="h3">Upcoming sessions</h2>
          {bookings?.length ? bookings.map((b) => {
            const c = b.client as unknown as { full_name: string | null } | null;
            return (
              <div key={b.id} className="flex items-center gap-2.5">
                <span className="w-16 flex-none text-sm"><b className="font-display">{fmtTime(b.starts_at)}</b><br /><span className="text-xs text-muted">{fmtDate(b.starts_at)}</span></span>
                <Avatar name={c?.full_name} />
                <span className="min-w-0 flex-1"><b>{c?.full_name || "Client"}</b><br /><span className="text-sm text-muted">{b.service_name}</span></span>
                {b.status === "pending_payment" ? <Pill tone="warn">Unpaid</Pill> : callState(b) === "open" && <Link href={`/call/${b.id}`} className="btn btn-sm">Join call</Link>}
              </div>
            );
          }) : <p className="text-sm text-muted">No upcoming sessions. Share your booking link below.</p>}
        </section>
        {quiet.length > 0 && (
          <section className="card">
            <h2 className="h3">Needs your attention</h2>
            {quiet.slice(0, 5).map((l) => {
              const p = l.profiles as unknown as { full_name: string | null } | null;
              return <Link key={l.client_id} href={`/pro/clients/${l.client_id}?tab=chat`} className="flex items-center gap-2.5"><Pill tone="bad">!</Pill><span className="flex-1"><b>{p?.full_name}</b> hasn&apos;t sent meal photos for 3 days</span></Link>;
            })}
          </section>
        )}
        <section className="card">
          <h2 className="h3">Your booking link</h2>
          <span className="text-sm text-muted">Put it in your Instagram bio. Clients book and pay here.</span>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 py-2 pl-3 pr-2 text-sm"><span className="min-w-0 flex-1 truncate select-all">{site}/n/{me.handle}</span><CopyButton text={`${site}/n/${me.handle}`} /></div>
        </section>
      </Body>
    </>
  );
}
