// Library route-level skeleton. Mirrors the list-row shape.
export default function LibraryLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 space-y-3">
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-[90px] w-[60px] flex-none animate-pulse rounded bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-8 flex-none animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </main>
  );
}
