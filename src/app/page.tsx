import Link from "next/link";
import { Logo } from "@/components/Shell";

const FEATURES = [
  ["Client database", "Every client's goal, weight, notes, files and history in one place. Search in a second."],
  ["Logins in one tap", "Add a client and send their login on WhatsApp. They log in with their mobile number."],
  ["Diet plans and reports", "Upload PDF plans, build meal plans, and get blood reports from clients."],
  ["Google Meet sessions", "Schedule a session and both of you get a Join button and a calendar link."],
  ["Daily meal photos", "Clients snap each meal. You mark it on plan or off plan and reply."],
  ["Progress and chat", "Weight charts, weekly check-ins and chat, without mixing it into WhatsApp."],
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-surface-2">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <Link href="/go" className="btn-ghost btn-sm">Open app</Link>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-6 md:pt-14">
        <section className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-3xl font-semibold leading-tight md:text-5xl">Run your nutrition practice from one app</h1>
          <p className="text-lg text-muted">Your clients, their diet plans, reports, meal photos and Google Meet sessions. Fast on any phone or laptop.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="btn">Nutritionist sign in</Link>
            <Link href="/login?as=client" className="btn-ghost">Client login</Link>
          </div>
          <Link href="/demo/pro" className="text-sm font-semibold text-accent">Or try the demo, no sign-up →</Link>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => <div key={t} className="card"><h2 className="h3">{t}</h2><p className="text-sm text-muted">{d}</p></div>)}
        </section>
      </main>
    </div>
  );
}
