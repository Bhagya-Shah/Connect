import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { fmtDate, fmtTime, todayIST, type Meal } from "@/lib/constants";
import { photoUrls } from "@/lib/photos";
import { FoodTile, Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { GoalBoxes } from "@/components/GoalBoxes";
import { MealPhoto } from "./MealPhoto";

export default async function Today({ searchParams }: { searchParams: Promise<{ joined?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireClient();
  const today = todayIST();
  const { data: links } = await supabase.from("client_links").select("nutritionist_id, program, n:nutritionist_id(profiles(full_name))").eq("client_id", user.id).eq("status", "active");
  const first = (profile.full_name || "").split(" ")[0];
  if (!links?.length) return (
    <>
      <TopBar title={`Hi${first ? " " + first : ""}`} />
      <Body>
        <p className="card">You&apos;re not working with a nutritionist yet. Pick your goal to find one, or open the invite link your nutritionist sent you.</p>
        <h2 className="h3">What do you need help with?</h2>
        <GoalBoxes />
      </Body>
    </>
  );
  const [{ data: plans }, { data: logs }, { data: next }] = await Promise.all([
    supabase.from("diet_plans").select("*").eq("client_id", user.id).eq("active", true),
    supabase.from("meal_logs").select("*").eq("client_id", user.id).eq("log_date", today).order("created_at"),
    supabase.from("bookings").select("starts_at, service_name").eq("client_id", user.id).eq("status", "confirmed").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
  ]);
  const urls = await photoUrls(supabase, (logs ?? []).map((l) => l.photo_path));
  return (
    <>
      <TopBar title={`Today · ${fmtDate(new Date(), { weekday: "short", day: "numeric", month: "short" })}`} />
      <Body>
        {sp.joined && <p className="rounded-xl bg-good-soft p-3 text-sm">You&apos;re connected. Your plan and meal photos live here.</p>}
        {next && <Link href="/me/account" className="card border-transparent bg-accent-soft"><span className="text-xs text-muted">Next session</span><b>{next.service_name}</b><span className="text-sm text-muted">{fmtDate(next.starts_at)} at {fmtTime(next.starts_at)}</span></Link>}
        {links.map((l) => {
          const nName = (l.n as unknown as { profiles: { full_name: string } } | null)?.profiles?.full_name ?? "your nutritionist";
          const plan = plans?.find((p) => p.nutritionist_id === l.nutritionist_id);
          const meals: Meal[] = plan?.meals ?? [];
          const mine = (logs ?? []).filter((x) => x.nutritionist_id === l.nutritionist_id);
          const sentMeals = new Set(mine.map((x) => x.meal_name));
          return (
            <section key={l.nutritionist_id} className="flex flex-col gap-3">
              {plan ? <>
                <div className="card">
                  <div className="flex justify-between text-sm"><b>Meal photos sent to {nName.split(" ")[0]}</b><span className="text-muted">{meals.filter((m) => sentMeals.has(m.name)).length} of {meals.length}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2"><i className="block h-full rounded-full bg-good" style={{ width: `${(meals.filter((m) => sentMeals.has(m.name)).length / Math.max(1, meals.length)) * 100}%` }} /></div>
                  <span className="text-xs text-muted">Snap each meal before you eat. {nName.split(" ")[0]} checks it against your plan and replies here.</span>
                </div>
                <div className="card">
                  <div><b>{plan.name}</b><br /><span className="text-xs text-muted">From {nName} · updated {fmtDate(plan.updated_at)}</span></div>
                  {meals.map((m) => {
                    const sent = mine.filter((x) => x.meal_name === m.name);
                    const last = sent.at(-1);
                    return (
                      <div key={m.name} className="flex flex-col gap-2 border-t border-line pt-2.5">
                        <div className="flex items-start gap-2.5">
                          {last ? <FoodTile label={m.name} url={last.photo_path ? urls[last.photo_path] : null} />
                            : <MealPhoto clientId={user.id} nutritionistId={l.nutritionist_id} planId={plan.id} meal={m.name} planned={m.items.join(", ")} today={today} />}
                          <span className="min-w-0 flex-1">
                            <span className="flex justify-between"><b>{m.name}</b><span className="text-xs text-muted">{m.time}</span></span>
                            <span className="text-sm text-muted">{m.items.join(" · ")}</span><br />
                            {last && !last.reply && <Pill>{last.status === "pending" ? `Sent · waiting for ${nName.split(" ")[0]}` : last.status === "on_plan" ? "On plan" : "Off plan"}</Pill>}
                          </span>
                        </div>
                        {last?.reply && <div className="rounded-xl bg-good-soft px-3 py-2 text-sm"><b>{nName.split(" ")[0]}:</b> {last.reply}</div>}
                      </div>
                    );
                  })}
                </div>
              </> : (
                <div className="card">
                  <b>{nName} is preparing your plan</b>
                  <span className="text-sm text-muted">You can already send meal photos so they see what you eat today.</span>
                  <div className="flex flex-wrap gap-3">
                    {["Breakfast", "Lunch", "Dinner"].map((m) => sentMeals.has(m) ? <FoodTile key={m} label={m} url={urls[mine.find((x) => x.meal_name === m)!.photo_path]} /> :
                      <div key={m} className="flex flex-col items-center gap-1"><MealPhoto clientId={user.id} nutritionistId={l.nutritionist_id} planId={null} meal={m} planned="" today={today} /><span className="text-xs">{m}</span></div>)}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </Body>
    </>
  );
}
