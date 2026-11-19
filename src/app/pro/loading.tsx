export default function Loading() {
  return (
    <div className="flex flex-col gap-3 p-3.5 md:p-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-line/60" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-line/60" />)}</div>
      <div className="h-40 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-40 animate-pulse rounded-2xl bg-line/60" />
    </div>
  );
}
