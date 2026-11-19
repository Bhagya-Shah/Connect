"use client";
import { useState, useTransition } from "react";
import { resetClientPassword, type LoginResult } from "../../actions";
import { LoginCard } from "@/components/LoginCard";

export function ResetLogin({ clientId, practice }: { clientId: string; practice: string | null }) {
  const [res, setRes] = useState<LoginResult>(undefined);
  const [pending, start] = useTransition();
  if (res?.ok) return <LoginCard name={res.name!} loginId={res.loginId!} password={res.password} phone={res.phone} practice={practice} />;
  return (
    <div className="flex flex-col gap-1.5">
      <button className="btn-ghost btn-sm self-start" disabled={pending} onClick={() => start(async () => setRes(await resetClientPassword(clientId)))}>
        {pending ? "Making a new password…" : "Send login again (new password)"}
      </button>
      {res?.error && <p role="alert" className="text-sm text-bad">{res.error}</p>}
    </div>
  );
}
