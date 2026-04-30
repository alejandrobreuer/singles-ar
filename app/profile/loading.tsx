export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border bg-surface" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 animate-pulse">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-surface p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-secondary" />
            <div className="h-3 w-24 rounded bg-secondary" />
            <div className="h-3 w-48 rounded bg-secondary" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="flex border-b border-border px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-28 mx-1 my-2 rounded-lg bg-secondary" />
            ))}
          </div>
          {/* Table rows */}
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
