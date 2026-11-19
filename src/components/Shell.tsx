/** Phone-width frame for the client app. */
export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-surface-2 shadow-[0_0_0_1px_var(--line)]">{children}</div>;
}
export function Body({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col gap-3 p-3.5 md:p-6">{children}</main>;
}
/** Two columns on wide screens, one on phones. */
export function Cols({ children }: { children: React.ReactNode }) {
  return <div className="grid items-start gap-3 lg:grid-cols-2">{children}</div>;
}
export function Logo({ size = "text-xl" }: { size?: string }) {
  return <span className={`flex items-center gap-2 font-display font-bold ${size}`}><span className="h-3 w-3 rounded-full bg-accent shadow-[8px_0_0_var(--saffron)]" />&nbsp;&nbsp;Connect</span>;
}
