import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_TYPES, goalName, rs } from "@/lib/constants";
import { Avatar, Pill, Row, TopBar } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.from("nutritionists").select("profiles(full_name)").eq("handle", (await params).handle).single();
  const name = (data?.profiles as unknown as { full_name: string } | null)?.full_name;
  return { title: name ? `${name} · Connect` : "Connect" };
}

export default async function NutritionistPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: n } = await supabase.from("nutritionists").select("*, profiles(full_name)").eq("handle", handle).single();
  if (!n) notFound();
  const { data: services } = await supabase.from("services").select("*").eq("nutritionist_id", n.id).eq("active", true).order("price");
  const name = n.profiles?.full_name ?? "Nutritionist";
  return (
    <Shell>
      <TopBar title={name} back="/discover" />
      <Body>
        {!n.published && <p className="rounded-xl bg-saffron-soft p-3 text-sm">This profile is hidden from search. Only you can see it until you switch it on in Business.</p>}
        <div className="flex items-center gap-3">
          <Avatar name={name} size={60} />
          <div className="min-w-0 flex-1"><b>{n.qualification || "Nutritionist"}{n.experience_years ? ` · ${n.experience_years} years` : ""}</b><br /><span className="text-sm text-muted">{[n.city, n.mode].filter(Boolean).join(" · ")}</span></div>
        </div>
        {n.about && <p>{n.about}</p>}
        {!!n.goals.length && <div className="flex flex-wrap gap-1.5">{n.goals.map((g: string) => <Pill key={g}>{goalName(g)}</Pill>)}</div>}
        <section className="card">
          <Row label="Languages">{n.languages.join(", ") || "–"}</Row>
          <Row label="Food plans">{n.food_types.join(", ") || "–"}</Row>
          <Row label="Session length">{n.session_minutes} min</Row>
        </section>
        <h2 className="h3">Choose a service</h2>
        {services?.length ? services.map((s) => (
          <Link key={s.id} href={`/n/${handle}/book?service=${s.id}`} className="card">
            <div className="flex items-center gap-2"><b className="flex-1">{s.name}</b><span className="font-display font-semibold tabular-nums">{s.price ? rs(s.price) : "Free"}</span></div>
            <div className="flex items-center gap-2"><Pill>{SERVICE_TYPES[s.type as keyof typeof SERVICE_TYPES]}</Pill><span className="text-sm text-muted">{s.details}</span></div>
          </Link>
        )) : <p className="text-sm text-muted">No services listed yet.</p>}
      </Body>
    </Shell>
  );
}
