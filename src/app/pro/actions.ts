"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type Meal, type PlanId } from "@/lib/constants";
import { paymentsLive } from "@/lib/razorpay";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: n } = await supabase.from("nutritionists").select("*").eq("id", user.id).single();
  if (!n) redirect("/onboarding");
  return { supabase, uid: user.id, n };
}

export type Result = { ok?: boolean; error?: string; link?: string } | undefined;

/* ---------- Meal photos ---------- */
export async function reviewMeal(id: string, status: "on_plan" | "off_plan" | null, reply?: string) {
  const { supabase, uid } = await me();
  const patch: Record<string, string> = {};
  if (status) patch.status = status;
  if (reply?.trim()) patch.reply = reply.trim().slice(0, 500);
  if (!Object.keys(patch).length) return;
  const { data: row } = await supabase.from("meal_logs").select("status").eq("id", id).single();
  if (!status && row?.status === "pending") patch.status = "on_plan";
  await supabase.from("meal_logs").update(patch).eq("id", id).eq("nutritionist_id", uid);
  revalidatePath("/pro", "layout");
}

export async function remindClient(clientId: string, text?: string) {
  const { supabase, uid } = await me();
  await supabase.from("messages").insert({ nutritionist_id: uid, client_id: clientId, sender_id: uid,
    body: text || "Friendly reminder: please send a photo of your next meal in the Today tab." });
  revalidatePath("/pro/photos");
}

/* ---------- Clients ---------- */
export async function inviteClient(_: Result, form: FormData): Promise<Result> {
  const { supabase, uid, n } = await me();
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Enter the client's name." };
  const lim = PLANS[n.plan as PlanId].clients;
  const { count } = await supabase.from("client_links").select("id", { count: "exact", head: true }).eq("nutritionist_id", uid).eq("status", "active");
  if (lim !== null && (count ?? 0) >= lim) return { error: `Your ${PLANS[n.plan as PlanId].name} plan allows ${lim} active clients. Upgrade in Business to add more.` };
  const num = (k: string) => { const v = parseFloat(String(form.get(k) || "")); return isNaN(v) ? null : v; };
  const { data, error } = await supabase.from("client_links").insert({
    nutritionist_id: uid, invite_name: name, invite_email: String(form.get("email") || "").trim() || null,
    program: String(form.get("program") || "").trim() || null, goal: String(form.get("goal") || "").trim() || null,
    height_cm: num("height"), start_weight: num("weight"), target_weight: num("target"),
  }).select("invite_code").single();
  if (error) return { error: error.message };
  revalidatePath("/pro/clients");
  return { ok: true, link: `${process.env.NEXT_PUBLIC_SITE_URL}/join/${data.invite_code}` };
}

export async function cancelInvite(id: string) {
  const { supabase, uid } = await me();
  await supabase.from("client_links").delete().eq("id", id).eq("nutritionist_id", uid).eq("status", "invited");
  revalidatePath("/pro/clients");
}

export async function updateClient(clientId: string, form: FormData) {
  const { supabase, uid } = await me();
  const num = (k: string) => { const v = parseFloat(String(form.get(k) || "")); return isNaN(v) ? null : v; };
  await supabase.from("client_links").update({
    program: String(form.get("program") || "").trim() || null, goal: String(form.get("goal") || "").trim() || null,
    height_cm: num("height"), start_weight: num("weight"), target_weight: num("target"),
  }).eq("nutritionist_id", uid).eq("client_id", clientId);
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function endClient(clientId: string) {
  const { supabase, uid } = await me();
  await supabase.from("client_links").update({ status: "ended" }).eq("nutritionist_id", uid).eq("client_id", clientId);
  revalidatePath("/pro", "layout");
  redirect("/pro/clients");
}

export async function addNote(clientId: string, form: FormData) {
  const { supabase, uid } = await me();
  const body = String(form.get("body") || "").trim();
  if (!body) return;
  await supabase.from("notes").insert({ nutritionist_id: uid, client_id: clientId, body });
  revalidatePath(`/pro/clients/${clientId}`);
}

/* ---------- Diet plans ---------- */
export async function savePlan(input: { id?: string; name: string; tag?: string; kcal?: number | null; meals: Meal[]; clientId?: string | null }): Promise<Result> {
  const { supabase, uid, n } = await me();
  const meals = input.meals.map((m) => ({ name: m.name.trim(), time: m.time, items: m.items.map((x) => x.trim()).filter(Boolean) })).filter((m) => m.name);
  if (!input.name.trim()) return { error: "Give the plan a name." };
  if (!meals.length) return { error: "Add at least one meal." };
  const row = { name: input.name.trim(), tag: input.tag?.trim() || null, kcal: input.kcal || null, meals, nutritionist_id: uid };
  if (input.clientId) {
    // assigning to a client always creates that client's new active plan
    await supabase.from("diet_plans").update({ active: false }).eq("nutritionist_id", uid).eq("client_id", input.clientId);
    const { error } = await supabase.from("diet_plans").insert({ ...row, client_id: input.clientId, active: true });
    if (error) return { error: error.message };
    revalidatePath(`/pro/clients/${input.clientId}`);
    redirect(`/pro/clients/${input.clientId}?tab=plan&saved=1`);
  }
  if (!PLANS[n.plan as PlanId].templates) return { error: "Saving your own templates needs the Growth plan. You can still send this plan to a client." };
  const q = input.id ? supabase.from("diet_plans").update(row).eq("id", input.id).eq("nutritionist_id", uid).is("client_id", null)
    : supabase.from("diet_plans").insert(row);
  const { error } = await q;
  if (error) return { error: error.message };
  revalidatePath("/pro/plans");
  redirect("/pro/plans?saved=1");
}

export async function deletePlan(id: string) {
  const { supabase, uid } = await me();
  await supabase.from("diet_plans").delete().eq("id", id).eq("nutritionist_id", uid).is("client_id", null);
  revalidatePath("/pro/plans");
  redirect("/pro/plans");
}

/* ---------- Business ---------- */
export async function updateProfile(_: Result, form: FormData): Promise<Result> {
  const { supabase, uid, n } = await me();
  const list = (k: string) => form.getAll(k).map(String).filter(Boolean);
  const name = String(form.get("name") || "").trim();
  if (name) await supabase.from("profiles").update({ full_name: name }).eq("id", uid);
  const exp = parseInt(String(form.get("experience") || ""));
  const mins = parseInt(String(form.get("session_minutes") || String(n.session_minutes ?? 45)));
  const { error } = await supabase.from("nutritionists").update({
    city: String(form.get("city") || "").trim() || null, mode: String(form.get("mode") || "Online"),
    about: String(form.get("about") || "").trim() || null, qualification: String(form.get("qualification") || "").trim() || null,
    experience_years: isNaN(exp) ? null : exp, meet_url: String(form.get("meet_url") || "").trim() || null,
    session_minutes: isNaN(mins) ? 45 : Math.min(120, Math.max(15, mins)),
    languages: list("languages"), food_types: list("food_types"), goals: list("goals"),
    ...(n.specialty === "psychology" ? { approaches: list("approaches"), consent_text: String(form.get("consent_text") || "").trim().slice(0, 6000) || null } : {}),
    published: form.get("published") === "on",
  }).eq("id", uid);
  if (error) return { error: error.message };
  revalidatePath("/pro", "layout");
  return { ok: true };
}

export async function addService(_: Result, form: FormData): Promise<Result> {
  const { supabase, uid, n } = await me();
  const name = String(form.get("name") || "").trim();
  const type = String(form.get("type") || "call");
  const price = parseInt(String(form.get("price") || "").replace(/\D/g, ""));
  if (!name || isNaN(price)) return { error: "Add a name and a price." };
  if ((type === "package" || type === "monthly") && !PLANS[n.plan as PlanId].packages) return { error: "Packages and monthly plans need the Growth plan." };
  if (type === "group" && !PLANS[n.plan as PlanId].groups) return { error: "Group classes need the Pro plan." };
  const { error } = await supabase.from("services").insert({ nutritionist_id: uid, name, type, price, details: String(form.get("details") || "").trim() || null });
  if (error) return { error: error.message };
  revalidatePath("/pro/business");
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const { supabase, uid } = await me();
  await supabase.from("services").update({ active }).eq("id", id).eq("nutritionist_id", uid);
  revalidatePath("/pro/business");
}

export async function saveAvailability(windows: { weekday: number; start_time: string; end_time: string }[]): Promise<Result> {
  const { supabase, uid } = await me();
  const clean = windows.filter((w) => w.start_time < w.end_time);
  await supabase.from("availability").delete().eq("nutritionist_id", uid);
  if (clean.length) {
    const { error } = await supabase.from("availability").insert(clean.map((w) => ({ ...w, nutritionist_id: uid })));
    if (error) return { error: error.message };
  }
  revalidatePath("/pro/business");
  return { ok: true };
}

export async function setBookingStatus(id: string, status: "completed" | "cancelled") {
  const { supabase, uid } = await me();
  await supabase.from("bookings").update({ status }).eq("id", id).eq("nutritionist_id", uid);
  revalidatePath("/pro", "layout");
}

/** Test mode only: switch plan without paying. Disabled once Razorpay keys are set. */
export async function switchPlanTest(plan: PlanId) {
  const { uid } = await me();
  if (paymentsLive()) throw new Error("Use the real checkout");
  await createAdminClient().from("nutritionists").update({ plan, plan_renews_at: new Date(Date.now() + 30 * 864e5).toISOString() }).eq("id", uid);
  revalidatePath("/pro", "layout");
}
