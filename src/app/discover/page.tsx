import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GOALS, goalName, rs } from "@/lib/constants";
import { Avatar, Empty, Pill, TopBar } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";
import { GoalBoxes } from "@/components/GoalBoxes";

const FILTERS = [["lang", "Gujarati"], ["lang", "Hindi"], ["food", "Jain"], ["food", "Vegan"], ["price", "Under ₹1,000"], ["mode", "Clinic visit"]] as const;

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("nutritionists").select("*, profiles!inner(full_name), services(price, active)").eq("published", true);
  if (sp.goal) q = q.contains("goals", [sp.goal]);
  if (sp.lang) q = q.contains("languages", [sp.lang]);
  if (sp.food) q = q.contains("food_types", [sp.food]);
  if (sp.mode) q = q.ilike("mode", "%clinic%");
  const { data } = await q.limit(100);
  let list = (data ?? []).map((n) => ({ ...n, from: Math.min(...(n.services ?? []).filter((s: { active: boolean; price: number }) => s.active && s.price > 0).map((s: { price: number }) => s.price), Infinity) }));
  if (sp.price) list = list.filter((n) => n.from < 1000);
  if (sp.q) { const t = sp.q.toLowerCase(); list = list.filter((n) => [n.profiles.full_name, n.city, n.about, ...n.languages, ...n.goals.map(goalName)].join(" ").toLowerCase().includes(t)); }
  list.sort((a, b) => Number(["pro", "clinic"].includes(b.plan)) - Number(["pro", "clinic"].includes(a.plan)));
  const g = GOALS.find((x) => x.id === sp.goal);
  const href = (k: string, v: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, x]) => x) as [string, string][]);
    if (p.get(k) === v) p.delete(k); else p.set(k, v);
    return `/discover?${p}`;
  };
  return (
    <Shell>
      <TopBar title={g ? g.name : "Find a nutritionist"} back="/" />
      <Body>
        <form className="flex gap-2">
          {sp.goal && <input type="hidden" name="goal" value={sp.goal} />}
          <input name="q" defaultValue={sp.q} className="input" placeholder="Search: PCOS, Surat, Gujarati" aria-label="Search" />
          <button className="btn btn-sm">Search</button>
        </form>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sp.goal && <Link href={href("goal", sp.goal)} className="chip chip-on">{g?.name} ×</Link>}
          {FILTERS.map(([k, v]) => {
            const val = k === "price" ? "1" : k === "mode" ? "clinic" : v;
            return <Link key={v} href={href(k, val)} className={`chip ${sp[k] === val ? "chip-on" : ""}`}>{v}</Link>;
          })}
        </div>
        <span className="text-xs text-muted">{list.length} nutritionist{list.length === 1 ? "" : "s"}</span>
        {list.length ? list.map((n) => (
          <Link key={n.id} href={`/n/${n.handle}`} className="card">
            <div className="flex items-center gap-2.5">
              <Avatar name={n.profiles.full_name} />
              <span className="min-w-0 flex-1"><b>{n.profiles.full_name}</b><br /><span className="text-sm text-muted">{[n.city, n.mode, n.experience_years ? `${n.experience_years} yrs` : null].filter(Boolean).join(" · ")}</span></span>
              {["pro", "clinic"].includes(n.plan) && <Pill tone="warn">Featured</Pill>}
            </div>
            {n.about && <p className="line-clamp-2 text-sm text-muted">{n.about}</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              {n.from < Infinity && <Pill>From {rs(n.from)}</Pill>}
              {n.food_types.slice(0, 2).map((f: string) => <Pill key={f} tone="good">{f}</Pill>)}
              <span className="text-xs text-muted">{n.languages.join(", ")}</span>
            </div>
          </Link>
        )) : <Empty title="No one matches yet">Try removing a filter{sp.goal ? " or pick another goal" : ""}.</Empty>}
        {!sp.goal && <><h2 className="h3 mt-2">Browse by goal</h2><GoalBoxes /></>}
      </Body>
    </Shell>
  );
}
