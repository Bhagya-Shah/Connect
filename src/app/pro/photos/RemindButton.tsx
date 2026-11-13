"use client";
import { useState, useTransition } from "react";
import { remindClient } from "../actions";

export function RemindButton({ clientIds, label = "Remind" }: { clientIds: string[]; label?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button className={label === "Remind" ? "btn-ghost btn-sm" : "btn"} disabled={pending || done}
      onClick={() => start(async () => { for (const id of clientIds) await remindClient(id); setDone(true); })}>
      {done ? "Reminded" : pending ? "Sending…" : label}
    </button>
  );
}
