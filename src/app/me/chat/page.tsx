import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { PLANS } from "@/lib/constants";
import { Avatar, Empty, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { Chat } from "@/components/Chat";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireClient();
  const { data: links } = await supabase.from("client_links").select("nutritionist_id, n:nutritionist_id(plan, specialty, chat_start, chat_end, profiles(full_name))").eq("client_id", user.id).eq("status", "active");
  type N = { plan: keyof typeof PLANS; specialty: string; chat_start: string | null; chat_end: string | null; profiles: { full_name: string } };
  const list = (links ?? []).map((l) => ({ id: l.nutritionist_id, n: l.n as unknown as N }));
  if (!list.length) return <><TopBar title="Chat" /><Body><Empty title="No one to chat with yet">Once you book or join a nutritionist or therapist, you can chat here.</Empty></Body></>;
  const cur = list.find((x) => x.id === sp.with) ?? (list.length === 1 ? list[0] : null);
  if (!cur) return (
    <><TopBar title="Chat" /><Body><div className="card">{list.map((x) => (
      <Link key={x.id} href={`/me/chat?with=${x.id}`} className="flex items-center gap-2.5"><Avatar name={x.n.profiles.full_name} /><b>{x.n.profiles.full_name}</b></Link>
    ))}</div></Body></>
  );
  const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("nutritionist_id", cur.id).eq("client_id", user.id).order("created_at").limit(200);
  const hours = cur.n.chat_start && cur.n.chat_end ? `Replies usually between ${cur.n.chat_start.slice(0, 5)} and ${cur.n.chat_end.slice(0, 5)}` : "";
  return (
    <>
      <TopBar title={cur.n.profiles.full_name} back={list.length > 1 ? "/me/chat" : undefined} />
      <Body>
        {hours && <p className="text-center text-xs text-muted">{hours}{cur.n.specialty === "psychology" ? ". Not for emergencies: " : ""}{cur.n.specialty === "psychology" && <Link href="/help" className="font-semibold text-bad">get help now</Link>}</p>}
        <Chat nutritionistId={cur.id} clientId={user.id} meId={user.id} initial={msgs ?? []}
          disabledReason={PLANS[cur.n.plan].chat ? undefined : cur.n.specialty === "psychology" ? "Your therapist's plan doesn't include chat. You can talk in your next session." : "Your nutritionist's plan doesn't include chat. You'll still get their replies on your meal photos."} />
      </Body>
    </>
  );
}
