import "server-only";
import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CONSENT } from "@/lib/constants";

/** Ready-made demo accounts, so a demo works without email codes. */
export const DEMO = {
  pro: { email: "priya@demo.connect.app", name: "Priya Mehta" },
  client: { email: "rahul@demo.connect.app", name: "Rahul Verma" },
  therapist: { email: "aarti@demo.connect.app", name: "Dr. Aarti Kapoor" },
  tclient: { email: "neha@demo.connect.app", name: "Neha Joshi" },
} as const;
export type DemoWho = keyof typeof DEMO;

/** Password derived from the service key, never shown or stored in the repo. */
export const demoPassword = (email: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("demo:" + email).digest("base64url").slice(0, 24) + "!a1";

const IST = (n: number) => new Date(Date.now() - n * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const iso = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const must = <T,>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data as NonNullable<T>; };

async function user(a: SupabaseClient, email: string, name: string, role: "nutritionist" | "client", withPassword: boolean) {
  const res = await a.auth.admin.createUser({ email, email_confirm: true, ...(withPassword ? { password: demoPassword(email) } : {}) });
  let id = res.data.user?.id;
  if (!id) {
    const list = await a.auth.admin.listUsers({ perPage: 1000 });
    id = list.data.users.find((u) => u.email === email)?.id;
    if (!id) throw new Error("user " + email + ": " + res.error?.message);
  }
  must(await a.from("profiles").upsert({ id, role, full_name: name }), "profile");
  return id;
}

async function idByEmail(a: SupabaseClient, email: string) {
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function photo(a: SupabaseClient, origin: string, cid: string, file: string) {
  const blob = await (await fetch(`${origin}/demo/food/${file}.jpg`)).arrayBuffer();
  const path = `${cid}/demo-${crypto.randomUUID()}.jpg`;
  must(await a.storage.from("meal-photos").upload(path, blob, { contentType: "image/jpeg" }), "photo");
  return path;
}

/** Creates the demo practices once. Safe to call on every demo login. */
export async function ensureDemo(a: SupabaseClient, origin: string) {
  const { data: have } = await a.from("nutritionists").select("id").eq("handle", "priya-mehta").maybeSingle();
  if (have) return refreshToday(a, origin, have.id);

  // ---------- Nutritionist: Priya ----------
  const P = await user(a, DEMO.pro.email, DEMO.pro.name, "nutritionist", true);
  must(await a.from("nutritionists").upsert({ id: P, handle: "priya-mehta", city: "Ahmedabad", languages: ["Gujarati", "Hindi", "English"], food_types: ["Veg", "Jain"], goals: ["weight-loss", "pcos", "diabetes"], about: "Registered dietitian. Weight loss and PCOS with Gujarati home food.", qualification: "M.Sc. Nutrition, RD", experience_years: 7, plan: "pro", published: true, business_name: "Nourish Nutrition Clinic", gstin: "24ABCDE1234F1Z5", business_address: "12 CG Road, Ahmedabad 380009", gst_rate: 18 }), "priya");
  const windows = [1, 2, 3, 4, 5, 6].flatMap((d) => [{ weekday: d, start_time: "10:00", end_time: "13:00" }, { weekday: d, start_time: "16:00", end_time: "19:00" }]);
  must(await a.from("availability").insert(windows.map((w) => ({ ...w, nutritionist_id: P }))), "avail");
  const sv = must(await a.from("services").insert([
    { nutritionist_id: P, name: "First consultation", type: "call", details: "45 min video call", price: 999 },
    { nutritionist_id: P, name: "Free 10 min intro call", type: "call", details: "Meet before you decide", price: 0 },
    { nutritionist_id: P, name: "12-week weight loss plan", type: "package", details: "Weekly calls, daily photo reviews", price: 7999 },
  ]).select(), "services");
  const tpls = must(await a.from("diet_plans").select("*").is("nutritionist_id", null), "templates");
  const tWL = tpls.find((t) => t.name.includes("Weight loss")) ?? tpls[0];
  const tPC = tpls.find((t) => t.name.includes("PCOS")) ?? tpls[0];

  const people = [
    { email: DEMO.client.email, name: DEMO.client.name, login: true, tpl: tWL, start: 92, drop: 1.4, prog: "12-week weight loss", source: "search", today: [["Breakfast", "poha", "pending"]], msgs: [["c", "Had poha today, is that okay?"], ["n", "Yes, add a handful of peanuts for protein."]] },
    { email: "karan@demo.connect.app", name: "Karan Joshi", login: false, tpl: tWL, start: 96, drop: 4.3, prog: "12-week weight loss", source: "own", today: [["Breakfast", "breakfast", "on_plan"], ["Lunch", "lunch", "pending"]], msgs: [["n", "Great week Karan, down 0.8 kg!"], ["c", "Thank you! Weekend was tough but I managed."]] },
    { email: "meera@demo.connect.app", name: "Meera Desai", login: false, tpl: tPC, start: 74, drop: 3.1, prog: "PCOS 3-month plan", source: "own", today: [["Breakfast", "breakfast", "pending"]], msgs: [] },
    { email: "sneha@demo.connect.app", name: "Sneha Patel", login: false, tpl: tWL, start: 68, drop: 1.6, prog: "12-week weight loss", source: "own", today: [["Breakfast", "breakfast", "off_plan"]], msgs: [["c", "Wedding this weekend 😅 any tips?"], ["n", "Eat a small bowl of dal before you go, and skip the sweets on round two."]] },
  ] as const;

  for (const p of people) {
    const cid = await user(a, p.email, p.name, "client", p.login);
    must(await a.from("client_links").insert({ nutritionist_id: P, client_id: cid, status: "active", source: p.source, program: p.prog, goal: "weight-loss", food_type: "Veg", height_cm: 168, start_weight: p.start, target_weight: p.start - 8, started_at: IST(42) }), "link");
    const plan = must(await a.from("diet_plans").insert({ nutritionist_id: P, client_id: cid, name: p.tpl.name, tag: p.tpl.tag, kcal: p.tpl.kcal, meals: p.tpl.meals }).select().single(), "plan");
    must(await a.from("weight_logs").insert([6, 5, 4, 3, 2, 1, 0].map((w) => ({ client_id: cid, log_date: IST(w * 7), weight: +(p.start - (p.drop * (6 - w)) / 6).toFixed(1), waist: +(90 - (6 - w) * 0.5).toFixed(1) }))), "weights");
    const pics = await Promise.all(["breakfast", "lunch", "dinner"].map((f) => photo(a, origin, cid, f)));
    const rows = [];
    for (let d = 6; d >= 1; d--) for (const [i, m] of ["Breakfast", "Lunch", "Dinner"].entries()) {
      if ((d + i) % 5 === 0) continue;
      rows.push({ client_id: cid, nutritionist_id: P, plan_id: plan.id, log_date: IST(d), meal_name: m, photo_path: pics[i], status: (d + i) % 4 === 0 ? "off_plan" : "on_plan", reply: "Looks good 👍", reviewed_at: iso(d) });
    }
    must(await a.from("meal_logs").insert(rows), "meals");
    for (const [m, f, st] of p.today) {
      const planned = (p.tpl.meals.find((x: { name: string }) => x.name === m)?.items ?? []).join(", ");
      must(await a.from("meal_logs").insert({ client_id: cid, nutritionist_id: P, plan_id: plan.id, log_date: IST(0), meal_name: m, planned, photo_path: await photo(a, origin, cid, f), status: st, reply: st === "on_plan" ? "Perfect plate 👏" : st === "off_plan" ? "Too much rice, half next time." : null, reviewed_at: st === "pending" ? null : new Date().toISOString() }), "today");
    }
    must(await a.from("checkins").insert({ client_id: cid, nutritionist_id: P, energy: 4, hunger: 2, note: "Feeling lighter, sleeping better." }), "checkin");
    let t = Date.now() - 3 * 3600e3;
    for (const [who, body] of p.msgs) { t += 600e3; must(await a.from("messages").insert({ nutritionist_id: P, client_id: cid, sender_id: who === "n" ? P : cid, body, created_at: new Date(t).toISOString() }), "msg"); }
    // a paid consultation last week, so invoices and reports have data
    const st = new Date(Date.now() - (5 + people.indexOf(p)) * 864e5); st.setUTCHours(5, 0, 0, 0);
    const b = must(await a.from("bookings").insert({ nutritionist_id: P, client_id: cid, service_id: sv[0].id, service_name: "First consultation", starts_at: st.toISOString(), ends_at: new Date(st.getTime() + 45 * 60e3).toISOString(), status: "completed", amount: 999 }).select().single(), "booking");
    must(await a.from("payments").insert({ booking_id: b.id, nutritionist_id: P, client_id: cid, amount: 999, platform_fee: p.source === "search" ? 100 : 0, status: "paid", razorpay_order_id: "demo_" + b.id, razorpay_payment_id: "demo_pay_" + b.id.slice(0, 8), created_at: st.toISOString() }), "payment");
  }

  // ---------- Therapist: Aarti ----------
  const T = await user(a, DEMO.therapist.email, DEMO.therapist.name, "nutritionist", true);
  must(await a.from("nutritionists").upsert({ id: T, handle: "aarti-kapoor", city: "Mumbai", specialty: "psychology", session_minutes: 50, consent_text: DEFAULT_CONSENT, languages: ["English", "Hindi", "Marathi"], food_types: [], goals: ["anxiety", "depression", "stress", "work", "teens"], approaches: ["CBT", "Mindfulness", "ACT"], about: "Clinical psychologist. Anxiety, stress and low mood in adults and students. CBT and mindfulness.", qualification: "M.Phil. Clinical Psychology, RCI", experience_years: 9, plan: "growth", published: true }), "aarti");
  must(await a.from("availability").insert(windows.map((w) => ({ ...w, nutritionist_id: T }))), "avail2");
  const tsv = must(await a.from("services").insert([
    { nutritionist_id: T, name: "Free 15 min intro call", type: "call", details: "See if we are a good fit", price: 0 },
    { nutritionist_id: T, name: "Therapy session", type: "call", details: "50 min video session", price: 1200 },
  ]).select(), "tservices");
  const feelings = ["Anxious", "Tired", "Calm", "Hopeful", "Stressed", "Grateful", "Sad"];
  const tpeople = [
    { email: DEMO.tclient.email, name: DEMO.tclient.name, login: true, goal: "Low mood after job loss", moods: [2, 2, 3, 2, 3, 3, 3, 4, 3, 4, 4, 3, 4, 4], phq: [17, 14, 10], gad: [9, 8] },
    { email: "arjun@demo.connect.app", name: "Arjun Mehta", login: false, goal: "Exam stress", moods: [3, 3, 4, 3, 2, 3, 4, 4, 4, 5, 4, 4, 4, 5], phq: [8, 6], gad: [13, 10, 7] },
    { email: "kabir@demo.connect.app", name: "Kabir Shah", login: false, goal: "Anxiety at work", moods: [3, 3, 2, 3, 3, 4, 3, 3, 2, 3, 3, 3, 2, 2], phq: [15, 13], gad: [16, 14] },
  ];
  for (const p of tpeople) {
    const cid = await user(a, p.email, p.name, "client", p.login);
    must(await a.from("client_links").insert({ nutritionist_id: T, client_id: cid, status: "active", source: "own", program: "Weekly CBT sessions", goal: p.goal, consent_at: iso(30), started_at: IST(35) }), "tlink");
    must(await a.from("mood_logs").insert(p.moods.map((m, i) => ({ client_id: cid, log_date: IST(13 - i), mood: m, feelings: [feelings[i % 7], feelings[(i + 3) % 7]] }))), "moods");
    for (const [kind, scores] of [["phq9", p.phq], ["gad7", p.gad]] as const) {
      const n = kind === "phq9" ? 9 : 7;
      for (const [i, s] of scores.entries()) {
        const ans = Array(n).fill(0); let left = s;
        for (let j = 0; j < n && left > 0; j++) { if (kind === "phq9" && j === 8) continue; const v = Math.min(3, left); ans[j] = v; left -= v; }
        const risk = p.name === "Kabir Shah" && kind === "phq9" && i === scores.length - 1;
        if (risk) ans[8] = 1;
        must(await a.from("assessments").insert({ nutritionist_id: T, client_id: cid, kind, status: "done", answers: ans, score: s + (risk ? 1 : 0), risk, created_at: iso(28 - i * 12), done_at: iso(28 - i * 12) }), "assessment");
      }
    }
    must(await a.from("homework").insert([
      { nutritionist_id: T, client_id: cid, title: "Thought record", details: "Write one thought record each day this week.", due_date: IST(-3) },
      { nutritionist_id: T, client_id: cid, title: "4-7-8 breathing", details: "Twice a day, and whenever you feel anxious.", done_at: iso(1), client_reply: "Did it twice, helped before the meeting." },
    ]), "homework");
    must(await a.from("notes").insert({ nutritionist_id: T, client_id: cid, body: "Talked about: work worries, sleep.\nNoticed: calmer than last week.\nPlan: breathing practice daily." }), "note");
  }
  const nehaId = await idByEmail(a, DEMO.tclient.email);
  const neha = nehaId ? { id: nehaId } : null;
  if (neha) {
    must(await a.from("assessments").insert({ nutritionist_id: T, client_id: neha.id, kind: "gad7" }), "open checkup");
    const st = new Date(Date.now() - 7 * 864e5); st.setUTCHours(6, 0, 0, 0);
    const b = must(await a.from("bookings").insert({ nutritionist_id: T, client_id: neha.id, service_id: tsv[1].id, service_name: "Therapy session", starts_at: st.toISOString(), ends_at: new Date(st.getTime() + 50 * 60e3).toISOString(), status: "completed", amount: 1200 }).select().single(), "tbooking");
    must(await a.from("payments").insert({ booking_id: b.id, nutritionist_id: T, client_id: neha.id, amount: 1200, status: "paid", razorpay_order_id: "demo_" + b.id, razorpay_payment_id: "demo_pay_" + b.id.slice(0, 8), created_at: st.toISOString() }), "tpayment");
  }
  await refreshToday(a, origin, P);
}

/** Keeps the demo looking alive: an upcoming session and today's meal photos. */
async function refreshToday(a: SupabaseClient, origin: string, P: string) {
  const rid = await idByEmail(a, DEMO.client.email), nid = await idByEmail(a, DEMO.tclient.email);
  const rahul = rid ? { id: rid } : null, neha = nid ? { id: nid } : null;
  const { data: T } = await a.from("nutritionists").select("id").eq("handle", "aarti-kapoor").maybeSingle();
  // next 11:00 India time that is still ahead
  const soon = new Date(); soon.setUTCHours(5, 30, 0, 0);
  if (soon.getTime() < Date.now() + 30 * 60e3) soon.setUTCDate(soon.getUTCDate() + 1);
  const upcoming = async (n: string, c: string, name: string, amount: number, mins: number) => {
    const { count } = await a.from("bookings").select("id", { count: "exact", head: true }).eq("nutritionist_id", n).eq("status", "confirmed").gt("starts_at", new Date().toISOString());
    if (count) return;
    await a.from("bookings").insert({ nutritionist_id: n, client_id: c, service_name: name, starts_at: soon.toISOString(), ends_at: new Date(soon.getTime() + mins * 60e3).toISOString(), status: "confirmed", amount });
  };
  if (rahul) await upcoming(P, rahul.id, "Follow-up consultation", 999, 45);
  if (T && neha) await upcoming(T.id, neha.id, "Therapy session", 1200, 50);
  // fresh meal photos waiting for review today
  const { count } = await a.from("meal_logs").select("id", { count: "exact", head: true }).eq("nutritionist_id", P).eq("log_date", IST(0));
  if (count) return;
  const { data: links } = await a.from("client_links").select("client_id").eq("nutritionist_id", P).eq("status", "active").limit(3);
  for (const [i, l] of (links ?? []).entries()) {
    const { data: plan } = await a.from("diet_plans").select("id, meals").eq("client_id", l.client_id).eq("nutritionist_id", P).limit(1).maybeSingle();
    const meal = i % 2 ? "Lunch" : "Breakfast";
    const planned = ((plan?.meals ?? []) as { name: string; items: string[] }[]).find((x) => x.name === meal)?.items.join(", ") ?? null;
    await a.from("meal_logs").insert({ client_id: l.client_id, nutritionist_id: P, plan_id: plan?.id ?? null, log_date: IST(0), meal_name: meal, planned, photo_path: await photo(a, origin, l.client_id, ["poha", "lunch", "breakfast"][i]), status: "pending" });
  }
}
