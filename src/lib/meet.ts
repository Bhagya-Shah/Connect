/** Google Meet sessions: links, join state, calendar and WhatsApp helpers. No Google API needed. */

export const NEW_MEET_URL = "https://meet.google.com/new";

export function cleanMeetUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(s)) s = `https://meet.google.com/${s.toLowerCase()}`; // just the code
  if (/^meet\.google\.com\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** "soon": starts within 15 min or is on now. */
export function sessionState(s: { starts_at: string; ends_at: string; status?: string }) {
  if (s.status === "cancelled") return "cancelled" as const;
  const now = Date.now(), start = Date.parse(s.starts_at), end = Date.parse(s.ends_at);
  if (now > end) return "past" as const;
  if (now >= start - 15 * 60e3) return "soon" as const;
  return "later" as const;
}

const gcal = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function calendarLink(s: { starts_at: string; ends_at: string; title: string; meet_url?: string | null; details?: string }) {
  const p = new URLSearchParams({
    action: "TEMPLATE", text: s.title, dates: `${gcal(s.starts_at)}/${gcal(s.ends_at)}`,
    details: [s.details, s.meet_url ? `Join on Google Meet: ${s.meet_url}` : ""].filter(Boolean).join("\n"),
    location: s.meet_url ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export const whatsappLink = (text: string, phone?: string | null) =>
  `https://wa.me/${phone ? "91" + phone.replace(/\D/g, "").slice(-10) : ""}?text=${encodeURIComponent(text)}`;
