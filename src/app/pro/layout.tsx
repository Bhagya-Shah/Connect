import { BottomNav } from "@/components/BottomNav";
import { Shell } from "@/components/Shell";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav items={[
        { href: "/pro", label: "Home", icon: "home", exact: true },
        { href: "/pro/photos", label: "Meal photos", icon: "cam" },
        { href: "/pro/clients", label: "Clients", icon: "users" },
        { href: "/pro/plans", label: "Plans", icon: "plan" },
        { href: "/pro/business", label: "Business", icon: "more" },
      ]} />
    </Shell>
  );
}
