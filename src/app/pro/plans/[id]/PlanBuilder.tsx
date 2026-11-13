"use client";
import { useState, useTransition } from "react";
import { savePlan, deletePlan } from "../../actions";
import { MEAL_SLOTS, type Meal } from "@/lib/constants";

export function PlanBuilder({ initial, planId, clientId, clientName, canDelete }: {
  initial: { name: string; tag: string; kcal: number | null; meals: Meal[] }; planId?: string; clientId?: string; clientName?: string; canDelete?: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [tag, setTag] = useState(initial.tag);
  const [kcal, setKcal] = useState(initial.kcal ? String(initial.kcal) : "");
  const [meals, setMeals] = useState<Meal[]>(initial.meals.length ? initial.meals : MEAL_SLOTS.map((n, i) => ({ name: n, time: ["06:30", "08:30", "11:00", "13:30", "17:00", "20:00"][i], items: [] })));
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const upd = (i: number, m: Partial<Meal>) => setMeals((ms) => ms.map((x, j) => (j === i ? { ...x, ...m } : x)));
  const addItem = (i: number) => { const v = (drafts[i] || "").trim(); if (!v) return; upd(i, { items: [...meals[i].items, v] }); setDrafts({ ...drafts, [i]: "" }); };

  const save = () => start(async () => {
    setError(null);
    const r = await savePlan({ id: clientId ? undefined : planId, name, tag, kcal: kcal ? parseInt(kcal) : null, meals, clientId });
    if (r?.error) setError(r.error);
  });

  return (
    <div className="flex flex-col gap-3">
      <section className="card">
        <label className="text-xs text-muted">Plan name<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Tag<input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. PCOS" /></label>
          <label className="text-xs text-muted">Calories a day<input className="input" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ""))} /></label>
        </div>
      </section>
      {meals.map((m, i) => (
        <section key={i} className="card">
          <div className="flex gap-2">
            <input className="input font-semibold" value={m.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Meal name" />
            <input className="input w-28 flex-none" type="time" value={m.time} onChange={(e) => upd(i, { time: e.target.value })} aria-label={`${m.name} time`} />
          </div>
          {m.items.map((x, xi) => (
            <div key={xi} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{x}</span>
              <button className="chip" onClick={() => upd(i, { items: m.items.filter((_, k) => k !== xi) })} aria-label={`Remove ${x}`}>Remove</button>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addItem(i); }}>
            <input className="input" value={drafts[i] || ""} onChange={(e) => setDrafts({ ...drafts, [i]: e.target.value })} placeholder="Add food, e.g. Buttermilk" aria-label={`Add food to ${m.name}`} />
            <button className="btn btn-sm">Add</button>
          </form>
          <button className="self-start text-xs font-semibold text-bad" onClick={() => setMeals(meals.filter((_, k) => k !== i))}>Remove this meal</button>
        </section>
      ))}
      <button className="btn-ghost" onClick={() => setMeals([...meals, { name: "Snack", time: "16:00", items: [] }])}>Add a meal</button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn" onClick={save} disabled={pending}>{pending ? "Saving…" : clientId ? `Send plan to ${clientName}` : "Save as my template"}</button>
      {canDelete && planId && <button className="text-sm font-semibold text-bad" onClick={() => start(() => deletePlan(planId))}>Delete this template</button>}
    </div>
  );
}
