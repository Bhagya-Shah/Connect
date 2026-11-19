import { FILE_KINDS, fmtDate, fmtSize, type FileKind } from "@/lib/constants";
import type { ClientFile } from "@/lib/types";
import { Pill } from "./ui";

const icon = (mime: string | null) => (mime?.startsWith("image/") ? "IMG" : mime === "application/pdf" ? "PDF" : mime?.includes("sheet") || mime?.includes("excel") ? "XLS" : mime?.includes("word") ? "DOC" : "FILE");

/** Shared files with open links. `onDelete` is a server action bound per file. */
export function FileList({ files, urls, meId, names, deleteAction, empty = "No files yet." }: {
  files: ClientFile[]; urls: Record<string, string>; meId: string; names?: Record<string, string>;
  deleteAction?: (id: string) => Promise<void>; empty?: string;
}) {
  if (!files.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-0 first:pt-0">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent-soft text-[10px] font-bold text-accent">{icon(f.mime)}</span>
          <a href={urls[f.path]} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
            <b className="block truncate text-sm">{f.name}</b>
            <span className="block truncate text-xs text-muted">
              {fmtDate(f.created_at, { day: "numeric", month: "short" })} · {fmtSize(f.size)} · {f.uploaded_by === meId ? "You" : names?.[f.uploaded_by] ?? "Shared with you"}{f.note ? ` · ${f.note}` : ""}
            </span>
          </a>
          <Pill tone={f.kind === "diet_plan" ? "good" : f.kind === "report" ? "blue" : "grey"}>{FILE_KINDS[f.kind as FileKind] ?? "File"}</Pill>
          {deleteAction && (
            <form action={deleteAction.bind(null, f.id)}>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad" aria-label={`Delete ${f.name}`} title="Delete">✕</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
