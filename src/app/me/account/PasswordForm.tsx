"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  if (!open) return <button className="btn-ghost btn-sm self-start" onClick={() => setOpen(true)}>Change password</button>;
  return (
    <form className="flex flex-col gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (pw.length < 6) return setMsg({ error: "Use at least 6 characters." });
      setBusy(true); setMsg(null);
      const { error } = await createClient().auth.updateUser({ password: pw });
      setBusy(false);
      setMsg(error ? { error: "Couldn't change it. Log out and in again, then try." } : { ok: true });
      if (!error) setPw("");
    }}>
      <label className="text-xs text-muted">New password<input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required /></label>
      {msg?.error && <p role="alert" className="text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-good">Password changed.</p>}
      <button className="btn btn-sm self-start" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
