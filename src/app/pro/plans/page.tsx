import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, type Meal } from "@/lib/constants";
import { Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ client?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, me } = await requireNutritionist();
  const canTemplates = PLANS[me.plan as keyof typeof PLANS].templates;
  const [{ data: builtIn }, { data: mine }, { data: client }] = await Promise.all([
    supabase.from("diet_plans").select("*").is("nutritionist_id", null).is("client_id", null).order("kcal"),
    supabase.from("diet_plans").select("*").eq("nutritionist_id", user.id).is("client_id", null).order("updated_at", { ascending: false }),
    sp.client ? supabase.from("profiles").select("full_name").eq("id", sp.client).single() : Promise.resolve({ data: null }),
  ]);
  const q = sp.client ? `?client=${sp.client}` : "";
  const card = (p: { id: string; name: string; tag: string | null; kcal: number | null; meals: Meal[] }, locked = false) => (
    <Link key={p.id} href={locked ? "/pro/business#plan" : `/pro/plans/${p.id}${q}`} className={`card ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1"><b>{p.name}</b><br /><span className="text-sm text-muted">{p.meals.length} meals{p.kcal ? ` · about ${p.kcal.toLocaleString("en-IN")} kcal` : ""}</span></span>
        {locked ? <Pill tone="warn">Growth plan</Pill> : p.tag && <Pill>{p.tag}</Pill>}
      </div>
    </Link>
  );
  return (
    <>
      <TopBar title={client ? `Plan for ${client.full_name}` : "Diet plans"} back={sp.client ? `/pro/clients/${sp.client}?tab=plan` : undefined} />
      <Body>
        {sp.saved && <p className="rounded-xl bg-good-soft p-3 text-sm">Template saved.</p>}
        <span className="text-sm text-muted">{client ? "Pick a starting point. You can change every meal before sending." : "Start from a template, change it for each client, and send it in one tap."}</span>
        <Link href={`/pro/plans/new${q}`} className="btn-ghost">Start a blank plan</Link>
        {!!mine?.length && <><h2 className="label">My templates</h2>{mine.map((p) => card(p))}</>}
        <h2 className="label">Ready-made templates</h2>
        {builtIn?.map((p) => card(p, !canTemplates))}
      </Body>
    </>
  );
}
