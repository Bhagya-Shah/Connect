import { IST } from "./constants";

type Window = { weekday: number; start_time: string; end_time: string };
type Busy = { starts_at: string; ends_at: string };

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const pad = (n: number) => String(n).padStart(2, "0");

/** Open slots for the next `days` days, in India time. Returns ISO strings with +05:30. */
export function openSlots(windows: Window[], busy: Busy[], minutes: number, days = 14, now = new Date()) {
  const out: { date: string; slots: string[] }[] = [];
  const busyR = busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)]);
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 864e5);
    const date = d.toLocaleDateString("en-CA", { timeZone: IST });
    const weekday = new Date(date + "T12:00:00+05:30").getUTCDay();
    const slots: string[] = [];
    for (const w of windows.filter((x) => x.weekday === weekday)) {
      for (let m = toMin(w.start_time); m + minutes <= toMin(w.end_time); m += minutes) {
        const iso = `${date}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00+05:30`;
        const s = Date.parse(iso), e = s + minutes * 6e4;
        if (s < now.getTime() + 60 * 6e4) continue; // at least 1 hour ahead
        if (busyR.some(([bs, be]) => bs < e && be > s)) continue;
        slots.push(iso);
      }
    }
    slots.sort();
    if (slots.length) out.push({ date, slots });
  }
  return out;
}
