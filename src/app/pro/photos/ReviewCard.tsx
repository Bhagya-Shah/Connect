"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { reviewMeal } from "../actions";
import { Avatar, FoodTile, Row } from "@/components/ui";

const QUICK = ["Great choice!", "Smaller portion next time", "Add a protein", "Add salad or veggies", "Less oil please"];

export function ReviewCard({ log, url, clientName, time }: {
  log: { id: string; client_id: string; meal_name: string; planned: string | null; note: string | null };
  url: string | null; clientName: string; time: string;
}) {
  const [pending, start] = useTransition();
  const [reply, setReply] = useState("");
  const act = (status: "on_plan" | "off_plan" | null, text?: string) => start(() => reviewMeal(log.id, status, text));
  return (
    <div className={`card ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2.5">
        <Avatar name={clientName} />
        <span className="min-w-0 flex-1"><b>{clientName}</b><br /><span className="text-sm text-muted">{log.meal_name} · sent {time}</span></span>
        <Link href={`/pro/clients/${log.client_id}`} className="chip">Profile</Link>
      </div>
      <FoodTile label={log.meal_name} url={url} size="full" />
      {log.note && <Row label="Client says">{log.note}</Row>}
      <Row label="Plan said">{log.planned || "No plan for this meal"}</Row>
      <div className="flex gap-2">
        <button className="btn btn-sm !bg-good !text-white" disabled={pending} onClick={() => act("on_plan")}>On plan</button>
        <button className="btn btn-sm !bg-saffron !text-[#2A1A00]" disabled={pending} onClick={() => act("off_plan")}>Off plan</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => <button key={q} className="chip" disabled={pending} onClick={() => act(null, q)}>{q}</button>)}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) act(null, reply); }}>
        <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Or write a reply" aria-label={`Reply to ${clientName}`} />
        <button className="btn btn-sm" disabled={pending || !reply.trim()}>Send</button>
      </form>
    </div>
  );
}
