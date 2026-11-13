"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EXERCISES, PLANS, type CheckupKind, type PlanId } from "@/lib/constants";

async function therapist() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: n } = await supabase.from("nutritionists").select("plan, specialty").eq("id", user.id).single();
  if (!n || n.specialty !== "psychology") redirect("/pro");
  return { supabase, uid: user.id, tools: PLANS[n.plan as PlanId].tools };
}

export async function addSessionNote(clientId: string, form: FormData) {
  const { supabase, uid } = await therapist();
  const parts = [["Talked about", "talked"], ["Noticed", "noticed"], ["Plan", "plan"]]
    .map(([label, k]) => [label, String(form.get(k) || "").trim()]).filter(([, v]) => v);
  if (!parts.length) return;
  await supabase.from("notes").insert({ nutritionist_id: uid, client_id: clientId, body: parts.map(([l, v]) => `${l}: ${v}`).join("\n") });
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function assignHomework(clientId: string, form: FormData) {
  const { supabase, uid, tools } = await therapist();
  if (!tools) return;
  const ex = EXERCISES.find((e) => e.id === form.get("exercise"));
  const title = String(form.get("title") || "").trim() || ex?.title;
  const details = String(form.get("details") || "").trim() || ex?.details || null;
  if (!title) return;
  const due = String(form.get("due") || "") || null;
  await supabase.from("homework").insert({ nutritionist_id: uid, client_id: clientId, title, details, due_date: due });
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function deleteHomework(clientId: string, id: string) {
  const { supabase, uid } = await therapist();
  await supabase.from("homework").delete().eq("id", id).eq("nutritionist_id", uid);
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function requestCheckup(clientId: string, kind: CheckupKind) {
  const { supabase, uid, tools } = await therapist();
  if (!tools) return;
  const { data: open } = await supabase.from("assessments").select("id").eq("nutritionist_id", uid).eq("client_id", clientId).eq("kind", kind).eq("status", "requested").limit(1);
  if (!open?.length) await supabase.from("assessments").insert({ nutritionist_id: uid, client_id: clientId, kind });
  revalidatePath(`/pro/clients/${clientId}`);
}

export async function cancelCheckup(clientId: string, id: string) {
  const { supabase, uid } = await therapist();
  await supabase.from("assessments").delete().eq("id", id).eq("nutritionist_id", uid).eq("status", "requested");
  revalidatePath(`/pro/clients/${clientId}`);
}
