export default function CardDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Topbar placeholder */}
      <div className="h-14 border-b border-border bg-surface" />
      {/* Breadcrumb */}
      <div className="h-10 border-b border-border bg-surface" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 animate-pulse">

          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Card image + metadata */}
            <div className="flex gap-6 items-start">
              <div className="shrink-0 w-44 sm:w-52 aspect-[2.5/3.5] rounded-xl bg-secondary" />
              <div className="flex-1 pt-1 space-y-3">
                <div className="h-5 w-20 rounded bg-secondary" />
                <div className="h-8 w-3/4 rounded-lg bg-secondary" />
                <div className="h-4 w-1/2 rounded bg-secondary" />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded bg-secondary" />
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Listings skeleton */}
            <div className="space-y-3">
              <div className="h-6 w-40 rounded bg-secondary" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary" />
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">
            <div className="h-48 rounded-xl bg-secondary" />
            <div className="h-24 rounded-xl bg-secondary" />
            <div className="h-52 rounded-xl bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}
