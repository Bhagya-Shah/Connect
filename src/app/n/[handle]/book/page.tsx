import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { openSlots } from "@/lib/slots";
import { rs } from "@/lib/constants";
import { TopBar } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";
import { BookForm } from "./BookForm";

export default async function BookPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ service?: string }> }) {
  const { handle } = await params;
  const { service } = await searchParams;
  const supabase = await createClient();
  const { data: n } = await supabase.from("nutritionists").select("id, session_minutes, specialty, profiles(full_name)").eq("handle", handle).single();
  if (!n || !service) notFound();
  const { data: s } = await supabase.from("services").select("*").eq("id", service).eq("nutritionist_id", n.id).eq("active", true).single();
  if (!s) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const name = (n.profiles as unknown as { full_name: string } | null)?.full_name;
  const now = new Date();
  const [{ data: windows }, { data: busy }] = await Promise.all([
    supabase.from("availability").select("weekday, start_time, end_time").eq("nutritionist_id", n.id),
    supabase.rpc("busy_slots", { n: n.id, from_ts: now.toISOString(), to_ts: new Date(now.getTime() + 15 * 864e5).toISOString() }),
  ]);
  const days = openSlots(windows ?? [], busy ?? [], n.session_minutes);
  let needName = false;
  if (user) { const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single(); needName = !p?.full_name; }
  const back = `/n/${handle}`;
  return (
    <Shell>
      <TopBar title="Book a time" back={back} />
      <Body>
        <section className="card">
          <div className="flex items-center gap-2"><span className="min-w-0 flex-1"><b>{s.name}</b><br /><span className="text-sm text-muted">with {name} · {n.session_minutes} min</span></span><span className="font-display font-semibold">{s.price ? rs(s.price) : "Free"}</span></div>
        </section>
        {user ? <BookForm serviceId={s.id} days={days} needName={needName} price={s.price} psy={n.specialty === "psychology"} /> : (
          <div className="card">
            <span>Log in to pick a time. It takes a minute and you only need your email.</span>
            <Link className="btn" href={`/login?next=${encodeURIComponent(`/n/${handle}/book?service=${s.id}`)}`}>Log in to book</Link>
          </div>
        )}
      </Body>
    </Shell>
  );
}
