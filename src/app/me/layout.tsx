import { BottomNav } from "@/components/BottomNav";
import { Shell } from "@/components/Shell";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav items={[
        { href: "/me", label: "Today", icon: "cam", exact: true },
        { href: "/me/progress", label: "Progress", icon: "chart" },
        { href: "/me/chat", label: "Chat", icon: "chat" },
        { href: "/discover", label: "Find", icon: "search" },
        { href: "/me/account", label: "Me", icon: "me" },
      ]} />
    </Shell>
  );
}
