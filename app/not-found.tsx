import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-8xl font-serif font-semibold text-primary/20 mb-4 leading-none">
            404
          </p>
          <h1 className="text-2xl font-serif font-semibold text-text-primary mb-2">
            Página no encontrada
          </h1>
          <p className="text-base text-text-muted font-sans mb-8">
            La página que buscás no existe o fue movida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors no-underline"
            >
              <Search size={15} />
              Explorar cartas
            </Link>
            <Link
              href="javascript:history.back()"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors no-underline"
            >
              Volver atrás
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
