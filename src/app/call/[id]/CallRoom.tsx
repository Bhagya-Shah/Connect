"use client";
import "@livekit/components-styles";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, VideoConference, useRemoteParticipants } from "@livekit/components-react";
import { saveCallNote } from "./actions";

type Props = { bookingId: string; title: string; other: string; isPro: boolean; back: string };

export function CallRoom({ bookingId, title, other, isPro, back }: Props) {
  const router = useRouter();
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = useRef(false);

  async function join() {
    setBusy(true); setError(null);
    const res = await fetch("/api/call/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't start the call. Try again.");
    setConn(data);
  }

  if (!conn) return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-sm text-muted">Video call</span>
      <h1 className="text-xl font-semibold">{title} with {other}</h1>
      <p className="text-sm text-muted">Your browser will ask to use your camera and microphone. The call is private to the two of you.</p>
      {error && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{error}</p>}
      <button onClick={join} disabled={busy} className="btn w-full">{busy ? "Connecting…" : error ? "Try again" : "Join call"}</button>
      <button onClick={() => router.push(back)} className="btn-ghost w-full">Back</button>
    </main>
  );

  return (
    <div data-lk-theme="default" className="fixed inset-0 flex">
      <LiveKitRoom token={conn.token} serverUrl={conn.url} connect video audio
        onConnected={() => { connected.current = true; }}
        onDisconnected={() => {
          // a normal hang-up goes back; a failed connection shows the error with a retry
          if (connected.current) return router.push(back);
          setConn(null);
          setError((e) => e || "Couldn't reach the video server. Check your internet and try again.");
        }}
        onError={() => setError("Couldn't reach the video server. Check your internet and try again.")}
        className="relative min-w-0 flex-1">
        <VideoConference />
        <Waiting other={other} isPro={isPro} />
      </LiveKitRoom>
      {isPro && <NotesPanel bookingId={bookingId} other={other} />}
    </div>
  );
}

/** Shown until the other person is in the room. */
function Waiting({ other, isPro }: { other: string; isPro: boolean }) {
  const remote = useRemoteParticipants();
  if (remote.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
      <p className="rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white">
        {isPro ? `Waiting for ${other} to join…` : `You're in the waiting room. ${other} will join soon.`}
      </p>
    </div>
  );
}

function NotesPanel({ bookingId, other }: { bookingId: string; other: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  async function save() {
    setStatus("Saving…");
    const r = await saveCallNote(bookingId, text);
    if (r.error) return setStatus(r.error);
    setText(""); setStatus(`Saved to ${other.split(" ")[0]}'s notes`);
  }
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed right-3 top-3 z-20 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black shadow">
        {open ? "Hide notes" : "Notes"}
      </button>
      {open && (
        <aside className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-line bg-surface p-3 sm:inset-y-0 sm:left-auto sm:w-80 sm:border-l sm:border-t-0 sm:pt-14">
          <b className="text-sm">Private notes</b>
          <span className="text-xs text-muted">Only you can see these. They&apos;re saved on {other.split(" ")[0]}&apos;s page.</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="input flex-1" placeholder="Energy low after lunch, try adding protein to breakfast…" />
          <button onClick={save} disabled={!text.trim()} className="btn btn-sm">Save note</button>
          {status && <span className="text-xs text-muted">{status}</span>}
        </aside>
      )}
    </>
  );
}
