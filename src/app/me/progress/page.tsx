import { requireClient } from "@/lib/auth";
import { LineChart, Pill, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { CheckinForm, WeightForm } from "./Forms";
import { MoodStrip, ScoreHistory, topFeelings } from "@/components/Mind";
import { CHECKUPS, type CheckupKind } from "@/lib/constants";

export default async function Progress() {
  const { supabase, user } = await requireClient();
  const [{ data: weights }, { data: all }, { data: logs }, { data: moods }, { data: checks }] = await Promise.all([
    supabase.from("weight_logs").select("log_date, weight, waist").eq("client_id", user.id).order("log_date"),
    supabase.from("client_links").select("nutritionist_id, start_weight, target_weight, height_cm, n:nutritionist_id(specialty, profiles(full_name))").eq("client_id", user.id).eq("status", "active"),
    supabase.from("meal_logs").select("status").eq("client_id", user.id).gte("log_date", new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)),
    supabase.from("mood_logs").select("log_date, mood, feelings").eq("client_id", user.id).gte("log_date", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).order("log_date"),
    supabase.from("assessments").select("kind, score, risk, done_at").eq("client_id", user.id).eq("status", "done").order("done_at"),
  ]);
  const isPsy = (l: { n: unknown }) => (l.n as { specialty?: string } | null)?.specialty === "psychology";
  const links = (all ?? []).filter((l) => !isPsy(l));
  const hasPsy = (all ?? []).some(isPsy);
  const m = moods ?? [];
  const mind = hasPsy ? <>
    <section className="card">
      <h2 className="h3">Mood</h2>
      <MoodStrip logs={m} days={14} />
      {m.length >= 2 ? <LineChart data={m.map((x) => x.mood)} unit="/5" /> : <p className="text-sm text-muted">Check in on your Today screen to see your mood over time.</p>}
      {!!m.length && <div className="flex flex-wrap gap-1.5">{topFeelings(m).map(([f, n]) => <Pill key={f} tone="grey">{f} × {n}</Pill>)}</div>}
    </section>
    {(Object.keys(CHECKUPS) as CheckupKind[]).filter((k) => checks?.some((c) => c.kind === k)).map((k) => <ScoreHistory key={k} kind={k} rows={(checks ?? []).filter((c) => c.kind === k)} />)}
  </> : null;
  const w = (weights ?? []).map((x) => Number(x.weight));
  const link = links?.[0];
  const start = link?.start_weight ?? w[0];
  const now = w.at(-1);
  const reviewed = (logs ?? []).filter((l) => l.status !== "pending");
  const score = reviewed.length ? Math.round((reviewed.filter((l) => l.status === "on_plan").length / reviewed.length) * 100) : null;
  if (!links.length) return (
    <>
      <TopBar title="My progress" />
      <Body>{mind ?? <p className="card text-sm text-muted">Your progress shows here once you start working with someone.</p>}</Body>
    </>
  );
  return (
    <>
      <TopBar title="My progress" />
      <Body>
        {mind}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Start" value={start ? `${start} kg` : "–"} />
          <Stat label="Now" value={now ? `${now} kg` : "–"} />
          <Stat label="Goal" value={link?.target_weight ? `${link.target_weight} kg` : "–"} />
        </div>
        <section className="card">
          <div className="flex items-center justify-between"><h2 className="h3">Weight</h2>{start && now && start > now && <Pill tone="good">−{(start - now).toFixed(1)} kg</Pill>}</div>
          <LineChart data={w} unit="kg" goal={link?.target_weight} />
          <WeightForm />
        </section>
        <section className="card">
          <div className="flex justify-between text-sm"><span>Meals on plan (last 7 days)</span><b>{score === null ? "–" : `${score}%`}</b></div>
          {link?.height_cm && now ? <div className="flex justify-between text-sm"><span>BMI</span><b>{(now / (link.height_cm / 100) ** 2).toFixed(1)}</b></div> : null}
          {weights?.at(-1)?.waist ? <div className="flex justify-between text-sm"><span>Waist</span><b>{weights.at(-1)!.waist} cm</b></div> : null}
        </section>
        {link && (
          <section className="card">
            <h2 className="h3">Weekly check-in</h2>
            <span className="text-sm text-muted">Your nutritionist reads this before your next session.</span>
            <CheckinForm nutritionistId={link.nutritionist_id} name={(link.n as unknown as { profiles: { full_name: string } } | null)?.profiles?.full_name ?? "your nutritionist"} />
          </section>
        )}
      </Body>
    </>
  );
}
