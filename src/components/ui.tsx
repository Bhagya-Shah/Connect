import Link from "next/link";

const TINTS = ["var(--t1)", "var(--t2)", "var(--t3)", "var(--t4)", "var(--t5)", "var(--t6)"];
export const tint = (s: string) => TINTS[[...(s || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
export const TINT_LIST = TINTS;

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const n = name || "?";
  const ini = n.replace(/^Dr\.?\s/, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="grid flex-none place-items-center rounded-xl font-display font-semibold text-ink"
      style={{ width: size, height: size, background: tint(n), fontSize: size * 0.36 }}>{ini}</span>
  );
}

const PILL = { good: "bg-good-soft text-good", warn: "bg-saffron-soft text-warn", blue: "bg-accent-soft text-accent", bad: "bg-bad-soft text-bad", grey: "bg-surface-2 text-muted" };
export function Pill({ tone = "blue", children }: { tone?: keyof typeof PILL; children: React.ReactNode }) {
  return <span className={`pill ${PILL[tone]}`}>{children}</span>;
}

export function TopBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-[60px] items-center gap-2.5 border-b border-line bg-surface px-4 py-3">
      {back && <Link href={back} aria-label="Back" className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-surface-2 text-xl">‹</Link>}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="card items-center text-center"><span className="font-semibold">{title}</span>{children && <span className="text-sm text-muted">{children}</span>}</div>;
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className="text-right">{children}</span></div>;
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-surface p-2.5"><span className="text-xs text-muted">{label}</span><b className="block font-display text-lg tabular-nums">{value}</b></div>;
}

/** Small line chart for weight and similar values. */
export function LineChart({ data, unit, goal }: { data: number[]; unit: string; goal?: number | null }) {
  if (data.length < 2) return <p className="text-sm text-muted">Log at least 2 entries to see a chart.</p>;
  const W = 320, H = 120, p = 16, vals = goal ? [...data, goal] : data, min = Math.min(...vals) - 1.5, max = Math.max(...vals) + 1.5, r = max - min || 1;
  const x = (i: number) => p + (i * (W - 2 * p)) / (data.length - 1), y = (v: number) => H - 22 - ((v - min) / r) * (H - 36);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "), last = data.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-[120px] w-full" role="img" aria-label={`Chart, latest ${data[last]} ${unit}`}>
      <polygon points={`${p},${H - 22} ${pts} ${x(last)},${H - 22}`} fill="var(--accent-soft)" />
      {goal ? <><line x1={p} x2={W - p} y1={y(goal)} y2={y(goal)} stroke="var(--good)" strokeDasharray="4 4" /><text x={p + 4} y={y(goal) - 5} fontSize="11" fill="var(--good)">Goal {goal}</text></> : null}
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(data[last])} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      <text x={p} y={H - 5} fontSize="11" fill="var(--muted)">{data.length} entries</text>
      <text x={W - p} y={H - 5} fontSize="11" fill="var(--muted)" textAnchor="end">Now {data[last]} {unit}</text>
    </svg>
  );
}

export function FoodTile({ label, url, size = 64 }: { label: string; url?: string | null; size?: number | "full" }) {
  const full = size === "full";
  const style = full ? { background: tint(label) } : { width: size, height: size, background: tint(label) };
  return (
    <span className={`relative grid flex-none place-items-center overflow-hidden ${full ? "aspect-[4/3] w-full rounded-2xl" : "rounded-xl"}`} style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Meal photo: ${label}`} className="h-full w-full object-cover" />
      ) : (
        <span className="grid aspect-square w-[72%] place-items-center overflow-hidden rounded-full border-[3px] border-white/60 bg-surface p-1 text-center text-[10.5px] font-semibold leading-tight">
          {label.split(/[,(]/)[0].split(" ").slice(0, 3).join(" ")}
        </span>
      )}
    </span>
  );
}
