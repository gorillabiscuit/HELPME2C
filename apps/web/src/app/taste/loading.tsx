// /taste route-level skeleton. Mirrors the picker grid.
export default function TasteLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
      <div className="mb-6 max-w-2xl space-y-3">
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
      </div>

      <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded bg-muted" />
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-muted" />
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i} className="space-y-2">
            <div className="aspect-[2/3] animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </main>
  );
}
