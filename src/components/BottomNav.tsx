"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icons; exact?: boolean };

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="App sections" className="sticky bottom-0 z-10 flex border-t border-line bg-surface px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
      {items.map((it) => {
        const on = it.exact ? path === it.href : path.startsWith(it.href);
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
