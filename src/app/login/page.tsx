import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { Shell } from "@/components/Shell";

export const metadata = { title: "Log in · Connect" };

export default function LoginPage() {
  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-5 p-6">
        <div className="flex items-center gap-2 font-display text-2xl font-bold"><span className="h-3.5 w-3.5 rounded-full bg-accent shadow-[10px_0_0_var(--saffron)]" />&nbsp;&nbsp;Connect</div>
        <Suspense><LoginForm /></Suspense>
      </main>
    </Shell>
  );
}
