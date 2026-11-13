import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { goalName } from "@/lib/constants";
import { Avatar, Pill } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.from("clinics").select("name, tagline").eq("slug", (await params).slug).maybeSingle();
  return { title: data ? `${data.name} · Connect` : "Connect", description: data?.tagline ?? undefined };
}

export default async function ClinicPublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("clinics").select("*").eq("slug", slug).maybeSingle();
  if (!c) notFound();
  const { data: members } = await supabase.from("clinic_members").select("nutritionist_id").eq("clinic_id", c.id);
  const { data: team } = await supabase.from("nutritionists").select("id, handle, specialty, city, about, goals, profiles(full_name)").in("id", (members ?? []).map((m) => m.nutritionist_id)).eq("published", true);
  return (
    <Shell>
      <header className="flex flex-col gap-3 px-5 pb-6 pt-8 text-white" style={{ background: c.brand_color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.logo_url ? <img src={c.logo_url} alt={`${c.name} logo`} className="h-16 w-16 rounded-2xl bg-white object-contain p-1" /> : null}
        <h1 className="text-2xl font-semibold leading-tight">{c.name}</h1>
        {c.tagline && <p className="opacity-90">{c.tagline}</p>}
      </header>
      <Body>
        <h2 className="h3">Our team</h2>
        {team?.length ? team.map((n) => {
          const name = (n.profiles as unknown as { full_name: string } | null)?.full_name ?? "";
          return (
            <Link key={n.id} href={`/n/${n.handle}`} className="card">
              <div className="flex items-center gap-2.5"><Avatar name={name} /><span className="min-w-0 flex-1"><b>{name}</b><br /><span className="text-sm text-muted">{n.specialty === "psychology" ? "Therapist" : "Nutritionist"}{n.city ? ` · ${n.city}` : ""}</span></span><span className="btn btn-sm" style={{ background: c.brand_color }}>Book</span></div>
              {n.about && <p className="line-clamp-2 text-sm text-muted">{n.about}</p>}
              <div className="flex flex-wrap gap-1.5">{n.goals.slice(0, 3).map((g: string) => <Pill key={g}>{goalName(g)}</Pill>)}</div>
            </Link>
          );
        }) : <p className="card text-sm text-muted">The team is getting set up.</p>}
        <p className="text-center text-xs text-muted">Bookings, payments and video sessions by Connect</p>
      </Body>
    </Shell>
  );
}
