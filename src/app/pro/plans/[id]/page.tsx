import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { requireNutritionist } from "@/lib/auth";
import { TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { PlanBuilder } from "./PlanBuilder";

export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ client?: string }> }) {
  const { id } = await params;
  const { client } = await searchParams;
  const { supabase, user, me } = await requireNutritionist();
  if (me.specialty === "psychology") redirect("/pro");
  let initial = { name: "New plan", tag: "", kcal: null as number | null, meals: [] as never[] };
  let own = false;
  if (id !== "new") {
    const { data: p } = await supabase.from("diet_plans").select("*").eq("id", id).single();
    if (!p) notFound();
    initial = { name: p.name, tag: p.tag ?? "", kcal: p.kcal, meals: p.meals };
    own = p.nutritionist_id === user.id && !p.client_id;
  }
  let clientName: string | undefined;
  if (client) {
    const { data: c } = await supabase.from("profiles").select("full_name").eq("id", client).single();
    if (!c) notFound();
    clientName = c.full_name ?? "client";
  }
  return (
    <>
      <TopBar title={clientName ? `Plan for ${clientName}` : "Plan builder"} back={client ? `/pro/plans?client=${client}` : "/pro/plans"} />
      <Body><PlanBuilder initial={initial} planId={own ? id : undefined} clientId={client} clientName={clientName} canDelete={own && !client} /></Body>
    </>
  );
}
