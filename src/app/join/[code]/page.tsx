import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/ui";

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("invite_preview", { p_code: code });
  const inv = rows?.[0];
  const { data: { user } } = await supabase.auth.getUser();

  async function accept() {
    "use server";
    const s = await createClient();
    const { error } = await s.rpc("accept_invite", { p_code: code });
    if (error) redirect(`/join/${code}?error=${encodeURIComponent(error.message)}`);
    redirect("/me?joined=1");
  }

  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-4 p-6">
        {!inv ? <p className="card">This invite link is not valid. Ask the person who sent it for a new one.</p> : <>
          <Avatar name={inv.nutritionist_name} size={64} />
          <h1 className="text-xl font-semibold">{inv.nutritionist_name} invited you to Connect</h1>
          <p className="text-muted">{inv.specialty === "psychology" ? `Book sessions, check in on your mood, and do your homework with ${inv.nutritionist_name}. Private and free for you.` : `Get your diet plan, send meal photos, and track your progress with ${inv.nutritionist_name?.split(" ")[0]}. It's free for you.`}</p>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          {user ? <form action={accept}><button className="btn w-full">Join</button></form>
            : <Link className="btn" href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>Log in to join</Link>}
        </>}
      </main>
    </Shell>
  );
}
