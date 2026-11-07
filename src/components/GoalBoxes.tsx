import Link from "next/link";
import { GOALS } from "@/lib/constants";
import { TINT_LIST } from "./ui";

export function GoalBoxes({ base = "/discover" }: { base?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {GOALS.map((g, i) => (
        <Link key={g.id} href={`${base}?goal=${g.id}`} className="flex min-h-[84px] flex-col gap-1 rounded-2xl p-3" style={{ background: TINT_LIST[i % 6] }}>
          <span className="font-display text-sm font-semibold leading-tight">{g.name}</span>
          <span className="mt-auto text-xs text-muted">{g.line}</span>
        </Link>
      ))}
    </div>
  );
}
