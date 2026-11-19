"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FILE_ACCEPT, FILE_KINDS, MAX_FILE_MB, type FileKind } from "@/lib/constants";

const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain",
};
const safe = (n: string) => n.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-80);

/** Uploads straight from the phone or laptop to private storage, then lists the file for both sides. */
export function FileUpload({ nutritionistId, clientId, uploaderId, defaultKind = "diet_plan", kinds = Object.keys(FILE_KINDS) as FileKind[], compact = false }: {
  nutritionistId: string; clientId: string; uploaderId: string; defaultKind?: FileKind; kinds?: FileKind[]; compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FileKind>(defaultKind);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const router = useRouter();

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const supabase = createClient();
    setMsg(null);
    let done = 0;
    for (const f of Array.from(list)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const mime = f.type || MIME[ext] || "";
      if (!Object.values(MIME).includes(mime)) { setMsg({ error: `${f.name}: use PDF, photo, Word, Excel or text files.` }); continue; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { setMsg({ error: `${f.name} is over ${MAX_FILE_MB} MB.` }); continue; }
      setBusy(f.name);
      const path = `${nutritionistId}/${clientId}/${crypto.randomUUID().slice(0, 8)}-${safe(f.name)}`;
      const up = await supabase.storage.from("client-files").upload(path, f, { contentType: mime });
      if (up.error) { setMsg({ error: `${f.name} didn't upload. Check your connection and try again.` }); continue; }
      const { error } = await supabase.from("client_files").insert({
        nutritionist_id: nutritionistId, client_id: clientId, uploaded_by: uploaderId,
        name: f.name.slice(0, 200), path, size: f.size, mime, kind, note: note.trim() || null,
      });
      if (error) { await supabase.storage.from("client-files").remove([path]); setMsg({ error: `${f.name} didn't save. Try again.` }); continue; }
      done++;
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    if (done) { setNote(""); setMsg((m) => m?.error ? m : { ok: done === 1 ? "File shared." : `${done} files shared.` }); router.refresh(); }
  }

  return (
    <div className={compact ? "flex flex-col gap-2" : "card"}>
      {!compact && <h2 className="h3">Share a file</h2>}
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="File type">
          {kinds.map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`chip ${kind === k ? "chip-on" : ""}`}>{FILE_KINDS[k]}</button>)}
        </div>
      )}
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. Week 3 plan" aria-label="Note for this file" maxLength={500} />
      <label className={`btn ${busy ? "opacity-60" : ""}`}>
        {busy ? `Uploading ${busy.length > 24 ? busy.slice(0, 22) + "…" : busy}` : "Choose files"}
        <input ref={input} type="file" multiple accept={FILE_ACCEPT} className="sr-only" disabled={!!busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      <span className="text-xs text-muted">PDF, photos, Word or Excel. Up to {MAX_FILE_MB} MB each. Only you and your {uploaderId === nutritionistId ? "client" : "nutritionist"} can open them.</span>
      {msg?.error && <p role="alert" className="text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-good">{msg.ok}</p>}
    </div>
  );
}
