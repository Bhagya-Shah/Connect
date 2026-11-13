import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rs, todayIST } from "@/lib/constants";
import { Avatar, Pill, Row, Stat, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { ClinicForm, InviteMember, LogoUpload } from "./ClinicForms";
import { leaveClinic, removeMember } from "../clinic-actions";

export default async function ClinicPage() {
  const { supabase, user, me } = await requireNutritionist();
  const { data: membership } = await supabase.from("clinic_members").select("role, clinics(*)").eq("nutritionist_id", user.id).maybeSingle();
  const clinic = membership?.clinics as unknown as { id: string; name: string; slug: string; tagline: string | null; brand_color: string; logo_url: string | null; owner_id: string } | null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (membership && membership.role === "member" && clinic) return (
    <>
      <TopBar title="Clinic" back="/pro/business" />
      <Body>
        <section className="card" style={{ borderColor: clinic.brand_color }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {clinic.logo_url ? <img src={clinic.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain" /> : <Avatar name={clinic.name} size={48} />}
            <span className="flex-1"><b>{clinic.name}</b><br /><span className="text-sm text-muted">You&apos;re a team member. Your plan is covered by the clinic.</span></span>
          </div>
          <Link href={`/c/${clinic.slug}`} className="text-sm font-semibold text-accent">See the clinic page</Link>
        </section>
        <form action={leaveClinic}><button className="w-full text-sm font-semibold text-bad">Leave this clinic</button></form>
      </Body>
    </>
  );

  if (!clinic) return (
    <>
      <TopBar title="Clinic" back="/pro/business" />
      <Body>
        {me.plan === "clinic" ? <ClinicForm clinic={null} /> : (
          <section className="card border-transparent bg-accent-soft">
            <b>Run a team with the Clinic plan</b>
            <span className="text-sm">Up to 5 nutritionists or therapists under one name. A clinic page with your logo and colours, a team dashboard with each member&apos;s clients and earnings, and their plans covered by yours.</span>
            <Link href="/pro/business#plan" className="btn btn-sm self-start">See plans</Link>
          </section>
        )}
      </Body>
    </>
  );

  // owner: team dashboard. Reads members' numbers with the service role after checking ownership above.
  const admin = createAdminClient();
  const monthStart = todayIST().slice(0, 8) + "01T00:00:00+05:30";
  const { data: members } = await admin.from("clinic_members").select("nutritionist_id, role, joined_at, n:nutritionist_id(handle, specialty, profiles(full_name))").eq("clinic_id", clinic.id).order("joined_at");
  const ids = (members ?? []).map((m) => m.nutritionist_id);
  const [{ data: links }, { data: pays }, { data: upcoming }] = await Promise.all([
    admin.from("client_links").select("nutritionist_id").in("nutritionist_id", ids).eq("status", "active"),
    admin.from("payments").select("nutritionist_id, amount, platform_fee").in("nutritionist_id", ids).eq("status", "paid").gte("created_at", monthStart),
    admin.from("bookings").select("nutritionist_id").in("nutritionist_id", ids).eq("status", "confirmed").gte("starts_at", new Date().toISOString()).lte("starts_at", new Date(Date.now() + 7 * 864e5).toISOString()),
  ]);
  const count = (rows: { nutritionist_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.nutritionist_id === id).length;
  const net = (id: string) => (pays ?? []).filter((p) => p.nutritionist_id === id).reduce((a, p) => a + p.amount - p.platform_fee, 0);
  const total = ids.reduce((a, id) => a + net(id), 0);

  return (
    <>
      <TopBar title={clinic.name} back="/pro/business" right={<Link href={`/c/${clinic.slug}`} className="btn-ghost btn-sm">View page</Link>} />
      <Body>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Team" value={`${ids.length}/5`} />
          <Stat label="Active clients" value={(links ?? []).length} />
          <Stat label="Earned this month" value={rs(total)} />
        </div>
        <section className="card">
          <h2 className="h3">Team</h2>
          {(members ?? []).map((m) => {
            const n = m.n as unknown as { handle: string; specialty: string; profiles: { full_name: string | null } };
            return (
              <div key={m.nutritionist_id} className="flex flex-col gap-1.5 border-t border-line pt-2.5 first:border-0 first:pt-0">
                <div className="flex items-center gap-2.5">
                  <Avatar name={n.profiles.full_name} />
                  <span className="min-w-0 flex-1"><b>{n.profiles.full_name}</b><br /><span className="text-xs text-muted">{n.specialty === "psychology" ? "Therapist" : "Nutritionist"}{m.role === "owner" ? " · owner" : ""}</span></span>
                  <Pill tone="grey">{count(links, m.nutritionist_id)} clients</Pill>
                </div>
                <Row label="This month, after fees">{rs(net(m.nutritionist_id))}</Row>
                <Row label="Sessions in the next 7 days">{count(upcoming, m.nutritionist_id)}</Row>
                {m.role !== "owner" && <form action={removeMember.bind(null, m.nutritionist_id)} className="self-end"><button className="text-xs font-semibold text-bad">Remove from team</button></form>}
              </div>
            );
          })}
          {ids.length < 5 ? <InviteMember site={site} /> : <span className="text-sm text-muted">Your team is full (5 of 5).</span>}
        </section>
        <section className="card">
          <h2 className="h3">Logo</h2>
          <LogoUpload uid={user.id} current={clinic.logo_url} />
          <span className="text-xs text-muted">Shown on your clinic page and on each team member&apos;s profile.</span>
        </section>
        <ClinicForm clinic={clinic} />
        <section className="card text-sm">
          <h2 className="h3">Your own web address</h2>
          <span className="text-muted">Want clients to visit <b>book.yourclinic.in</b>? Send us the address. We connect it to your clinic page within 2 working days.</span>
        </section>
      </Body>
    </>
  );
}
