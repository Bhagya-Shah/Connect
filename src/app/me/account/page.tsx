import { getMyNutritionist, requireClient } from "@/lib/auth";
import { Avatar, Row, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { LogoutButton } from "@/components/LogoutButton";
import { SessionRow } from "@/components/SessionRow";
import type { Session } from "@/lib/types";
import { PasswordForm } from "./PasswordForm";

export default async function Account() {
  const { supabase, user, profile } = await requireClient();
  const n = await getMyNutritionist();
  const { data: sessions } = await supabase.from("bookings").select("*").eq("client_id", user.id).neq("status", "cancelled").order("starts_at", { ascending: false }).limit(20);
  const now = Date.now();
  const upcoming = (sessions ?? []).filter((b) => Date.parse(b.ends_at) > now).reverse();
  const past = (sessions ?? []).filter((b) => Date.parse(b.ends_at) <= now);
  const who = n?.name ?? "Your nutritionist";
  return (
    <>
      <TopBar title={profile.full_name || "Me"} />
      <Body>
        {n && (
          <section className="card">
            <div className="flex items-center gap-2.5"><Avatar name={n.name} /><span className="min-w-0 flex-1"><b>{n.name}</b><br /><span className="text-sm text-muted">{n.practice || n.program || "Your nutritionist"}</span></span></div>
          </section>
        )}
        <section className="card">
          <h2 className="h3">Upcoming sessions</h2>
          {upcoming.length ? upcoming.map((s) => <SessionRow key={s.id} s={s as Session} who={who} />) : <p className="text-sm text-muted">No sessions booked. {who.split(" ")[0]} will add them here with a Google Meet link.</p>}
        </section>
        {!!past.length && <section className="card"><h2 className="h3">Past sessions</h2>{past.map((s) => <SessionRow key={s.id} s={s as Session} who={who} />)}</section>}
        <section className="card">
          <h2 className="h3">Login</h2>
          <Row label="Logged in as">{profile.phone && user.email?.endsWith("@phone.connect.app") ? profile.phone : user.email}</Row>
          <PasswordForm />
        </section>
        <LogoutButton />
      </Body>
    </>
  );
}
