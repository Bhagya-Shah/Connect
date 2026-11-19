import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/constants";
import { calendarLink, sessionState, whatsappLink } from "@/lib/meet";
import { setSessionStatus } from "@/app/pro/actions";
import type { Session } from "@/lib/types";
import { Avatar, Pill } from "./ui";

/** One session with its Google Meet button. Pro view adds client link, WhatsApp and done/cancel. */
export function SessionRow({ s, who, pro, phone, clientId, compact }: { s: Session; who: string; pro?: boolean; phone?: string | null; clientId?: string; compact?: boolean }) {
  const st = sessionState(s);
  const when = `${fmtDate(s.starts_at)}, ${fmtTime(s.starts_at)}`;
  const share = `Hi ${who.split(" ")[0]}, your ${s.service_name.toLowerCase()} is on ${when}.${s.meet_url ? `\nJoin on Google Meet: ${s.meet_url}` : ""}`;
  return (
    <div className={`flex flex-col gap-2 border-t border-line pt-2.5 first:border-0 first:pt-0 ${st === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2.5">
        <span className="w-[68px] flex-none text-sm leading-tight"><b className="font-display">{fmtTime(s.starts_at)}</b><br /><span className="text-xs text-muted">{fmtDate(s.starts_at, { day: "numeric", month: "short" })}</span></span>
        {pro && <Avatar name={who} size={36} />}
        <span className="min-w-0 flex-1 leading-tight">
          {pro && clientId ? <Link href={`/pro/clients/${clientId}?tab=sessions`} className="font-semibold">{who}</Link> : <b>{who}</b>}
          <br /><span className="text-sm text-muted">{s.service_name} · {Math.round((Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60e3)} min</span>
        </span>
        {st === "cancelled" ? <Pill tone="grey">Cancelled</Pill> : s.status === "completed" ? <Pill tone="good">Done</Pill>
          : st !== "past" && s.meet_url ? <a href={s.meet_url} target="_blank" rel="noreferrer" className={st === "soon" ? "btn btn-sm" : "btn-ghost btn-sm"}>Join Meet</a>
          : st === "past" ? <Pill tone="grey">Past</Pill> : <Pill tone="warn">No Meet link</Pill>}
      </div>
      {s.notes && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{s.notes}</p>}
      {!compact && (st === "later" || st === "soon") && s.status !== "completed" && (
        <div className="flex flex-wrap gap-1.5 pl-[78px] max-sm:pl-0">
          <a className="chip" target="_blank" rel="noreferrer" href={calendarLink({ starts_at: s.starts_at, ends_at: s.ends_at, title: pro ? `${s.service_name}: ${who}` : `${s.service_name} with ${who}`, meet_url: s.meet_url })}>Add to Google Calendar</a>
          {pro && <a className="chip" target="_blank" rel="noreferrer" href={whatsappLink(share, phone)}>Send on WhatsApp</a>}
          {pro && <form action={setSessionStatus.bind(null, s.id, "cancelled")}><button className="chip text-bad">Cancel</button></form>}
        </div>
      )}
      {!compact && pro && st === "past" && s.status === "confirmed" && (
        <div className="flex gap-1.5 pl-[78px] max-sm:pl-0"><form action={setSessionStatus.bind(null, s.id, "completed")}><button className="chip">Mark done</button></form></div>
      )}
    </div>
  );
}
