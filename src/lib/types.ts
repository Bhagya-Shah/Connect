import type { Meal, PlanId } from "./constants";

export type Nutritionist = {
  id: string; handle: string; city: string | null; mode: string | null; languages: string[]; food_types: string[]; goals: string[];
  about: string | null; qualification: string | null; experience_years: number | null; meet_url: string | null;
  session_minutes: number; chat_start: string | null; chat_end: string | null; plan: PlanId; published: boolean;
  razorpay_account_id: string | null; specialty: "nutrition" | "psychology"; approaches: string[]; consent_text: string | null;
};
export type Service = { id: string; nutritionist_id: string; name: string; type: string; details: string | null; price: number; active: boolean; capacity?: number | null };
export type DietPlan = { id: string; nutritionist_id: string | null; client_id: string | null; name: string; tag: string | null; kcal: number | null; meals: Meal[]; active: boolean; updated_at: string };
export type MealLog = { id: string; client_id: string; nutritionist_id: string; log_date: string; meal_name: string; planned: string | null; photo_path: string | null; note: string | null; status: "pending" | "on_plan" | "off_plan"; reply: string | null; created_at: string };
export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
