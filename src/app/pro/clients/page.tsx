import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { PLANS, goalName } from "@/lib/constants";
import { Avatar, Empty, Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { InviteForm } from "./InviteForm";
import { CopyButton } from "@/components/CopyButton";
import { cancelInvite } from "../actions";

export default async function ClientsPage() {
  const { supabase, user, me } = await requireNutritionist();
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const [{ data: links }, { data: recent }] = await Promise.all([
    supabase.from("client_links").select("*, profiles:client_id(full_name)").eq("nutritionist_id", user.id).neq("status", "ended").order("created_at", { ascending: false }),
    supabase.from("meal_logs").select("client_id, status").eq("nutritionist_id", user.id).gte("log_date", since),
  ]);
  const active = (links ?? []).filter((l) => l.status === "active");
  const invited = (links ?? []).filter((l) => l.status === "invited");
  const plan = PLANS[me.plan as keyof typeof PLANS];
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const status = (id: string) => {
    const r = (recent ?? []).filter((x) => x.client_id === id);
    if (!r.length) return <Pill tone="bad">Not logging</Pill>;
    if (r.some((x) => x.status === "pending")) return <Pill tone="blue">Photos to review</Pill>;
    return <Pill tone="good">On track</Pill>;
  };
  return (
    <>
      <TopBar title="Clients" right={<span className="text-sm text-muted">{active.length}{plan.clients ? ` of ${plan.clients}` : ""}</span>} />
      <Body>
        <InviteForm />
        {active.length ? (
          <section className="card">
            {active.map((l) => (
              <Link key={l.id} href={`/pro/clients/${l.client_id}`} className="flex items-center gap-2.5 border-t border-line pt-2.5 first:border-0 first:pt-0">
                <Avatar name={l.profiles?.full_name} />
                <span className="min-w-0 flex-1"><b>{l.profiles?.full_name || "Client"}</b><br /><span className="text-sm text-muted">{(l.goal && goalName(l.goal)) || l.program || "No goal set"}</span>{l.source === "search" && <span className="text-xs text-muted"> · from search</span>}</span>
                {status(l.client_id)}
              </Link>
            ))}
          </section>
        ) : <Empty title="No clients yet">Add a client above, or share your booking link.</Empty>}
        {invited.length > 0 && (
          <section className="card">
            <h2 className="h3">Waiting to join</h2>
            {invited.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1"><b>{l.invite_name}</b><br /><span className="text-xs text-muted">{l.program || "Invite sent"}</span></span>
                <CopyButton text={`${site}/join/${l.invite_code}`} label="Copy link" />
                <form action={cancelInvite.bind(null, l.id)}><button className="chip">Cancel</button></form>
              </div>
            ))}
          </section>
        )}
      </Body>
    </>
  );
}
