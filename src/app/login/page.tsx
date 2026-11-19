import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { Logo, Shell } from "@/components/Shell";

export const metadata = { title: "Log in · Connect" };

export default function LoginPage() {
  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-5 p-6">
        <Logo size="text-2xl" />
        <Suspense><LoginForm /></Suspense>
      </main>
    </Shell>
  );
}
