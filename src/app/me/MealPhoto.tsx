"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Shrinks a photo to ~150 KB in the browser, uploads it, and creates the meal log. */
async function shrink(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const k = Math.min(1, 1080 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.75));
  } finally { URL.revokeObjectURL(url); }
}

export function MealPhoto({ clientId, nutritionistId, planId, meal, planned, today }: {
  clientId: string; nutritionistId: string; planId: string | null; meal: string; planned: string; today: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const blob = await shrink(f);
      const path = `${clientId}/${today}-${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("meal-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("meal_logs").insert({ client_id: clientId, nutritionist_id: nutritionistId, plan_id: planId, log_date: today, meal_name: meal, planned, photo_path: path });
      if (error) { await supabase.storage.from("meal-photos").remove([path]); throw error; }
      router.refresh();
    } catch {
      setError("Photo not sent. Check your connection and try again.");
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <label className={`grid h-16 w-16 flex-none cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-accent bg-accent-soft text-center text-[11px] font-semibold leading-tight text-accent ${busy ? "opacity-60" : ""}`}>
        {busy ? "Sending…" : <>Add<br />photo</>}
        <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} aria-label={`Add photo for ${meal}`} />
      </label>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </div>
  );
}
