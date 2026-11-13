"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  return <button className="py-2 text-sm font-semibold text-muted" onClick={async () => { await createClient().auth.signOut(); router.replace("/"); router.refresh(); }}>Log out</button>;
}
