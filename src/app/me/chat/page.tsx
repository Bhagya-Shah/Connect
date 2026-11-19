import { getMyNutritionist, requireClient } from "@/lib/auth";
import { Empty, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { Chat } from "@/components/Chat";

export default async function ChatPage() {
  const { supabase, user } = await requireClient();
  const n = await getMyNutritionist();
  if (!n) return <><TopBar title="Chat" /><Body><Empty title="No one to chat with yet" /></Body></>;
  const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("nutritionist_id", n.id).eq("client_id", user.id).order("created_at").limit(200);
  const hours = n.chat_start && n.chat_end ? `${n.name.split(" ")[0]} usually replies between ${n.chat_start.slice(0, 5)} and ${n.chat_end.slice(0, 5)}` : "";
  return (
    <>
      <TopBar title={n.name} />
      <Body>
        {hours && <p className="text-center text-xs text-muted">{hours}</p>}
        <Chat nutritionistId={n.id} clientId={user.id} meId={user.id} initial={msgs ?? []} />
      </Body>
    </>
  );
}
