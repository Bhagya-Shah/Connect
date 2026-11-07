import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { callState, callWindow, callsLive } from "@/lib/call";
import { fmtDate, fmtTime } from "@/lib/constants";
import { CallRoom } from "./CallRoom";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/call/${id}`);
  const { data: b } = await supabase.from("bookings")
    .select("id, client_id, nutritionist_id, service_name, starts_at, ends_at, status, client:client_id(full_name), n:nutritionist_id(profiles(full_name))")
    .eq("id", id).maybeSingle();
  if (!b) notFound();
  const isPro = user.id === b.nutritionist_id;
  const clientName = (b.client as unknown as { full_name: string | null } | null)?.full_name || "Client";
  const proName = (b.n as unknown as { profiles: { full_name: string | null } } | null)?.profiles?.full_name || "your nutritionist";
  const other = isPro ? clientName : proName;
  const back = isPro ? `/pro/clients/${b.client_id}` : "/me/account";
  const state = callState(b);

  if (!callsLive() || state !== "open") {
    const msg = !callsLive() ? "Video calls aren't switched on yet. The app owner needs to add the LiveKit settings."
      : state === "unpaid" ? "This session isn't confirmed yet."
      : state === "early" ? `The call opens at ${fmtTime(new Date(callWindow(b).opensAt))} on ${fmtDate(b.starts_at)}, 5 minutes before the start.`
      : "This session has ended.";
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">{b.service_name} with {other}</h1>
        <p className="text-muted">{msg}</p>
        <Link href={back} className="btn">Back</Link>
      </main>
    );
  }
  return <CallRoom bookingId={b.id} title={b.service_name} other={other} isPro={isPro} back={back} />;
}
