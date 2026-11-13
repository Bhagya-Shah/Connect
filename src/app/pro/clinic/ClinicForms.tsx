"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CopyButton } from "@/components/CopyButton";
import { newClinicInvite, saveClinic, setClinicLogo } from "../clinic-actions";

type Clinic = { name: string; slug: string; tagline: string | null; brand_color: string; logo_url: string | null } | null;

export function ClinicForm({ clinic }: { clinic: Clinic }) {
  const [s, a, busy] = useActionState(saveClinic, undefined);
  const [color, setColor] = useState(clinic?.brand_color ?? "#1F5BD8");
  return (
    <form action={a} className="card">
      <h2 className="h3">{clinic ? "Clinic page" : "Create your clinic"}</h2>
      <label className="text-xs text-muted">Clinic name<input name="name" defaultValue={clinic?.name ?? ""} className="input" required placeholder="e.g. Nourish & Mind Clinic" /></label>
      <label className="text-xs text-muted">Short line under the name<input name="tagline" defaultValue={clinic?.tagline ?? ""} className="input" placeholder="Nutrition and therapy in Ahmedabad and online" /></label>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="text-xs text-muted">Clinic link<div className="flex items-center gap-1 text-sm"><span className="text-muted">connect.app/c/</span><input name="slug" defaultValue={clinic?.slug ?? ""} className="input" required placeholder="nourish-mind" /></div></label>
        <label className="text-xs text-muted">Colour<input name="brand_color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[46px] w-16 cursor-pointer rounded-xl border border-line bg-surface p-1" /></label>
      </div>
      {s?.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
      {s?.ok && <p className="text-sm text-good">Saved.</p>}
      <button className="btn btn-sm self-start" disabled={busy} style={{ background: color }}>{clinic ? "Save" : "Create clinic"}</button>
    </form>
  );
}

export function LogoUpload({ uid, current }: { uid: string; current: string | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  async function onFile(f?: File) {
    if (!f) return;
    if (f.size > 1_000_000) return setErr("Logo must be under 1 MB.");
    setBusy(true); setErr(null);
    const supabase = createClient();
    const path = `${uid}/logo-${Date.now()}.${(f.name.split(".").pop() || "png").toLowerCase()}`;
    const { error } = await supabase.storage.from("clinic-logos").upload(path, f, { contentType: f.type });
    if (error) { setErr("Upload failed. Try a PNG or JPG."); setBusy(false); return; }
    await setClinicLogo(supabase.storage.from("clinic-logos").getPublicUrl(path).data.publicUrl);
    setBusy(false); router.refresh();
  }
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {current ? <img src={current} alt="Clinic logo" className="h-14 w-14 rounded-xl border border-line object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Logo</span>}
      <label className="chip cursor-pointer">{busy ? "Uploading…" : current ? "Change logo" : "Upload logo"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /></label>
      {err && <span className="text-sm text-bad">{err}</span>}
    </div>
  );
}

export function InviteMember({ site }: { site: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {link ? (
        <div className="flex flex-col gap-2 rounded-xl bg-good-soft p-3">
          <b className="text-sm">Send this to your colleague</b>
          <div className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate select-all">{link}</span><CopyButton text={link} /></div>
          <span className="text-xs text-muted">Each link works once. Their plan is covered by your clinic while they&apos;re a member.</span>
        </div>
      ) : <button className="btn btn-sm self-start" disabled={pending} onClick={() => start(async () => { const r = await newClinicInvite(); if (r.code) setLink(`${site}/join-clinic/${r.code}`); else setErr(r.error ?? "Try again"); })}>Invite a team member</button>}
      {err && <p className="text-sm text-bad">{err}</p>}
    </div>
  );
}
