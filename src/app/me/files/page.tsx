import { getMyNutritionist, requireClient } from "@/lib/auth";
import { fileUrls } from "@/lib/photos";
import { Empty, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { FileList } from "@/components/FileList";
import { FileUpload } from "@/components/FileUpload";
import type { ClientFile } from "@/lib/types";
import { deleteMyFile } from "../actions";

export const metadata = { title: "Files · Connect" };

export default async function Files() {
  const { supabase, user } = await requireClient();
  const n = await getMyNutritionist();
  if (!n) return <><TopBar title="Files" /><Body><Empty title="No files yet" /></Body></>;
  const { data: files } = await supabase.from("client_files").select("*").eq("client_id", user.id).eq("nutritionist_id", n.id).order("created_at", { ascending: false });
  const urls = await fileUrls(supabase, (files ?? []).map((f) => f.path));
  const nFirst = n.name.split(" ")[0];
  const fromThem = (files ?? []).filter((f) => f.uploaded_by !== user.id) as ClientFile[];
  const mine = (files ?? []).filter((f) => f.uploaded_by === user.id) as ClientFile[];
  return (
    <>
      <TopBar title="Files" />
      <Body>
        <section className="card">
          <h2 className="h3">From {nFirst}</h2>
          <FileList files={fromThem} urls={urls} meId={user.id} names={{ [n.id]: nFirst }} empty={`Diet plans and notes from ${nFirst} show up here.`} />
        </section>
        <section className="card">
          <h2 className="h3">My reports</h2>
          <span className="text-sm text-muted">Blood tests, thyroid reports, prescriptions. {nFirst} sees them right away.</span>
          <FileUpload nutritionistId={n.id} clientId={user.id} uploaderId={user.id} defaultKind="report" kinds={["report", "prescription", "other"]} compact />
          <FileList files={mine} urls={urls} meId={user.id} deleteAction={deleteMyFile} empty="" />
        </section>
      </Body>
    </>
  );
}
