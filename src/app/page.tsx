import Link from "next/link";
import { Shell } from "@/components/Shell";
import { GoalBoxes } from "@/components/GoalBoxes";

export default function Home() {
  return (
    <Shell>
      <header className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 font-display text-xl font-bold"><span className="h-3 w-3 rounded-full bg-accent shadow-[8px_0_0_var(--saffron)]" />&nbsp;&nbsp;Connect</span>
        <Link href="/login" className="btn-ghost btn-sm">Log in</Link>
      </header>
      <main className="flex flex-col gap-4 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold leading-tight">Find the right nutritionist for your goal</h1>
          <p className="text-muted">Verified experts who plan around the food you eat at home. Share meal photos, follow your plan, and see your progress in one app.</p>
        </section>
        <h2 className="h3">What do you need help with?</h2>
        <GoalBoxes />
        <Link href="/discover" className="btn">See all nutritionists</Link>
        <section className="card mt-2 border-transparent bg-accent-soft">
          <h2 className="h3">Are you a nutritionist?</h2>
          <p className="text-sm">Bookings, payments, diet plans, daily meal photos and client progress in one place. Free for up to 5 clients.</p>
          <Link href="/login?next=%2Fonboarding%3Fas%3Dnutritionist" className="btn btn-sm self-start">Start free</Link>
        </section>
      </main>
    </Shell>
  );
}
