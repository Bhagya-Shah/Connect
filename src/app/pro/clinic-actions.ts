"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type R = { ok?: boolean; error?: string } | undefined;

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: n } = await supabase.from("nutritionists").select("id, plan").eq("id", user.id).single();
  if (!n) redirect("/onboarding");
  return { supabase, uid: user.id, plan: n.plan as string };
}

export async function saveClinic(_: R, form: FormData): Promise<R> {
  const { supabase, uid, plan } = await me();
  const name = String(form.get("name") || "").trim();
  const slug = String(form.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const color = String(form.get("brand_color") || "#1F5BD8");
  if (name.length < 2) return { error: "Give your clinic a name." };
  if (slug.length < 3) return { error: "The link name needs at least 3 letters." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Pick a colour." };
  const row = { name, slug, brand_color: color, tagline: String(form.get("tagline") || "").trim().slice(0, 140) || null };
  const { data: existing } = await supabase.from("clinics").select("id").eq("owner_id", uid).maybeSingle();
  if (!existing && plan !== "clinic") return { error: "Clinic pages come with the Clinic plan." };
  const { data: clinic, error } = existing
    ? await supabase.from("clinics").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("clinics").insert({ ...row, owner_id: uid }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That link name is taken. Try another." : error.message };
  if (!existing) await createAdminClient().from("clinic_members").insert({ clinic_id: clinic.id, nutritionist_id: uid, role: "owner" });
  revalidatePath("/pro/clinic");
  return { ok: true };
}

export async function setClinicLogo(url: string) {
  const { supabase, uid } = await me();
  if (!url.includes(`/clinic-logos/${uid}/`)) return;
  await supabase.from("clinics").update({ logo_url: url }).eq("owner_id", uid);
  revalidatePath("/pro/clinic");
}

export async function newClinicInvite(): Promise<{ code?: string; error?: string }> {
  const { supabase, uid } = await me();
  const { data: c } = await supabase.from("clinics").select("id").eq("owner_id", uid).single();
  if (!c) return { error: "Create your clinic first." };
  const { data, error } = await supabase.from("clinic_invites").insert({ clinic_id: c.id }).select("code").single();
  if (error) return { error: error.message };
  return { code: data.code };
}

export async function removeMember(memberId: string) {
  const { supabase, uid } = await me();
  const { data: c } = await supabase.from("clinics").select("id").eq("owner_id", uid).single();
  if (!c || memberId === uid) return;
  const admin = createAdminClient();
  const { data: m } = await admin.from("clinic_members").delete().eq("clinic_id", c.id).eq("nutritionist_id", memberId).eq("role", "member").select();
  if (m?.length) await admin.from("nutritionists").update({ plan: m[0].prev_plan === "clinic" ? "starter" : m[0].prev_plan }).eq("id", memberId);
  revalidatePath("/pro/clinic");
}

export async function leaveClinic() {
  const { uid } = await me();
  const admin = createAdminClient();
  const { data: m } = await admin.from("clinic_members").delete().eq("nutritionist_id", uid).eq("role", "member").select();
  if (m?.length) await admin.from("nutritionists").update({ plan: m[0].prev_plan === "clinic" ? "starter" : m[0].prev_plan }).eq("id", uid);
  revalidatePath("/pro", "layout");
  redirect("/pro/clinic");
}

/** A nutritionist or therapist joins a clinic from the owner's invite link. Their plan is covered by the clinic. */
export async function joinClinic(code: string): Promise<R> {
  const { uid } = await me();
  const admin = createAdminClient();
  const { data: inv } = await admin.from("clinic_invites").select("code, clinic_id, used_by, clinics(owner_id)").eq("code", code).maybeSingle();
  if (!inv) return { error: "This invite link is not valid." };
  if (inv.used_by && inv.used_by !== uid) return { error: "This invite was already used. Ask for a new one." };
  const { data: already } = await admin.from("clinic_members").select("clinic_id").eq("nutritionist_id", uid).maybeSingle();
  if (already) return already.clinic_id === inv.clinic_id ? { ok: true } : { error: "You're already part of another clinic. Leave it first." };
  const ownerId = (inv.clinics as unknown as { owner_id: string }).owner_id;
  const { data: owner } = await admin.from("nutritionists").select("plan").eq("id", ownerId).single();
  if (owner?.plan !== "clinic") return { error: "This clinic's plan has ended. Ask the owner to renew." };
  const { count } = await admin.from("clinic_members").select("nutritionist_id", { count: "exact", head: true }).eq("clinic_id", inv.clinic_id);
  if ((count ?? 0) >= 5) return { error: "This clinic already has 5 members." };
  const { data: mine } = await admin.from("nutritionists").select("plan").eq("id", uid).single();
  const { error } = await admin.from("clinic_members").insert({ clinic_id: inv.clinic_id, nutritionist_id: uid, role: "member", prev_plan: mine?.plan ?? "starter" });
  if (error) return { error: error.message };
  await admin.from("clinic_invites").update({ used_by: uid }).eq("code", code);
  await admin.from("nutritionists").update({ plan: "clinic" }).eq("id", uid);
  revalidatePath("/pro", "layout");
  return { ok: true };
}
