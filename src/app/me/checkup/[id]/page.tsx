import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { CHECKUPS, type CheckupKind } from "@/lib/constants";
import { TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { CheckupForm } from "../../MindForms";

export default async function CheckupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireClient();
  const { data: a } = await supabase.from("assessments").select("id, kind, status").eq("id", id).eq("client_id", user.id).maybeSingle();
  if (!a) notFound();
  const C = CHECKUPS[a.kind as CheckupKind];
  return (
    <>
      <TopBar title={`${C.about} (${C.name})`} back="/me" />
      <Body>
        {a.status === "done" ? <p className="card">You&apos;ve already sent this check-up. Thank you.</p> : <CheckupForm id={a.id} kind={a.kind as CheckupKind} />}
      </Body>
    </>
  );
}
