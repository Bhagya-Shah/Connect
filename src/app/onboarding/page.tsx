import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import Onboarding from "./Onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const sp = await searchParams;
  if (profile?.role === "nutritionist") redirect("/pro");
  if (profile?.role === "client") redirect(sp.next || "/me");
  return <Shell><Onboarding next={sp.next} initial={sp.as === "nutritionist" ? "nutritionist" : undefined} /></Shell>;
}
