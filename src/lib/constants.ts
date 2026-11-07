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

export const goalName = (id: string) => GOALS.find((g) => g.id === id)?.name ?? id;

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
  grid: boolean; packages: boolean; groups: boolean; featured: boolean; team: number; blurb: string; features: string[];
}> = {
  starter: { name: "Starter", price: 0, clients: 5, fee: 0.05, templates: false, chat: false, grid: false, packages: false, groups: false, featured: false, team: 1,
    blurb: "For trying Connect", features: ["Up to 5 active clients", "Profile, booking link and calendar", "UPI and card payments (5% fee)", "Daily meal photos with basic review", "One simple diet plan per client", "Weight tracking"] },
  growth: { name: "Growth", price: 499, clients: 30, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: false, featured: false, team: 1,
    blurb: "For most nutritionists", features: ["Up to 30 active clients", "0% payment fee, GST invoices", "Full photo feed with quick replies", "Weekly photo grid, missing-photo list", "Diet plan templates", "Progress and weekly check-ins", "Chat with clients", "Packages and monthly plans"] },
  pro: { name: "Pro", price: 999, clients: null, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: true, featured: true, team: 1,
    blurb: "For busy practices", features: ["Unlimited clients", "Everything in Growth", "Group classes", "Featured higher in search", "Full earnings reports"] },
  clinic: { name: "Clinic", price: 2499, clients: null, fee: 0, templates: true, chat: true, grid: true, packages: true, groups: true, featured: true, team: 5,
    blurb: "For clinics and teams", features: ["Everything in Pro", "Up to 5 team members", "Your own logo and web address", "Priority support"] },
};
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
