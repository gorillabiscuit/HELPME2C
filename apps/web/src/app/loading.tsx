// Route-level loading boundary for the dashboard. Renders while the
// server component fetches recs + auth. Mirrors the dashboard layout
// shape (header + two CTA cards + 4-up rec grid) so the transition
// feels stable rather than flash-of-empty-then-content.
//
// Perceived perf: the actual recs query is fast post-fra1 (~50-150 ms
// TTFB), but slow networks still benefit from a real skeleton.
export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-muted" />
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
