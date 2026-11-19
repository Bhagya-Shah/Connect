import "server-only";
import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NEW_MEET_URL } from "@/lib/meet";

/** Ready-made demo accounts, so a demo works without Google sign-in. */
export const DEMO = {
  pro: { email: "priya@demo.connect.app", name: "Priya Mehta" },
  client: { email: "rahul@demo.connect.app", name: "Rahul Verma" },
} as const;
export type DemoWho = keyof typeof DEMO;

/** Password derived from the service key, never shown or stored in the repo. */
export const demoPassword = (email: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("demo:" + email).digest("base64url").slice(0, 24) + "!a1";

const IST = (n: number) => new Date(Date.now() - n * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const iso = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const must = <T,>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data as NonNullable<T>; };

async function idByEmail(a: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await a.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users.find((x) => x.email === email);
    if (u) return u.id;
    if (!data || data.users.length < 200) return null;
  }
  return null;
}

async function user(a: SupabaseClient, email: string, name: string, role: "nutritionist" | "client", withPassword: boolean, phone?: string) {
  const res = await a.auth.admin.createUser({ email, email_confirm: true, ...(withPassword ? { password: demoPassword(email) } : {}) });
  const id = res.data.user?.id ?? (await idByEmail(a, email));
  if (!id) throw new Error("user " + email + ": " + res.error?.message);
  must(await a.from("profiles").upsert({ id, role, full_name: name, phone: phone ?? null }), "profile");
  return id;
}

async function photo(a: SupabaseClient, origin: string, cid: string, file: string) {
  const blob = await (await fetch(`${origin}/demo/food/${file}.jpg`)).arrayBuffer();
  const path = `${cid}/demo-${crypto.randomUUID()}.jpg`;
  must(await a.storage.from("meal-photos").upload(path, blob, { contentType: "image/jpeg" }), "photo");
  return path;
}

/** A tiny one-page PDF with plain text lines, so demo files open like real ones. */
function pdf(title: string, lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7E]/g, "-");
  const text = [`BT /F1 20 Tf 56 780 Td (${esc(title)}) Tj ET`, ...lines.map((l, i) => `BT /F1 12 Tf 56 ${740 - i * 20} Td (${esc(l)}) Tj ET`)].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

async function addFile(a: SupabaseClient, P: string, cid: string, by: string, name: string, kind: string, title: string, lines: string[], daysAgo: number, note?: string) {
  const body = pdf(title, lines);
  const path = `${P}/${cid}/demo-${crypto.randomUUID().slice(0, 8)}-${name.replace(/\s+/g, "_")}`;
  must(await a.storage.from("client-files").upload(path, body, { contentType: "application/pdf" }), "file");
  must(await a.from("client_files").insert({ nutritionist_id: P, client_id: cid, uploaded_by: by, name, path, size: body.length, mime: "application/pdf", kind, note: note ?? null, created_at: iso(daysAgo) }), "file row");
}

const PEOPLE = [
  { email: DEMO.client.email, name: DEMO.client.name, phone: "9876500001", login: true, plan: "Weight loss", start: 92, drop: 1.4, prog: "12-week weight loss", goal: "weight-loss", today: [["Breakfast", "poha", "pending"]], msgs: [["c", "Had poha today, is that okay?"], ["n", "Yes, add a handful of peanuts for protein."]] },
  { email: "karan@demo.connect.app", name: "Karan Joshi", phone: "9876500002", login: false, plan: "Weight loss", start: 96, drop: 4.3, prog: "12-week weight loss", goal: "weight-loss", today: [["Breakfast", "breakfast", "on_plan"], ["Lunch", "lunch", "pending"]], msgs: [["n", "Great week Karan, down 0.8 kg!"], ["c", "Thank you! Weekend was tough but I managed."]] },
  { email: "meera@demo.connect.app", name: "Meera Desai", phone: "9876500003", login: false, plan: "PCOS", start: 74, drop: 3.1, prog: "PCOS 3-month plan", goal: "pcos", today: [["Breakfast", "breakfast", "pending"]], msgs: [["c", "Uploaded my new thyroid report."]] },
  { email: "sneha@demo.connect.app", name: "Sneha Patel", phone: "9876500004", login: false, plan: "Weight loss", start: 68, drop: 1.6, prog: "12-week weight loss", goal: "weight-loss", today: [["Breakfast", "breakfast", "off_plan"]], msgs: [["c", "Wedding this weekend 😅 any tips?"], ["n", "Eat a small bowl of dal before you go, and skip the sweets on round two."]] },
] as const;

/** Creates the demo practice once. Safe to call on every demo login. */
export async function ensureDemo(a: SupabaseClient, origin: string) {
  const P0 = await idByEmail(a, DEMO.pro.email);
  const { data: have } = P0 ? await a.from("nutritionists").select("id").eq("id", P0).maybeSingle() : { data: null };
  if (have) return refresh(a, origin, have.id);

  const P = await user(a, DEMO.pro.email, DEMO.pro.name, "nutritionist", true, "9876500000");
  must(await a.from("nutritionists").upsert({ id: P, practice_name: "Nourish Nutrition Clinic", city: "Ahmedabad", qualification: "M.Sc. Nutrition, RD", languages: ["Gujarati", "Hindi", "English"], food_types: ["Veg", "Jain"], meet_url: NEW_MEET_URL, session_minutes: 45 }), "priya");
  const tpls = must(await a.from("diet_plans").select("*").is("nutritionist_id", null), "templates");

  for (const p of PEOPLE) {
    const cid = await user(a, p.email, p.name, "client", p.login, p.phone);
    const tpl = tpls.find((t) => t.tag === p.plan) ?? tpls[0];
    must(await a.from("client_links").insert({ nutritionist_id: P, client_id: cid, status: "active", source: "own", program: p.prog, goal: p.goal, phone: p.phone, login_owner: true, food_type: "Veg", height_cm: 168, start_weight: p.start, target_weight: p.start - 8, started_at: IST(42), created_at: iso(42) }), "link");
    const plan = must(await a.from("diet_plans").insert({ nutritionist_id: P, client_id: cid, name: tpl.name, tag: tpl.tag, kcal: tpl.kcal, meals: tpl.meals }).select().single(), "plan");
    must(await a.from("weight_logs").insert([6, 5, 4, 3, 2, 1, 0].map((w) => ({ client_id: cid, log_date: IST(w * 7), weight: +(p.start - (p.drop * (6 - w)) / 6).toFixed(1), waist: +(90 - (6 - w) * 0.5).toFixed(1) }))), "weights");
    const pics = await Promise.all(["breakfast", "lunch", "dinner"].map((f) => photo(a, origin, cid, f)));
    const rows = [];
    for (let d = 6; d >= 1; d--) for (const [i, m] of ["Breakfast", "Lunch", "Dinner"].entries()) {
      if ((d + i) % 5 === 0) continue;
      rows.push({ client_id: cid, nutritionist_id: P, plan_id: plan.id, log_date: IST(d), meal_name: m, photo_path: pics[i], status: (d + i) % 4 === 0 ? "off_plan" : "on_plan", reply: "Looks good 👍", reviewed_at: iso(d) });
    }
    must(await a.from("meal_logs").insert(rows), "meals");
    for (const [m, f, st] of p.today) {
      const planned = ((tpl.meals as { name: string; items: string[] }[]).find((x) => x.name === m)?.items ?? []).join(", ");
      must(await a.from("meal_logs").insert({ client_id: cid, nutritionist_id: P, plan_id: plan.id, log_date: IST(0), meal_name: m, planned, photo_path: await photo(a, origin, cid, f), status: st, reply: st === "on_plan" ? "Perfect plate 👏" : st === "off_plan" ? "Too much rice, half next time." : null, reviewed_at: st === "pending" ? null : new Date().toISOString() }), "today");
    }
    must(await a.from("checkins").insert({ client_id: cid, nutritionist_id: P, energy: 4, hunger: 2, note: "Feeling lighter, sleeping better." }), "checkin");
    let t = Date.now() - 3 * 3600e3;
    for (const [who, body] of p.msgs) { t += 600e3; must(await a.from("messages").insert({ nutritionist_id: P, client_id: cid, sender_id: who === "n" ? P : cid, body, created_at: new Date(t).toISOString() }), "msg"); }
    const st = new Date(Date.now() - (5 + PEOPLE.indexOf(p)) * 864e5); st.setUTCHours(5, 0, 0, 0);
    must(await a.from("bookings").insert({ nutritionist_id: P, client_id: cid, service_name: "First consultation", starts_at: st.toISOString(), ends_at: new Date(st.getTime() + 45 * 60e3).toISOString(), status: "completed", amount: 0, meet_url: NEW_MEET_URL }), "past session");
  }
  await refresh(a, origin, P);
}

/** Keeps the demo alive: practice details, files, upcoming Meet sessions and today's meal photos. */
async function refresh(a: SupabaseClient, origin: string, P: string) {
  await a.from("nutritionists").update({ practice_name: "Nourish Nutrition Clinic", meet_url: NEW_MEET_URL }).eq("id", P).is("practice_name", null);
  await a.from("profiles").update({ role: "nutritionist" }).eq("id", P);
  const { data: links } = await a.from("client_links").select("client_id, phone, profiles:client_id(full_name, phone)").eq("nutritionist_id", P).eq("status", "active");
  const people = (links ?? []).map((l) => ({ id: l.client_id as string, phone: l.phone as string | null, name: (l.profiles as unknown as { full_name: string } | null)?.full_name ?? "Client" }));
  // older demo data: fill phone numbers and mark logins as made here
  for (const p of people) {
    const want = PEOPLE.find((x) => x.name === p.name)?.phone;
    if (!p.phone && want) await a.from("client_links").update({ phone: want, login_owner: true }).eq("nutritionist_id", P).eq("client_id", p.id);
    if (want) await a.from("profiles").update({ phone: want }).eq("id", p.id).is("phone", null);
  }

  // sample files
  const { count: nFiles } = await a.from("client_files").select("id", { count: "exact", head: true }).eq("nutritionist_id", P);
  if (!nFiles) {
    for (const [i, p] of people.slice(0, 4).entries()) {
      await addFile(a, P, p.id, P, `${p.name.split(" ")[0]} diet plan week 6.pdf`, "diet_plan", `Diet plan for ${p.name}`, ["Early morning: warm jeera water, 5 soaked almonds", "Breakfast: moong dal chilla (2), mint chutney", "Mid-morning: 1 apple or guava", "Lunch: 2 rotli, dal, seasonal shaak, salad", "Evening: tea with less sugar, roasted chana", "Dinner: vegetable khichdi, buttermilk", "", "Water: 3 litres. Walk 8,000 steps a day."], 6 - i, "Week 6");
      if (i % 2 === 0) await addFile(a, P, p.id, p.id, "Blood test report.pdf", "report", "Lab report", ["Haemoglobin: 12.8 g/dL", "Fasting glucose: 98 mg/dL", "HbA1c: 5.6 %", "TSH: 3.9 uIU/mL", "Vitamin D: 18 ng/mL (low)", "Vitamin B12: 210 pg/mL"], 1 + i);
    }
  }

  // an upcoming session for every client in the next days, plus one today
  const { data: upcoming } = await a.from("bookings").select("client_id").eq("nutritionist_id", P).eq("status", "confirmed").gt("starts_at", new Date().toISOString());
  const has = new Set((upcoming ?? []).map((b) => b.client_id));
  for (const [i, p] of people.entries()) {
    if (has.has(p.id)) continue;
    const s = new Date(); s.setUTCHours(5 + i, 30, 0, 0); // 11:00, 12:00… India time
    if (s.getTime() < Date.now() + 20 * 60e3) s.setUTCDate(s.getUTCDate() + 1 + (i % 3));
    await a.from("bookings").insert({ nutritionist_id: P, client_id: p.id, service_name: i ? "Follow-up" : "Weekly check-in call", starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 30 * 60e3).toISOString(), status: "confirmed", amount: 0, meet_url: NEW_MEET_URL });
  }
  await a.from("bookings").update({ meet_url: NEW_MEET_URL }).eq("nutritionist_id", P).is("meet_url", null);

  // fresh meal photos waiting for review today
  const { count } = await a.from("meal_logs").select("id", { count: "exact", head: true }).eq("nutritionist_id", P).eq("log_date", IST(0));
  if (count) return;
  for (const [i, p] of people.slice(0, 3).entries()) {
    const { data: plan } = await a.from("diet_plans").select("id, meals").eq("client_id", p.id).eq("nutritionist_id", P).eq("active", true).limit(1).maybeSingle();
    const meal = i % 2 ? "Lunch" : "Breakfast";
    const planned = ((plan?.meals ?? []) as { name: string; items: string[] }[]).find((x) => x.name === meal)?.items.join(", ") ?? null;
    await a.from("meal_logs").insert({ client_id: p.id, nutritionist_id: P, plan_id: plan?.id ?? null, log_date: IST(0), meal_name: meal, planned, photo_path: await photo(a, origin, p.id, ["poha", "lunch", "breakfast"][i]), status: "pending" });
  }
}
