import { BottomNav, SideNav, type NavItem } from "@/components/BottomNav";
import { Logo } from "@/components/Shell";
import { requireNutritionist } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/pro", label: "Home", icon: "home", exact: true },
  { href: "/pro/clients", label: "Clients", icon: "users" },
  { href: "/pro/sessions", label: "Sessions", icon: "cal" },
  { href: "/pro/photos", label: "Meal photos", icon: "cam" },
  { href: "/pro/more", label: "More", icon: "more" },
];
const SIDE: NavItem[] = [
  ...NAV.slice(0, 4),
  { href: "/pro/plans", label: "Diet plans", icon: "plan" },
  { href: "/pro/more", label: "Settings", icon: "gear" },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { profile, me } = await requireNutritionist();
  return (
    <div className="flex min-h-dvh bg-surface-2">
      <SideNav items={SIDE} footer={<div className="border-t border-line px-3 pt-3 text-xs text-muted"><b className="block text-sm text-ink">{profile.full_name}</b>{me.practice_name}</div>} />
      <div className="mx-auto flex min-w-0 max-w-md flex-1 flex-col md:max-w-none">
        <div className="hidden border-b border-line bg-surface px-6 py-3 md:block"><Logo size="text-lg" /></div>
        <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-5xl">{children}</div>
        <BottomNav items={NAV} side />
      </div>
    </div>
  );
}
