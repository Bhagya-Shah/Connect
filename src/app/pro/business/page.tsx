import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { paymentsLive } from "@/lib/razorpay";
import { fmtDate, rs, todayIST, type PlanId } from "@/lib/constants";
import { Row, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { ProfileForm } from "./ProfileForm";
import { Services } from "./Services";
import { Availability } from "./Availability";
import { PlanPicker } from "./PlanPicker";
import { LogoutButton } from "@/components/LogoutButton";

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile, me } = await requireNutritionist();
  const monthStart = todayIST().slice(0, 8) + "01";
  const [{ data: services }, { data: windows }, { data: pays }] = await Promise.all([
    supabase.from("services").select("*").eq("nutritionist_id", user.id).order("created_at"),
    supabase.from("availability").select("weekday, start_time, end_time").eq("nutritionist_id", user.id).order("weekday").order("start_time"),
    supabase.from("payments").select("amount, platform_fee, created_at").eq("nutritionist_id", user.id).eq("status", "paid").order("created_at", { ascending: false }).limit(200),
  ]);
  const month = (pays ?? []).filter((p) => p.created_at >= monthStart);
  return (
    <>
      <TopBar title="Business" />
      <Body>
        {sp.welcome && <p className="rounded-xl bg-good-soft p-3 text-sm"><b>Your practice is set up.</b> Fill in your profile, check your services and hours, then switch on &quot;Show my profile&quot;.</p>}
        <section className="card">
          <h2 className="h3">Earnings</h2>
          <Row label="This month (after fees)">{rs(month.reduce((a, p) => a + p.amount - p.platform_fee, 0))}</Row>
          <Row label="Payments this month">{month.length}</Row>
          <Row label="All time">{rs((pays ?? []).reduce((a, p) => a + p.amount - p.platform_fee, 0))}</Row>
          {pays?.[0] && <Row label="Last payment">{fmtDate(pays[0].created_at)}</Row>}
          <Link href={`/n/${me.handle}`} className="text-sm font-semibold text-accent">See my public page</Link>
        </section>
        <ProfileForm n={me} name={profile.full_name ?? ""} />
        <Services services={services ?? []} />
        <Availability initial={windows ?? []} />
        <PlanPicker current={me.plan as PlanId} live={paymentsLive()} keyId={process.env.RAZORPAY_KEY_ID} specialty={me.specialty} />
        <LogoutButton />
      </Body>
    </>
  );
}
