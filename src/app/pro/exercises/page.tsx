import { redirect } from "next/navigation";
import { requireNutritionist } from "@/lib/auth";
import { CHECKUPS, EXERCISES, PLANS, type CheckupKind } from "@/lib/constants";
import { TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";

export default async function ExercisesPage() {
  const { me } = await requireNutritionist();
  if (me.specialty !== "psychology") redirect("/pro/plans");
  const tools = PLANS[me.plan as keyof typeof PLANS].tools;
  return (
    <>
      <TopBar title="Exercises" />
      <Body>
        <p className="text-sm text-muted">Ready-made homework you can send from a client&apos;s Homework tab, or write your own there.{tools ? "" : " Homework comes with the Growth plan."}</p>
        {EXERCISES.map((e) => (
          <section key={e.id} className="card"><b>{e.title}</b><span className="text-sm text-muted">{e.details}</span></section>
        ))}
        <h2 className="h3 mt-2">Check-ups</h2>
        {(Object.keys(CHECKUPS) as CheckupKind[]).map((k) => (
          <details key={k} className="card">
            <summary className="cursor-pointer"><b>{CHECKUPS[k].name}</b> <span className="text-sm text-muted">{CHECKUPS[k].about}, {CHECKUPS[k].questions.length} questions, score 0 to {CHECKUPS[k].max}</span></summary>
            <ol className="list-decimal pl-5 text-sm">{CHECKUPS[k].questions.map((q) => <li key={q}>{q}</li>)}</ol>
            <span className="text-xs text-muted">Bands: {CHECKUPS[k].bands.map(([min, l]) => `${l} ${min}+`).join(", ")}. Screening tools, not a diagnosis.</span>
          </details>
        ))}
      </Body>
    </>
  );
}
