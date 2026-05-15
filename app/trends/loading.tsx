import * as React from "react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-secondary animate-pulse rounded ${className ?? ""}`} />;
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="mb-4">
        <Skeleton className="h-3 w-24 mb-1" />
        <Skeleton className="h-6 w-48" />
      </div>
      {children}
    </div>
  );
}

export default function TrendsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-primary px-4 py-11">
        <div className="mx-auto max-w-site">
          <Skeleton className="h-3 w-28 mb-3 bg-white/10" />
          <Skeleton className="h-9 w-72 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
      </section>

      {/* Game filter bar */}
      <div className="bg-surface border-b border-border h-12" />

      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-8">
        {/* Market Pulse */}
        <SectionShell label="">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="surface-raised p-5 text-center space-y-2">
                <Skeleton className="h-6 w-6 mx-auto" />
                <Skeleton className="h-7 w-20 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </SectionShell>

        {/* Top Sales */}
        <SectionShell label="Top ventas">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-raised overflow-hidden">
                <div className="bg-secondary h-10" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-[52px] h-[72px] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-12 rounded-md" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* Most Wanted */}
        <SectionShell label="Más buscadas">
          <div className="surface-raised divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-7 h-5" />
                <Skeleton className="w-10 h-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-1 w-44 rounded-full" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-6 w-10 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* Price Movers */}
        <SectionShell label="Movimientos de precio">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {[0, 1].map((i) => (
              <div key={i} className="surface-raised overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-28" />
                </div>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="w-8 h-11 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-5 w-12 ml-auto" />
                      <Skeleton className="h-3 w-20 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
