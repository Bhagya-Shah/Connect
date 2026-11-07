import { requireClient } from "@/lib/auth";
import { fmtDate, fmtTime } from "@/lib/constants";
import { Empty, Pill, TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { JournalForm } from "../MindForms";
import { deleteJournal, setJournalShared } from "../actions";

export default async function JournalPage() {
  const { supabase, user } = await requireClient();
  const { data: entries } = await supabase.from("journal_entries").select("*").eq("client_id", user.id).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <TopBar title="Journal" back="/me" />
      <Body>
        <JournalForm />
        {entries?.length ? entries.map((e) => (
          <article key={e.id} className="card">
            <div className="flex items-center gap-2"><span className="flex-1 text-xs text-muted">{fmtDate(e.created_at)} {fmtTime(e.created_at)}</span>{e.shared ? <Pill tone="blue">Shared</Pill> : <Pill tone="grey">Private</Pill>}</div>
            <p className="whitespace-pre-line text-sm">{e.body}</p>
            <div className="flex gap-2">
              <form action={setJournalShared.bind(null, e.id, !e.shared)}><button className="chip">{e.shared ? "Make private" : "Share with therapist"}</button></form>
              <form action={deleteJournal.bind(null, e.id)}><button className="chip text-bad">Delete</button></form>
            </div>
          </article>
        )) : <Empty title="No entries yet">Writing for a few minutes a day helps. Entries stay private unless you share them.</Empty>}
      </Body>
    </>
  );
}
