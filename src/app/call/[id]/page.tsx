import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { callState, callWindow, callsLive, resolveCall } from "@/lib/call";
import { fmtDate, fmtTime } from "@/lib/constants";
import { CallRoom } from "./CallRoom";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/call/${id}`);
  const c = await resolveCall(supabase, user.id, id);
  if (!c) notFound();
  const state = callState(c);
  const withWho = c.group ? (c.isPro ? "your group" : c.other) : c.other;

  if (!callsLive() || state !== "open") {
    const msg = !callsLive() ? "Video calls aren't switched on yet. The app owner needs to add the LiveKit settings."
      : state === "unpaid" ? "This session isn't confirmed yet."
      : state === "early" ? `The call opens at ${fmtTime(new Date(callWindow(c).opensAt))} on ${fmtDate(c.starts_at)}, 5 minutes before the start.`
      : "This session has ended.";
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">{c.title} with {withWho}</h1>
        <p className="text-muted">{msg}</p>
        <Link href={c.back} className="btn">Back</Link>
      </main>
    );
  }
  return <CallRoom bookingId={id} title={c.title} other={withWho} isPro={c.isPro && !c.group} back={c.back} />;
}
