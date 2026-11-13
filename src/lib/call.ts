/** Video calls run on LiveKit (self-hosted or LiveKit Cloud). Each booking gets its own private room. */
export const callsLive = () => !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.NEXT_PUBLIC_LIVEKIT_URL);

const OPEN_BEFORE_MS = 5 * 60_000; // join button appears 5 min before start
const CLOSE_AFTER_MS = 30 * 60_000; // and stays for 30 min after the planned end

export function callWindow(b: { starts_at: string; ends_at: string }) {
  return { opensAt: Date.parse(b.starts_at) - OPEN_BEFORE_MS, closesAt: Date.parse(b.ends_at) + CLOSE_AFTER_MS };
}

export function callState(b: { starts_at: string; ends_at: string; status: string }, now = Date.now()): "open" | "early" | "over" | "unpaid" {
  if (b.status !== "confirmed") return "unpaid";
  const { opensAt, closesAt } = callWindow(b);
  if (now < opensAt) return "early";
  if (now > closesAt) return "over";
  return "open";
}

export const roomName = (bookingId: string) => `booking-${bookingId}`;

type Sb = import("@supabase/supabase-js").SupabaseClient;
export type CallInfo = {
  room: string; title: string; other: string; isPro: boolean; back: string;
  starts_at: string; ends_at: string; status: string; group: boolean;
};

/**
 * Works out which call room a user may enter for an id. The id is either a booking (1-to-1, or a seat in a group)
 * or a group session (for the expert running it). RLS limits what each user can read.
 */
export async function resolveCall(supabase: Sb, userId: string, id: string): Promise<CallInfo | null> {
  const { data: b } = await supabase.from("bookings")
    .select("id, client_id, nutritionist_id, service_name, starts_at, ends_at, status, group_session_id, client:client_id(full_name), n:nutritionist_id(profiles(full_name))")
    .eq("id", id).maybeSingle();
  if (b) {
    const isPro = userId === b.nutritionist_id;
    const clientName = (b.client as unknown as { full_name: string | null } | null)?.full_name || "Client";
    const proName = (b.n as unknown as { profiles: { full_name: string | null } } | null)?.profiles?.full_name || "your expert";
    return {
      room: b.group_session_id ? `group-${b.group_session_id}` : roomName(b.id), title: b.service_name,
      other: b.group_session_id ? proName : isPro ? clientName : proName, isPro,
      back: isPro ? (b.group_session_id ? "/pro/groups" : `/pro/clients/${b.client_id}`) : "/me/account",
      starts_at: b.starts_at, ends_at: b.ends_at, status: b.status, group: !!b.group_session_id,
    };
  }
  const { data: g } = await supabase.from("group_sessions").select("id, nutritionist_id, title, starts_at, ends_at, cancelled").eq("id", id).maybeSingle();
  if (!g || g.nutritionist_id !== userId) return null;
  return { room: `group-${g.id}`, title: g.title, other: "the group", isPro: true, back: "/pro/groups", starts_at: g.starts_at, ends_at: g.ends_at, status: g.cancelled ? "cancelled" : "confirmed", group: true };
}
