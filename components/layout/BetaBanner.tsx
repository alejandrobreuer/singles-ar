"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "cardstash_beta_banner_dismissed";

export function BetaBanner() {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="w-full bg-warning-subtle border-b border-warning/30 px-4 sm:px-6">
      <div className="mx-auto max-w-site h-10 flex items-center justify-center gap-3 text-2xs sm:text-xs font-sans text-warning text-center">
        <span>
          🚧 CardStash.ar está en versión beta — algunas estimaciones de comisiones pueden variar mientras mejoramos la plataforma.{" "}
          <Link href="/ayuda" className="font-semibold underline hover:no-underline">
            Saber más →
          </Link>
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 text-warning/70 hover:text-warning transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
