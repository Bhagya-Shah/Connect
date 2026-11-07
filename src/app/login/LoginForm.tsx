"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/go";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setError("That code didn't work. Check the latest email, or send a new code.");
    router.replace(next.startsWith("/") ? next : "/go");
    router.refresh();
  }

  return !sent ? (
    <form onSubmit={sendCode} className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Log in or sign up</h1>
      <p className="text-sm text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
      <label htmlFor="email" className="text-sm font-semibold">Email</label>
      <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
    </form>
  ) : (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="text-sm text-muted">We sent a code to <b>{email}</b>.</p>
      <label htmlFor="code" className="text-sm font-semibold">6-digit code</label>
      <input id="code" className="input tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Log in"}</button>
      <button type="button" className="text-sm font-semibold text-accent" onClick={() => { setSent(false); setCode(""); }}>Use a different email</button>
    </form>
  );
}
