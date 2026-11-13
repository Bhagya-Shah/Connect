import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { callState, callsLive, resolveCall } from "@/lib/call";

/** Gives a short-lived pass into one booking's call room. Only the booked client and their nutritionist get one. */
export async function POST(req: Request) {
  if (!callsLive()) return NextResponse.json({ error: "Video calls are not set up yet." }, { status: 503 });
  const { bookingId } = await req.json().catch(() => ({}));
  if (typeof bookingId !== "string") return NextResponse.json({ error: "Missing booking" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  // RLS only returns bookings and group sessions this user is part of
  const b = await resolveCall(supabase, user.id, bookingId);
  if (!b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const state = callState(b);
  if (state === "unpaid") return NextResponse.json({ error: "This session isn't confirmed yet." }, { status: 403 });
  if (state === "early") return NextResponse.json({ error: "The call opens 5 minutes before the start time." }, { status: 403 });
  if (state === "over") return NextResponse.json({ error: "This session has ended." }, { status: 403 });

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const role = b.isPro ? "nutritionist" : "client";
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: profile?.full_name || (role === "nutritionist" ? "Nutritionist" : "Client"),
    metadata: JSON.stringify({ role }),
    ttl: "3h",
  });
  at.addGrant({ room: b.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
  return NextResponse.json({ token: await at.toJwt(), url: process.env.NEXT_PUBLIC_LIVEKIT_URL });
}
