import { BottomNav, type NavItem } from "@/components/BottomNav";
import { Shell } from "@/components/Shell";
import { requireNutritionist } from "@/lib/auth";

const NUTRITION: NavItem[] = [
  { href: "/pro", label: "Home", icon: "home", exact: true },
  { href: "/pro/photos", label: "Meal photos", icon: "cam" },
  { href: "/pro/clients", label: "Clients", icon: "users" },
  { href: "/pro/plans", label: "Plans", icon: "plan" },
  { href: "/pro/business", label: "Business", icon: "more" },
];
const PSYCHOLOGY: NavItem[] = [
  { href: "/pro", label: "Home", icon: "home", exact: true },
  { href: "/pro/clients", label: "Clients", icon: "users" },
  { href: "/pro/exercises", label: "Exercises", icon: "book" },
  { href: "/pro/business", label: "Business", icon: "more" },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireNutritionist();
  return (
    <Shell>
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav items={me.specialty === "psychology" ? PSYCHOLOGY : NUTRITION} />
    </Shell>
  );
}
