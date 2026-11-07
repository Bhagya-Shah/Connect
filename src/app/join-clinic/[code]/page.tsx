import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/ui";
import { joinClinic } from "@/app/pro/clinic-actions";

export default async function JoinClinic({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  const { error } = await searchParams;
  // only the clinic's name and logo are shown before joining
  const { data: inv } = await createAdminClient().from("clinic_invites").select("used_by, clinics(name, logo_url, brand_color)").eq("code", code).maybeSingle();
  const c = inv?.clinics as unknown as { name: string; logo_url: string | null; brand_color: string } | null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: n } = user ? await supabase.from("nutritionists").select("id").eq("id", user.id).maybeSingle() : { data: null };

  async function accept() {
    "use server";
    const r = await joinClinic(code);
    if (r?.error) redirect(`/join-clinic/${code}?error=${encodeURIComponent(r.error)}`);
    redirect("/pro/clinic");
  }
  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-4 p-6">
        {!c ? <p className="card">This invite link is not valid. Ask the clinic owner for a new one.</p> : <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.logo_url ? <img src={c.logo_url} alt="" className="h-16 w-16 rounded-2xl object-contain" /> : <Avatar name={c.name} size={64} />}
          <h1 className="text-xl font-semibold">Join {c.name} on Connect</h1>
          <p className="text-muted">You&apos;ll appear on the clinic page, and your plan is covered by the clinic. Your clients, notes and earnings stay yours.</p>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          {!user ? <Link className="btn" href={`/login?next=${encodeURIComponent(`/join-clinic/${code}`)}`}>Log in to join</Link>
            : !n ? <Link className="btn" href={`/onboarding?next=${encodeURIComponent(`/join-clinic/${code}`)}&as=nutritionist`}>Set up your practice first</Link>
            : <form action={accept}><button className="btn w-full" style={{ background: c.brand_color }}>Join the team</button></form>}
        </>}
      </main>
    </Shell>
  );
}
