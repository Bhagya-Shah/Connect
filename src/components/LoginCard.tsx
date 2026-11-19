"use client";
import { useState } from "react";
import { whatsappLink } from "@/lib/meet";

/** Shows a client's login once, with copy and WhatsApp. */
export function LoginCard({ name, loginId, password, phone, existing, practice }: {
  name: string; loginId: string; password?: string; phone?: string; existing?: boolean; practice?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const msg = existing
    ? `Hi ${name.split(" ")[0]}, I've added you to ${practice || "my practice"} on Connect. Log in at ${site}/login with your usual login (${loginId}).`
    : `Hi ${name.split(" ")[0]}, here is your login for ${practice || "my practice"} on Connect, where you'll find your diet plans, reports and our video sessions.\n\nOpen: ${site}/login\n${loginId.includes("@") ? "Email" : "Mobile number"}: ${loginId}\nPassword: ${password}\n\nYou can change the password after you log in.`;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-good bg-good-soft p-3.5">
      <b>{existing ? `${name} already had a Connect login` : `Login ready for ${name}`}</b>
      {existing ? <span className="text-sm">They&apos;re now linked to you and log in with their existing password.</span> : (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-surface p-3 text-sm">
          <span className="text-muted">{loginId.includes("@") ? "Email" : "Mobile"}</span><b className="select-all">{loginId}</b>
          <span className="text-muted">Password</span><b className="select-all font-mono tracking-wide">{password}</b>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-sm !bg-[#1F8F4E] !text-white" href={whatsappLink(msg, phone)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
        <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? "Copied" : "Copy message"}</button>
      </div>
      {!existing && <span className="text-xs text-muted">Save or send it now. For safety the password isn&apos;t shown again, but you can make a new one any time.</span>}
    </div>
  );
}
