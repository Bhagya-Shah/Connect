export const GOALS = [
  { id: "weight-loss", name: "Weight loss", line: "8 to 12 weeks" },
  { id: "weight-gain", name: "Weight gain", line: "8 weeks" },
  { id: "pcos", name: "PCOS and PCOD", line: "3 months" },
  { id: "diabetes", name: "Diabetes", line: "3 months" },
  { id: "thyroid", name: "Thyroid", line: "3 months" },
  { id: "pregnancy", name: "Pregnancy and new moms", line: "Each trimester" },
  { id: "kids", name: "Kids nutrition", line: "4 weeks" },
  { id: "gym", name: "Sports and gym", line: "Monthly" },
  { id: "heart", name: "Heart and cholesterol", line: "3 months" },
  { id: "gut", name: "Gut health", line: "6 weeks" },
  { id: "skin", name: "Skin and hair", line: "6 weeks" },
  { id: "senior", name: "Senior nutrition", line: "Monthly" },
] as const;

/** What people come to a psychologist or counsellor for. Stored in the same `goals` column. */
export const CONCERNS = [
  { id: "anxiety", name: "Anxiety and panic", line: "Weekly sessions" },
  { id: "depression", name: "Low mood and depression", line: "Weekly sessions" },
  { id: "stress", name: "Stress and burnout", line: "6 to 8 weeks" },
  { id: "relationships", name: "Relationships", line: "Weekly sessions" },
  { id: "couples", name: "Couples therapy", line: "Every 2 weeks" },
  { id: "grief", name: "Grief and loss", line: "Weekly sessions" },
  { id: "trauma", name: "Trauma", line: "Long term" },
  { id: "sleep", name: "Sleep problems", line: "6 weeks" },
  { id: "self-esteem", name: "Self-esteem", line: "8 weeks" },
  { id: "anger", name: "Anger", line: "8 weeks" },
  { id: "teens", name: "Teens and students", line: "Exam stress, peers" },
  { id: "work", name: "Work and career stress", line: "6 weeks" },
] as const;

export const goalName = (id: string) => [...GOALS, ...CONCERNS].find((g) => g.id === id)?.name ?? id;

export type Specialty = "nutrition" | "psychology";
export const SPECIALTIES: Record<Specialty, { pro: string; pros: string; topic: string; topics: string; field: string }> = {
  nutrition: { pro: "Nutritionist", pros: "nutritionists", topic: "goal", topics: "Goals you help with", field: "Nutrition" },
  psychology: { pro: "Psychologist", pros: "therapists", topic: "concern", topics: "What you help with", field: "Mental health" },
};
export const proWord = (s?: string | null) => (s === "psychology" ? "therapist" : "nutritionist");

export const APPROACHES = ["CBT", "DBT", "ACT", "Mindfulness", "Psychodynamic", "Person-centred", "EMDR", "Solution-focused", "Family therapy", "Art therapy"];

export const MOODS = [
  { v: 1, label: "Very low", face: "😞" },
  { v: 2, label: "Low", face: "🙁" },
  { v: 3, label: "Okay", face: "😐" },
  { v: 4, label: "Good", face: "🙂" },
  { v: 5, label: "Great", face: "😄" },
] as const;
export const FEELINGS = ["Calm", "Happy", "Grateful", "Hopeful", "Anxious", "Sad", "Stressed", "Angry", "Tired", "Lonely", "Overwhelmed", "Numb"];

/** Exercise library therapists can send as homework. */
export const EXERCISES = [
  { id: "thought-record", title: "Thought record", details: "When you notice a strong feeling, write: what happened, the thought that came up, how strongly you believed it (0-100%), the evidence for and against it, and a more balanced thought." },
  { id: "breathing", title: "4-7-8 breathing", details: "Twice a day and when anxious: breathe in through your nose for 4, hold for 7, breathe out slowly through your mouth for 8. Repeat 4 times." },
  { id: "grounding", title: "5-4-3-2-1 grounding", details: "When panic starts, name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell and 1 you can taste." },
  { id: "gratitude", title: "Three good things", details: "Each night, write three things that went well today and why they happened." },
  { id: "activity", title: "Plan one enjoyable activity a day", details: "Pick one small thing you used to enjoy (a walk, music, calling a friend). Schedule it, do it, and rate your mood before and after (1-10)." },
  { id: "worry-time", title: "Worry time", details: "Keep a 15-minute worry slot at the same time each day. When a worry comes up outside it, note it down and save it for worry time." },
  { id: "sleep", title: "Sleep routine", details: "Same wake-up time every day, no screens 30 minutes before bed, bed only for sleep. Note what time you slept and woke." },
  { id: "values", title: "What matters to me", details: "Write down 3 things that matter most to you (family, health, learning…). For each, one small action you can take this week." },
] as const;

const FREQ = ["Not at all", "Several days", "More than half the days", "Nearly every day"];
/** Standard screening questionnaires (public domain). Over the last 2 weeks, 0-3 each. */
export const CHECKUPS = {
  phq9: {
    name: "PHQ-9", about: "Mood check-up", options: FREQ,
    questions: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Poor appetite or overeating",
      "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading the newspaper or watching television",
      "Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual",
      "Thoughts that you would be better off dead, or of hurting yourself in some way",
    ],
    bands: [[0, "Minimal"], [5, "Mild"], [10, "Moderate"], [15, "Moderately severe"], [20, "Severe"]] as [number, string][],
    max: 27,
  },
  gad7: {
    name: "GAD-7", about: "Anxiety check-up", options: FREQ,
    questions: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it is hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid, as if something awful might happen",
    ],
    bands: [[0, "Minimal"], [5, "Mild"], [10, "Moderate"], [15, "Severe"]] as [number, string][],
    max: 21,
  },
} as const;
export type CheckupKind = keyof typeof CHECKUPS;
export const band = (kind: CheckupKind, score: number) => [...CHECKUPS[kind].bands].reverse().find(([min]) => score >= min)![1];

export const DEFAULT_CONSENT = `Before we start, please read and agree:
• What you share in sessions is confidential. I will not share it without your written permission, unless the law requires it or there is a serious risk to your safety or someone else's.
• Sessions are about 50 minutes on video inside Connect. Please join from a private place.
• To cancel or move a session, give at least 24 hours' notice.
• Check-ups (PHQ-9, GAD-7) help us track how you are doing. They are not a diagnosis.
• Connect is not an emergency service. If you are in crisis, call Tele-MANAS on 14416 or 112.`;

/** Free crisis lines in India. Shown to every client of a therapist. */
export const CRISIS_LINES = [
  { name: "Tele-MANAS (Govt. of India, 24x7, free)", number: "14416" },
  { name: "Tele-MANAS toll free", number: "1-800-891-4416" },
  { name: "Emergency (police, ambulance)", number: "112" },
];

export const LANGUAGES = ["Gujarati", "Hindi", "English", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Punjabi", "Urdu"];
export const FOOD_TYPES = ["Veg", "Jain", "Eggetarian", "Non-veg", "Vegan"];
export const CONDITIONS = ["PCOS / PCOD", "Thyroid", "Diabetes", "High BP", "High cholesterol", "None"];

export const SERVICE_TYPES = {
  call: "One call",
  package: "Package",
  monthly: "Monthly",
  question: "Quick question",
  group: "Group class",
} as const;
export type ServiceType = keyof typeof SERVICE_TYPES;

export type PlanId = "starter" | "growth" | "pro" | "clinic";
export const PLANS: Record<PlanId, {
  name: string; price: number; clients: number | null; fee: number; templates: boolean; chat: boolean;
  grid: boolean; packages: boolean; groups: boolean; featured: boolean; team: number; blurb: string; features: string[]; tools: boolean; invoices: boolean; reports: boolean;
}> = {
  starter: { name: "Starter", price: 0, clients: 5, fee: 0.05, templates: false, chat: false, grid: false, packages: false, groups: false, featured: false, team: 1, tools: false, invoices: false, reports: false,
    blurb: "For trying Connect", features: ["Up to 5 active clients", "Profile, booking link and calendar", "UPI and card payments (5% fee)", "Daily meal photos with basic review", "One simple diet plan per client", "Weight tracking"] },
  growth: { name: "Growth", price: 499, clients: 30, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: false, featured: false, team: 1, tools: true, invoices: true, reports: false,
    blurb: "For most nutritionists", features: ["Up to 30 active clients", "0% payment fee, GST invoices", "Full photo feed with quick replies", "Weekly photo grid, missing-photo list", "Diet plan templates", "Progress and weekly check-ins", "Chat with clients", "Packages and monthly plans"] },
  pro: { name: "Pro", price: 999, clients: null, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: true, featured: true, team: 1, tools: true, invoices: true, reports: true,
    blurb: "For busy practices", features: ["Unlimited clients", "Everything in Growth", "Group classes with seats and a shared video room", "Featured higher in search", "Earnings reports and CSV download"] },
  clinic: { name: "Clinic", price: 2499, clients: null, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: true, featured: true, team: 5, tools: true, invoices: true, reports: true,
    blurb: "For clinics and teams", features: ["Everything in Pro", "Up to 5 team members", "Team dashboard: clients and earnings per member", "Clinic page with your logo and colours", "Your own web address (set up with support)", "Priority support"] },
};
/** Same prices for every specialist; what each plan includes is described per field. */
export const PSY_PLAN_TEXT: Record<PlanId, { blurb: string; features: string[] }> = {
  starter: { blurb: "For trying Connect", features: ["Up to 5 active clients", "Profile, booking link and calendar", "Video sessions inside the app", "UPI and card payments (5% fee)", "Private session notes", "Daily mood check-ins and low-mood alerts", "Consent form before the first session"] },
  growth: { blurb: "For most therapists", features: ["Up to 30 active clients", "0% payment fee, GST invoices", "PHQ-9 and GAD-7 check-ups with score charts", "Risk alerts from check-ups", "Homework and exercise library", "Client journal (when they share it)", "Chat with clients", "Session packages"] },
  pro: { blurb: "For full caseloads", features: ["Unlimited clients", "Everything in Growth", "Support groups with seats and a shared video room", "Featured higher in search", "Earnings reports and CSV download"] },
  clinic: { blurb: "For clinics and teams", features: ["Everything in Pro", "Up to 5 therapists", "Team dashboard: clients and earnings per member", "Clinic page with your logo and colours", "Your own web address (set up with support)", "Priority support"] },
};
export const planText = (p: PlanId, specialty?: string | null) => specialty === "psychology" ? PSY_PLAN_TEXT[p] : PLANS[p];

/** Commission on clients who found the nutritionist through Connect search. */
export const SEARCH_COMMISSION = 0.1;

export const MEAL_SLOTS = ["Early morning", "Breakfast", "Mid-morning", "Lunch", "Evening", "Dinner"];

export const rs = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const IST = "Asia/Kolkata";
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });
export const fmtDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: IST, ...opts });
export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });

export type Meal = { name: string; time: string; items: string[] };
