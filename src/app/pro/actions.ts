"use server";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanPhone, phoneEmail, type Meal } from "@/lib/constants";
import { cleanMeetUrl } from "@/lib/meet";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: n } = await supabase.from("nutritionists").select("id, meet_url, session_minutes").eq("id", user.id).single();
  if (!n) redirect("/onboarding");
  return { supabase, uid: user.id, n };
}

export type Result = { ok?: boolean; error?: string } | undefined;
export type LoginResult = { ok?: boolean; error?: string; clientId?: string; name?: string; loginId?: string; password?: string; existing?: boolean; phone?: string } | undefined;

const WORDS = ["mango", "jeera", "methi", "lemon", "apple", "guava", "tulsi", "amla", "chana", "moong", "ragi", "jowar", "papaya", "ginger", "haldi", "dates"];
const newPassword = () => WORDS[randomInt(WORDS.length)] + String(randomInt(1000, 10000));
const num = (form: FormData, k: string) => { const v = parseFloat(String(form.get(k) || "")); return isNaN(v) ? null : v; };
const text = (form: FormData, k: string, max = 200) => String(form.get(k) || "").trim().slice(0, max) || null;

/* ---------- Clients ---------- */

/** Adds a client and makes their login (phone or email + password). */
export async function addClient(_: LoginResult, form: FormData): Promise<LoginResult> {
  const { uid } = await me();
  const name = text(form, "name", 80);
  const phone = cleanPhone(String(form.get("phone") || ""));
  const email = String(form.get("email") || "").trim().toLowerCase() || null;
  if (!name) return { error: "Enter the client's name." };
  if (phone.length !== 10) return { error: "Enter a 10-digit mobile number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };

  const admin = createAdminClient();
  const authEmail = email ?? phoneEmail(phone);
  const password = newPassword();
  let clientId: string | null = null;
  let existing = false;
  const created = await admin.auth.admin.createUser({ email: authEmail, password, email_confirm: true, user_metadata: { full_name: name, phone } });
  if (created.data.user) clientId = created.data.user.id;
  else {
    // Already has a Connect login (another practice, or added before): link it, keep their password.
    const { data: prof } = await admin.from("profiles").select("id, role").eq("phone", phone).limit(1).maybeSingle();
    const found = prof?.id ?? (await findUserByEmail(admin, authEmail));
    if (!found) return { error: created.error?.message ?? "Couldn't create the login. Try again." };
    if (found === uid) return { error: "That's your own number." };
    const { data: p } = await admin.from("profiles").select("role").eq("id", found).single();
    if (p?.role === "nutritionist") return { error: "That number belongs to a nutritionist account." };
    clientId = found;
    existing = true;
    if (!p?.role) await admin.from("profiles").update({ role: "client", full_name: name, phone }).eq("id", found);
  }
  if (!existing) {
    const { error } = await admin.from("profiles").upsert({ id: clientId, role: "client", full_name: name, phone });
    if (error) return { error: error.message };
  }
  const { data: link } = await admin.from("client_links").select("id, status").eq("nutritionist_id", uid).eq("client_id", clientId).maybeSingle();
  if (link?.status === "active") return { error: "This client is already in your list. Open them from Clients to send their login again." };
  const row = {
    nutritionist_id: uid, client_id: clientId, status: "active", source: "own", invite_name: name, invite_email: email, phone,
    program: text(form, "program"), goal: text(form, "goal"), food_type: text(form, "food_type", 40), conditions: text(form, "conditions"),
    height_cm: num(form, "height"), start_weight: num(form, "weight"), target_weight: num(form, "target"),
    login_owner: !existing, started_at: new Date().toISOString().slice(0, 10),
  };
  const { login_owner, ...keep } = row;
  const { error } = link
    ? await admin.from("client_links").update(keep).eq("id", link.id)
    : await admin.from("client_links").insert({ ...keep, login_owner });
  if (error) return { error: error.message };
  // no revalidatePath: the form shows the login card, and other pages load fresh on the next visit
  return { ok: true, clientId: clientId!, name, loginId: email ?? phone, password: existing ? undefined : password, existing, phone };
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (!data || data.users.length < 200) return null;
  }
  return null;
}

/** New password for a client login this nutritionist made. */
export async function resetClientPassword(clientId: string): Promise<LoginResult> {
  const { supabase, uid } = await me();
  const { data: link } = await supabase.from("client_links").select("login_owner, phone, invite_email, profiles:client_id(full_name)").eq("nutritionist_id", uid).eq("client_id", clientId).eq("status", "active").single();
  if (!link) return { error: "Client not found." };
  if (!link.login_owner) return { error: "This client made their login elsewhere. They can change their password from their Me tab." };
  const password = newPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(clientId, { password });
  if (error) return { error: error.message };
  const name = (link.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "Client";
  return { ok: true, clientId, name, loginId: link.invite_email ?? link.phone ?? "", password, phone: link.phone ?? undefined };
}

export async function updateClient(clientId: string, form: FormData) {
  const { supabase, uid } = await me();
  const name = text(form, "name", 80);
  await supabase.from("client_links").update({
    program: text(form, "program"), goal: text(form, "goal"), food_type: text(form, "food_type", 40), conditions: text(form, "conditions"),
    height_cm: num(form, "height"), start_weight: num(form, "weight"), target_weight: num(form, "target"),
    ...(name ? { invite_name: name } : {}),
  }).eq("nutritionist_id", uid).eq("client_id", clientId);
  if (name) {
    const { data: l } = await supabase.from("client_links").select("login_owner").eq("nutritionist_id", uid).eq("client_id", clientId).single();
    if (l?.login_owner) await createAdminClient().from("profiles").update({ full_name: name }).eq("id", clientId);
  }
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function endClient(clientId: string) {
  const { supabase, uid } = await me();
  await supabase.from("client_links").update({ status: "ended" }).eq("nutritionist_id", uid).eq("client_id", clientId);
  revalidatePath("/pro", "layout");
  redirect("/pro/clients");
}

export async function restoreClient(clientId: string) {
  const { supabase, uid } = await me();
  await supabase.from("client_links").update({ status: "active" }).eq("nutritionist_id", uid).eq("client_id", clientId);
  revalidatePath("/pro", "layout");
}

export async function addNote(clientId: string, form: FormData) {
  const { supabase, uid } = await me();
  const body = String(form.get("body") || "").trim();
  if (!body) return;
  await supabase.from("notes").insert({ nutritionist_id: uid, client_id: clientId, body });
  revalidatePath(`/pro/clients/${clientId}`);
}

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

export async function remindClient(clientId: string, body?: string) {
  const { supabase, uid } = await me();
  await supabase.from("messages").insert({ nutritionist_id: uid, client_id: clientId, sender_id: uid,
    body: body || "Friendly reminder: please send a photo of your next meal in the Today tab." });
  revalidatePath("/pro/photos");
}

/* ---------- Sessions (Google Meet) ---------- */
export async function scheduleSession(_: Result, form: FormData): Promise<Result> {
  const { supabase, uid, n } = await me();
  const clientId = String(form.get("client") || "");
  const date = String(form.get("date") || ""), time = String(form.get("time") || "");
  const mins = Math.min(240, Math.max(10, parseInt(String(form.get("minutes") || n.session_minutes || 45)) || 45));
  const starts = new Date(`${date}T${time}:00+05:30`);
  if (!clientId) return { error: "Pick a client." };
  if (isNaN(starts.getTime())) return { error: "Pick a date and time." };
  if (starts.getTime() < Date.now() - 60 * 60e3) return { error: "Pick a time in the future." };
  const rawMeet = String(form.get("meet_url") || "");
  const meet = cleanMeetUrl(rawMeet);
  if (rawMeet.trim() && !meet) return { error: "Paste the full Google Meet link, like https://meet.google.com/abc-defg-hij" };
  const ends = new Date(starts.getTime() + mins * 60e3);
  const { error } = await supabase.from("bookings").insert({
    nutritionist_id: uid, client_id: clientId, service_name: text(form, "title", 80) ?? "Consultation",
    starts_at: starts.toISOString(), ends_at: ends.toISOString(), status: "confirmed", amount: 0,
    meet_url: meet ?? n.meet_url ?? null, notes: text(form, "notes", 2000),
  });
  if (error) return { error: error.code === "23505" ? "You already have a session at that exact time." : error.message };
  if (form.get("save_default") === "on" && meet) await supabase.from("nutritionists").update({ meet_url: meet }).eq("id", uid);
  return { ok: true };
}

export async function setSessionStatus(id: string, status: "completed" | "cancelled" | "confirmed") {
  const { supabase, uid } = await me();
  await supabase.from("bookings").update({ status }).eq("id", id).eq("nutritionist_id", uid);
  revalidatePath("/pro", "layout");
}

export async function setSessionMeet(id: string, form: FormData) {
  const { supabase, uid } = await me();
  const meet = cleanMeetUrl(String(form.get("meet_url") || ""));
  await supabase.from("bookings").update({ meet_url: meet }).eq("id", id).eq("nutritionist_id", uid);
  revalidatePath("/pro", "layout");
}

/* ---------- Files ---------- */
export async function deleteFile(id: string) {
  const { supabase, uid } = await me();
  const { data: f } = await supabase.from("client_files").select("path, client_id").eq("id", id).eq("nutritionist_id", uid).single();
  if (!f) return;
  await supabase.storage.from("client-files").remove([f.path]);
  await supabase.from("client_files").delete().eq("id", id);
  revalidatePath("/pro", "layout");
}

/* ---------- Diet plans ---------- */
export async function savePlan(input: { id?: string; name: string; tag?: string; kcal?: number | null; meals: Meal[]; clientId?: string | null }): Promise<Result> {
  const { supabase, uid } = await me();
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

/* ---------- Settings ---------- */
export async function updateSettings(_: Result, form: FormData): Promise<Result> {
  const { supabase, uid } = await me();
  const name = text(form, "name", 80);
  if (!name) return { error: "Enter your name." };
  const rawMeet = String(form.get("meet_url") || "");
  const meet = cleanMeetUrl(rawMeet);
  if (rawMeet.trim() && !meet) return { error: "Paste the full Google Meet link, like https://meet.google.com/abc-defg-hij" };
  const mins = parseInt(String(form.get("session_minutes") || "45"));
  const phone = cleanPhone(String(form.get("phone") || ""));
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("profiles").update({ full_name: name, phone: phone || null }).eq("id", uid),
    supabase.from("nutritionists").update({
      practice_name: text(form, "practice_name", 80), city: text(form, "city", 60), qualification: text(form, "qualification", 120),
      meet_url: meet, session_minutes: isNaN(mins) ? 45 : Math.min(120, Math.max(15, mins)),
      chat_start: String(form.get("chat_start") || "") || null, chat_end: String(form.get("chat_end") || "") || null,
    }).eq("id", uid),
  ]);
  if (e1 || e2) return { error: (e1 || e2)!.message };
  return { ok: true };
}
