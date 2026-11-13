import { IST } from "@/lib/constants";

type Log = { log_date: string; meal_name: string; status: string };

/** Last 7 days × plan meals. Each cell: on plan, off plan, sent (not reviewed), missing, or still to come. */
export function WeekGrid({ meals, logs }: { meals: { name: string; time: string }[]; logs: Log[] }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5).toLocaleDateString("en-CA", { timeZone: IST }));
  const today = days[6];
  const nowMin = (() => { const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit" }).split(":").map(Number); return h * 60 + m; })();
  const cls = { on_plan: "bg-good", off_plan: "bg-saffron", pending: "bg-accent", missing: "bg-bad-soft border border-dashed border-bad", later: "bg-surface-2" };
  const reviewed = logs.filter((l) => l.status !== "pending");
  const score = reviewed.length ? Math.round((reviewed.filter((l) => l.status === "on_plan").length / reviewed.length) * 100) : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between"><h2 className="h3">Last 7 days</h2>{score !== null && <span className="text-sm"><b>{score}%</b> on plan</span>}</div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[300px] gap-1 text-[11.5px]" style={{ gridTemplateColumns: "84px repeat(7, 1fr)" }}>
          <span />
          {days.map((d) => <span key={d} className="text-center text-muted">{new Date(d + "T12:00:00+05:30").toLocaleDateString("en-IN", { weekday: "narrow" })}</span>)}
          {meals.map((m) => {
            const [h, mm] = m.time.split(":").map(Number);
            return [
              <span key={m.name} className="truncate text-muted">{m.name}</span>,
              ...days.map((d) => {
                const l = logs.find((x) => x.log_date === d && x.meal_name === m.name);
                const k = l ? l.status : d === today && h * 60 + mm + 30 > nowMin ? "later" : "missing";
                return <span key={m.name + d} title={`${m.name}, ${d}: ${k.replace("_", " ")}`} className={`h-[22px] rounded-md ${cls[k as keyof typeof cls]}`} />;
              }),
            ];
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-good" />On plan</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-saffron" />Off plan</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-accent" />To review</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-bad bg-bad-soft" />Missing</span>
      </div>
    </div>
  );
}
