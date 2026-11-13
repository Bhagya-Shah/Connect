"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

export function Chat({ nutritionistId, clientId, meId, initial, disabledReason }: {
  nutritionistId: string; clientId: string; meId: string; initial: ChatMessage[]; disabledReason?: string;
}) {
  const supabase = useRef(createClient()).current;
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const add = (list: ChatMessage[]) => setMsgs((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      const fresh = list.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh].sort((x, y) => x.created_at.localeCompare(y.created_at)) : prev;
    });
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let stop = false;
    (async () => {
      // live updates need the logged-in token, or row security hides every message
      const { data } = await supabase.auth.getSession();
      if (stop) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      ch = supabase.channel(`chat-${nutritionistId}-${clientId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, (p) => {
          const m = p.new as ChatMessage & { nutritionist_id: string };
          if (m.nutritionist_id === nutritionistId) add([m]);
        }).subscribe();
    })();
    // fallback if the live connection drops
    const poll = setInterval(async () => {
      const { data } = await supabase.from("messages").select("id, sender_id, body, created_at")
        .eq("nutritionist_id", nutritionistId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(20);
      if (data) add(data);
    }, 8000);
    return () => { stop = true; clearInterval(poll); if (ch) supabase.removeChannel(ch); };
  }, [supabase, nutritionistId, clientId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText(""); setError(null);
    const { data, error } = await supabase.from("messages").insert({ nutritionist_id: nutritionistId, client_id: clientId, sender_id: meId, body }).select().single();
    if (error) { setError("Message not sent. Try again."); setText(body); return; }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-1 flex-col gap-2">
        {!msgs.length && <p className="text-center text-sm text-muted">No messages yet. Say hello.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === meId ? "self-end rounded-br-sm bg-accent text-accent-ink" : "self-start rounded-bl-sm border border-line bg-surface"}`}>
            {m.body}
            <div className="mt-0.5 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {disabledReason ? <p className="rounded-xl bg-saffron-soft p-3 text-sm">{disabledReason}</p> : (
        <form onSubmit={send} className="sticky bottom-[64px] flex gap-2 bg-surface-2 py-2">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" aria-label="Message" />
          <button className="btn btn-sm">Send</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}
