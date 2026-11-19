"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginEmail } from "@/lib/constants";

const GOOGLE = (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" /></svg>
);

export default function LoginForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/go";
  const [who, setWho] = useState<"pro" | "client">(sp.get("as") === "client" ? "client" : "pro");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(sp.get("error") === "google" ? "Google sign-in didn't finish. Please try again." : sp.get("demo") === "error" ? "The demo couldn't start. Try again in a minute." : null);

  async function google() {
    setBusy("google"); setError(null);
    const on = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } })
      .then((r) => r.json()).then((s) => s?.external?.google !== false).catch(() => true);
    if (!on) { setBusy(null); return setError("Google sign-in isn't switched on for this app yet. Use the demo for now."); }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
    });
    if (error) { setBusy(null); setError(error.message.includes("not enabled") ? "Google sign-in isn't switched on yet for this app. Use the demo for now." : error.message); }
  }

  async function password(e: React.FormEvent) {
    e.preventDefault(); setBusy("pw"); setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: loginEmail(id), password: pw });
    if (error) { setBusy(null); return setError("That mobile number or password doesn't match. Check the message from your nutritionist, or ask them to send your login again."); }
    router.replace(next.startsWith("/") ? next : "/go");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="I am a">
        {([["pro", "I'm a nutritionist"], ["client", "I'm a client"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={who === k} onClick={() => { setWho(k); setError(null); }}
            className={`rounded-lg py-2 text-sm font-semibold ${who === k ? "bg-accent text-accent-ink" : "text-muted"}`}>{l}</button>
        ))}
      </div>

      {who === "pro" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Sign in with your Google account. New here? The same button sets up your practice.</p>
          <button className="btn !bg-surface !text-ink border border-line" onClick={google} disabled={!!busy}>{GOOGLE}{busy === "google" ? "Opening Google…" : "Continue with Google"}</button>
        </div>
      ) : (
        <form onSubmit={password} className="flex flex-col gap-3">
          <p className="text-sm text-muted">Use the login your nutritionist sent you on WhatsApp.</p>
          <label htmlFor="id" className="text-sm font-semibold">Mobile number or email</label>
          <input id="id" className="input" required autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="98765 43210" />
          <label htmlFor="pw" className="text-sm font-semibold">Password</label>
          <input id="pw" className="input" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn" disabled={!!busy}>{busy === "pw" ? "Logging in…" : "Log in"}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={google} disabled={!!busy}>{GOOGLE}Or use Google (if your nutritionist added your Gmail)</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}

      <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
        <b className="text-sm">Just looking? Try the demo</b>
        <span className="text-xs text-muted">One tap, sample data, nothing to set up.</span>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/demo/pro" prefetch={false} onClick={() => setBusy("demo-pro")} className="btn-ghost btn-sm text-center">{busy === "demo-pro" ? "Opening…" : "Nutritionist demo"}</Link>
          <Link href="/demo/client" prefetch={false} onClick={() => setBusy("demo-client")} className="btn-ghost btn-sm text-center">{busy === "demo-client" ? "Opening…" : "Client demo"}</Link>
        </div>
        {busy?.startsWith("demo") && <span className="text-xs text-muted">The first time can take up to 30 seconds while sample data is made.</span>}
      </div>
    </div>
  );
}
