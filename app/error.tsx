"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log to error reporting in production
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
        </div>
        <h1 className="text-xl font-serif font-semibold text-text-primary mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-text-muted font-sans mb-6">
          Ocurrió un error inesperado. Por favor intentá de nuevo.
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted font-mono mb-4">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors"
          >
            <RotateCcw size={14} />
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors no-underline"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
