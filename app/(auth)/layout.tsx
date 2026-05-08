import * as React from "react";
import Link from "next/link";

// Clean centered shell for all auth pages
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="w-full border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center">
          <Link href="/" className="no-underline flex items-center" aria-label="Card Stash — Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/CardStashLogo.png" alt="Card Stash" className="h-8 w-auto object-contain" />
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-12 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-text-muted font-sans">
          © {new Date().getFullYear()} Card Stash — Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
