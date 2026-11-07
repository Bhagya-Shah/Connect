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
