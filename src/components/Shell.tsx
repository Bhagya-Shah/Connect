export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-surface-2 shadow-[0_0_0_1px_var(--line)]">{children}</div>;
}
export function Body({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col gap-3 p-3.5">{children}</main>;
}
