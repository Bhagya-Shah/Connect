"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEMOS = [["pro", "Nutritionist"], ["client", "Nutrition client"], ["therapist", "Therapist"], ["tclient", "Therapy client"]] as const;

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/go";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const demoError = useSearchParams().get("demo") === "error";

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
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        <b className="text-sm">Just looking? Try the demo</b>
        <span className="text-xs text-muted">One tap, no email. Sample people and data.</span>
        {demoError && <p role="alert" className="text-sm text-bad">The demo couldn&apos;t start. Try again in a minute.</p>}
        <div className="grid grid-cols-2 gap-2">
          {DEMOS.map(([who, label]) => (
            <a key={who} href={`/demo/${who}`} onClick={() => setDemoBusy(who)} className="btn-ghost btn-sm text-center">{demoBusy === who ? "Opening…" : label}</a>
          ))}
        </div>
        {demoBusy && <span className="text-xs text-muted">The first time can take up to 30 seconds while the sample data is made.</span>}
      </div>
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
