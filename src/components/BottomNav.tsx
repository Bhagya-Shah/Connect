"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icons; exact?: boolean };

const isOn = (path: string, it: NavItem) => (it.exact ? path === it.href : path.startsWith(it.href));

/** Bottom tabs on phones. With `side`, a left sidebar takes over on wide screens. */
export function BottomNav({ items, side = false }: { items: NavItem[]; side?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="App sections" className={`sticky bottom-0 z-10 flex border-t border-line bg-surface px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 ${side ? "md:hidden" : ""}`}>
      {items.map((it) => {
        const on = isOn(path, it);
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${on ? "text-accent" : "text-muted"}`}>
            {Icons[it.icon]}{it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav({ items, footer }: { items: NavItem[]; footer?: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav aria-label="App sections" className="hidden w-56 flex-none flex-col gap-1 border-r border-line bg-surface p-3 md:flex">
      {items.map((it) => {
        const on = isOn(path, it);
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${on ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2"}`}>
            {Icons[it.icon]}{it.label}
          </Link>
        );
      })}
      <div className="mt-auto">{footer}</div>
    </nav>
  );
}
