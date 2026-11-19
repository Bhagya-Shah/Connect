export const GOALS = [
  { id: "weight-loss", name: "Weight loss" },
  { id: "weight-gain", name: "Weight gain" },
  { id: "pcos", name: "PCOS and PCOD" },
  { id: "diabetes", name: "Diabetes" },
  { id: "thyroid", name: "Thyroid" },
  { id: "pregnancy", name: "Pregnancy and new moms" },
  { id: "kids", name: "Kids nutrition" },
  { id: "gym", name: "Sports and gym" },
  { id: "heart", name: "Heart and cholesterol" },
  { id: "gut", name: "Gut health" },
  { id: "skin", name: "Skin and hair" },
  { id: "senior", name: "Senior nutrition" },
] as const;
export const goalName = (id: string) => GOALS.find((g) => g.id === id)?.name ?? id;

export const FOOD_TYPES = ["Veg", "Jain", "Eggetarian", "Non-veg", "Vegan"];

export const FILE_KINDS = {
  diet_plan: "Diet plan",
  report: "Report",
  prescription: "Prescription",
  other: "Other",
} as const;
export type FileKind = keyof typeof FILE_KINDS;
export const MAX_FILE_MB = 20;
export const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt";

export const MEAL_SLOTS = ["Early morning", "Breakfast", "Mid-morning", "Lunch", "Evening", "Dinner"];

export const rs = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const IST = "Asia/Kolkata";
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });
export const fmtDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: IST, ...opts });
export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export type Meal = { name: string; time: string; items: string[] };

/** Indian mobile numbers: keep the last 10 digits. */
export const cleanPhone = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};
/** Clients who log in with a phone number get this stand-in email inside Supabase. */
export const PHONE_EMAIL_DOMAIN = "phone.connect.app";
export const phoneEmail = (phone: string) => `${cleanPhone(phone)}@${PHONE_EMAIL_DOMAIN}`;
/** What the client types to log in: their email, or their phone if they have no email. */
export const loginEmail = (id: string) => (id.includes("@") ? id.trim().toLowerCase() : phoneEmail(id));
