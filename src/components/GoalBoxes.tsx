import Link from "next/link";
import { CONCERNS, GOALS } from "@/lib/constants";
import { TINT_LIST } from "./ui";

export function GoalBoxes({ base = "/discover", field = "nutrition" }: { base?: string; field?: "nutrition" | "psychology" }) {
  const items = field === "psychology" ? CONCERNS : GOALS;
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((g, i) => (
        <Link key={g.id} href={`${base}?goal=${g.id}`} className="flex min-h-[84px] flex-col gap-1 rounded-2xl p-3" style={{ background: TINT_LIST[(i + (field === "psychology" ? 3 : 0)) % 6] }}>
          <span className="font-display text-sm font-semibold leading-tight">{g.name}</span>
          <span className="mt-auto text-xs text-muted">{g.line}</span>
        </Link>
      ))}
    </div>
  );
}
