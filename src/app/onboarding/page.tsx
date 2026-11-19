import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import Onboarding from "./Onboarding";

export default async function OnboardingPage() {
  const { user, profile, me } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role === "nutritionist" && me) redirect("/pro");
  if (profile?.role === "client") redirect("/me");
  const meta = user.user_metadata as { full_name?: string; name?: string };
  return <Shell><Onboarding name={profile?.full_name || meta.full_name || meta.name || ""} email={user.email ?? ""} /></Shell>;
}
