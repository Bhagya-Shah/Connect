import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime, rs } from "@/lib/constants";
import { Pill, TopBar } from "@/components/ui";
import { Shell, Body } from "@/components/Shell";

export default async function GroupBooking({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ service?: string; error?: string }> }) {
  const { handle } = await params;
  const { service, error } = await searchParams;
  const supabase = await createClient();
  const { data: n } = await supabase.from("nutritionists").select("id, specialty, profiles(full_name)").eq("handle", handle).single();
  if (!n || !service) notFound();
  const { data: s } = await supabase.from("services").select("*").eq("id", service).eq("nutritionist_id", n.id).eq("type", "group").eq("active", true).single();
  if (!s) notFound();
  const { data: sessions } = await supabase.from("group_sessions").select("*").eq("service_id", s.id).eq("cancelled", false).gt("starts_at", new Date().toISOString()).order("starts_at").limit(12);
  const taken = await Promise.all((sessions ?? []).map(async (g) => (await supabase.rpc("group_seats_taken", { g: g.id })).data as number));
  const { data: { user } } = await supabase.auth.getUser();
  const name = (n.profiles as unknown as { full_name: string } | null)?.full_name;

  async function book(form: FormData) {
    "use server";
    const sb = await createClient();
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) redirect(`/login?next=${encodeURIComponent(`/n/${handle}/group?service=${service}`)}`);
    const nm = String(form.get("name") || "").trim();
    if (nm) await sb.from("profiles").update({ full_name: nm }).eq("id", u.id).is("full_name", null);
    const { data: id, error: e } = await sb.rpc("book_group", { p_session: String(form.get("session")), p_intake: {} });
    if (e) redirect(`/n/${handle}/group?service=${service}&error=${encodeURIComponent(e.message)}`);
    const { data: b } = await sb.from("bookings").select("status").eq("id", id).single();
    redirect(b?.status === "pending_payment" ? `/pay/${id}` : `/me/account?booked=${id}`);
  }
  let needName = false;
  if (user) { const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single(); needName = !p?.full_name; }

  return (
    <Shell>
      <TopBar title={s.name} back={`/n/${handle}`} />
      <Body>
        <section className="card">
          <div className="flex items-center gap-2"><span className="min-w-0 flex-1"><b>{s.name}</b><br /><span className="text-sm text-muted">{n.specialty === "psychology" ? "Support group" : "Group class"} with {name} · video, inside Connect</span></span><span className="font-display font-semibold">{s.price ? `${rs(s.price)} a seat` : "Free"}</span></div>
          {s.details && <span className="text-sm text-muted">{s.details}</span>}
        </section>
        {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{error}</p>}
        <h2 className="h3">Pick a date</h2>
        {sessions?.length ? sessions.map((g, i) => {
          const left = g.capacity - (taken[i] ?? 0);
          return (
            <form key={g.id} action={book} className="card">
              <input type="hidden" name="session" value={g.id} />
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1"><b>{g.title}</b><br /><span className="text-sm text-muted">{fmtDate(g.starts_at)} · {fmtTime(g.starts_at)}–{fmtTime(g.ends_at)}</span></span>
                <Pill tone={left > 0 ? (left <= 3 ? "warn" : "good") : "bad"}>{left > 0 ? `${left} seat${left === 1 ? "" : "s"} left` : "Full"}</Pill>
              </div>
              {user ? <>
                {needName && <input name="name" className="input" placeholder="Your name" required aria-label="Your name" />}
                <button className="btn btn-sm self-end" disabled={left <= 0}>{s.price ? "Book seat and pay" : "Book seat"}</button>
              </> : <Link className="btn btn-sm self-end" href={`/login?next=${encodeURIComponent(`/n/${handle}/group?service=${s.id}`)}`}>Log in to book</Link>}
            </form>
          );
        }) : <p className="card text-sm text-muted">No dates scheduled yet. Check back soon.</p>}
      </Body>
    </Shell>
  );
}
