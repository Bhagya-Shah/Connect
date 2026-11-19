import Link from "next/link";
import { getMyNutritionist, requireClient } from "@/lib/auth";
import { fmtDate, fmtTime, todayIST, type Meal } from "@/lib/constants";
import { fileUrls, photoUrls } from "@/lib/photos";
import { sessionState } from "@/lib/meet";
import { FoodTile, Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { FileList } from "@/components/FileList";
import { MealPhoto } from "./MealPhoto";
import type { ClientFile } from "@/lib/types";

export default async function Today() {
  const { supabase, user, profile } = await requireClient();
  const n = await getMyNutritionist();
  const first = (profile.full_name || "").split(" ")[0];
  if (!n) return (
    <>
      <TopBar title={`Hi${first ? " " + first : ""}`} />
      <Body><p className="card text-sm">Your nutritionist hasn&apos;t linked your account yet. Ask them to add you in Connect, then log in again.</p></Body>
    </>
  );
  const nFirst = n.name.split(" ")[0];
  const today = todayIST();
  const [{ data: plan }, { data: logs }, { data: next }, { data: files }] = await Promise.all([
    supabase.from("diet_plans").select("*").eq("client_id", user.id).eq("nutritionist_id", n.id).eq("active", true).maybeSingle(),
    supabase.from("meal_logs").select("*").eq("client_id", user.id).eq("nutritionist_id", n.id).eq("log_date", today).order("created_at"),
    supabase.from("bookings").select("id, starts_at, ends_at, status, service_name, meet_url, notes").eq("client_id", user.id).eq("status", "confirmed").gte("ends_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
    supabase.from("client_files").select("*").eq("client_id", user.id).eq("nutritionist_id", n.id).neq("uploaded_by", user.id).order("created_at", { ascending: false }).limit(3),
  ]);
  const [urls, furls] = await Promise.all([photoUrls(supabase, (logs ?? []).map((l) => l.photo_path)), fileUrls(supabase, (files ?? []).map((f) => f.path))]);
  const meals: Meal[] = plan?.meals ?? [];
  const sent = new Set((logs ?? []).map((x) => x.meal_name));
  const st = next ? sessionState(next) : null;

  return (
    <>
      <TopBar title={`Hi${first ? " " + first : ""}`} right={<span className="text-xs text-muted">{fmtDate(new Date())}</span>} />
      <Body>
        {next && (
          <section className="card border-transparent bg-accent-soft">
            <span className="text-xs font-semibold text-muted">{st === "soon" ? "Starting now" : "Next session"}</span>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1"><b>{next.service_name} with {nFirst}</b><br /><span className="text-sm">{fmtDate(next.starts_at)}, {fmtTime(next.starts_at)}</span></span>
              {next.meet_url ? <a href={next.meet_url} target="_blank" rel="noreferrer" className={st === "soon" ? "btn btn-sm" : "btn-ghost btn-sm !bg-surface"}>Join Google Meet</a> : <Pill tone="grey">Link coming</Pill>}
            </div>
            {next.notes && <span className="text-sm">{next.notes}</span>}
          </section>
        )}
        {!!files?.length && (
          <section className="card">
            <div className="flex items-center justify-between"><h2 className="h3">From {nFirst}</h2><Link href="/me/files" className="text-sm font-semibold text-accent">All files</Link></div>
            <FileList files={files as ClientFile[]} urls={furls} meId={user.id} names={{ [n.id]: nFirst }} />
          </section>
        )}
        {plan ? <>
          <div className="card">
            <div className="flex justify-between text-sm"><b>Meal photos sent today</b><span className="text-muted">{meals.filter((m) => sent.has(m.name)).length} of {meals.length}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2"><i className="block h-full rounded-full bg-good" style={{ width: `${(meals.filter((m) => sent.has(m.name)).length / Math.max(1, meals.length)) * 100}%` }} /></div>
            <span className="text-xs text-muted">Snap each meal before you eat. {nFirst} checks it against your plan and replies here.</span>
          </div>
          <div className="card">
            <div><b>{plan.name}</b><br /><span className="text-xs text-muted">From {n.name} · updated {fmtDate(plan.updated_at)}</span></div>
            {meals.map((m) => {
              const last = (logs ?? []).filter((x) => x.meal_name === m.name).at(-1);
              return (
                <div key={m.name} className="flex flex-col gap-2 border-t border-line pt-2.5">
                  <div className="flex items-start gap-2.5">
                    {last ? <FoodTile label={m.name} url={last.photo_path ? urls[last.photo_path] : null} />
                      : <MealPhoto clientId={user.id} nutritionistId={n.id} planId={plan.id} meal={m.name} planned={m.items.join(", ")} today={today} />}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between"><b>{m.name}</b><span className="text-xs text-muted">{m.time}</span></span>
                      <span className="text-sm text-muted">{m.items.join(" · ")}</span><br />
                      {last && !last.reply && <Pill>{last.status === "pending" ? `Sent · waiting for ${nFirst}` : last.status === "on_plan" ? "On plan" : "Off plan"}</Pill>}
                    </span>
                  </div>
                  {last?.reply && <div className="rounded-xl bg-good-soft px-3 py-2 text-sm"><b>{nFirst}:</b> {last.reply}</div>}
                </div>
              );
            })}
          </div>
        </> : (
          <div className="card">
            <b>Send today&apos;s meal photos</b>
            <span className="text-sm text-muted">{nFirst} sees what you eat and replies here. {files?.some((f) => f.kind === "diet_plan") ? "Your diet plan is in Files." : ""}</span>
            <div className="flex flex-wrap gap-3">
              {["Breakfast", "Lunch", "Snack", "Dinner"].map((m) => {
                const l = (logs ?? []).find((x) => x.meal_name === m);
                return (
                  <div key={m} className="flex flex-col items-center gap-1">
                    {l ? <FoodTile label={m} url={l.photo_path ? urls[l.photo_path] : null} /> : <MealPhoto clientId={user.id} nutritionistId={n.id} planId={null} meal={m} planned="" today={today} />}
                    <span className="text-xs">{m}</span>
                    {l?.reply && <span className="max-w-24 text-center text-[11px] text-good">{l.reply}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Body>
    </>
  );
}
