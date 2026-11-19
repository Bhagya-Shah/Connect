import type { Meal } from "./constants";

export type Nutritionist = {
  id: string; practice_name: string | null; city: string | null; qualification: string | null;
  meet_url: string | null; session_minutes: number; chat_start: string | null; chat_end: string | null;
};
export type DietPlan = { id: string; nutritionist_id: string | null; client_id: string | null; name: string; tag: string | null; kcal: number | null; meals: Meal[]; active: boolean; updated_at: string };
export type MealLog = { id: string; client_id: string; nutritionist_id: string; log_date: string; meal_name: string; planned: string | null; photo_path: string | null; note: string | null; status: "pending" | "on_plan" | "off_plan"; reply: string | null; created_at: string };
export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type ClientFile = { id: string; nutritionist_id: string; client_id: string; uploaded_by: string; name: string; path: string; size: number; mime: string | null; kind: string; note: string | null; created_at: string };
export type Session = { id: string; nutritionist_id: string; client_id: string; service_name: string; starts_at: string; ends_at: string; status: string; meet_url: string | null; notes: string | null };
