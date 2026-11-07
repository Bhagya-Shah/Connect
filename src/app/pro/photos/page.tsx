import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { fmtTime, todayIST, type Meal } from "@/lib/constants";
import { photoUrls } from "@/lib/photos";
import { Avatar, Empty, FoodTile, Pill, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { ReviewCard } from "./ReviewCard";
import { RemindButton } from "./RemindButton";

const TABS = [["review", "To review"], ["reviewed", "Reviewed"], ["missing", "Missing"]] as const;

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, user } = await requireNutritionist();
  const tab = (await searchParams).tab || "review";
  const today = todayIST();
  const [{ data: links }, { data: logs }, { data: plans }] = await Promise.all([
    supabase.from("client_links").select("client_id, profiles:client_id(full_name)").eq("nutritionist_id", user.id).eq("status", "active"),
    supabase.from("meal_logs").select("*").eq("nutritionist_id", user.id).gte("log_date", new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)).order("created_at", { ascending: false }).limit(200),
    supabase.from("diet_plans").select("client_id, meals").eq("nutritionist_id", user.id).eq("active", true).not("client_id", "is", null),
  ]);
  const names = new Map((links ?? []).map((l) => [l.client_id, (l.profiles as unknown as { full_name: string | null } | null)?.full_name || "Client"]));
  const mine = (logs ?? []).filter((l) => names.has(l.client_id));
  const toReview = mine.filter((l) => l.status === "pending");
  const reviewed = mine.filter((l) => l.status !== "pending").slice(0, 40);

  // missing: meals in today's plan more than 30 min past their time, with no photo today
  const nowMin = (() => { const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).split(":").map(Number); return h * 60 + m; })();
  const missing: { client_id: string; meals: string[] }[] = [];
  for (const p of plans ?? []) {
    if (!names.has(p.client_id)) continue;
    const sent = new Set(mine.filter((l) => l.client_id === p.client_id && l.log_date === today).map((l) => l.meal_name));
    const due = (p.meals as Meal[]).filter((m) => { const [h, mm] = m.time.split(":").map(Number); return h * 60 + mm + 30 < nowMin && !sent.has(m.name); }).map((m) => m.name);
    if (due.length) missing.push({ client_id: p.client_id, meals: due });
  }
  const shown = tab === "review" ? toReview : reviewed;
  const urls = tab === "missing" ? {} : await photoUrls(supabase, shown.map((l) => l.photo_path));

  return (
    <>
      <TopBar title="Meal photos" />
      <Body>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Today" value={mine.filter((l) => l.log_date === today).length} />
          <Stat label="To review" value={toReview.length} />
          <Stat label="Missing" value={missing.length} />
        </div>
        <nav className="flex gap-0.5 rounded-xl border border-line bg-surface p-[3px]" aria-label="Photo list">
          {TABS.map(([k, l]) => <Link key={k} href={`/pro/photos?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={`flex-1 rounded-[9px] py-1.5 text-center text-[13px] font-semibold ${tab === k ? "bg-accent-soft text-accent" : "text-muted"}`}>{l}</Link>)}
        </nav>
        {tab === "review" && (toReview.length ? toReview.map((l) => (
          <ReviewCard key={l.id} log={l} url={l.photo_path ? urls[l.photo_path] ?? null : null} clientName={names.get(l.client_id)!} time={fmtTime(l.created_at)} />
        )) : <Empty title="All caught up">New photos show up here as clients send them.</Empty>)}
        {tab === "reviewed" && (reviewed.length ? reviewed.map((l) => (
          <div key={l.id} className="card">
            <div className="flex items-center gap-2.5">
              <FoodTile label={l.meal_name} url={l.photo_path ? urls[l.photo_path] : null} />
              <span className="min-w-0 flex-1"><b>{names.get(l.client_id)}</b> <span className="text-xs text-muted">{l.meal_name} · {fmtTime(l.created_at)}</span><br /><span className="text-sm text-muted">{l.planned}</span></span>
              {l.status === "on_plan" ? <Pill tone="good">On plan</Pill> : <Pill tone="warn">Off plan</Pill>}
            </div>
            {l.reply && <div className="rounded-xl bg-good-soft px-3 py-2 text-sm">You: {l.reply}</div>}
          </div>
        )) : <Empty title="Nothing reviewed in the last 2 days" />)}
        {tab === "missing" && (missing.length ? <>
          <div className="card">
            {missing.map((m) => (
              <div key={m.client_id} className="flex items-center gap-2.5">
                <Avatar name={names.get(m.client_id)} />
                <span className="min-w-0 flex-1"><b>{names.get(m.client_id)}</b><br /><span className="text-sm text-muted">Not sent: {m.meals.join(", ")}</span></span>
                <RemindButton clientIds={[m.client_id]} />
              </div>
            ))}
          </div>
          <RemindButton clientIds={missing.map((m) => m.client_id)} label="Remind everyone" />
          <span className="text-center text-xs text-muted">Reminders arrive in the client&apos;s chat. WhatsApp reminders come in a later version.</span>
        </> : <Empty title="No missing photos right now">Clients who skip a meal photo show up here 30 minutes after the meal time.</Empty>)}
      </Body>
    </>
  );
}
