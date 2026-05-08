"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TERMS } from "@/lib/terms";
import { createClient } from "@/lib/supabase/client";

function AcceptTermsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/";

  const [checkedTerms, setCheckedTerms] = React.useState([false, false, false, false]);
  const allChecked = checkedTerms.every(Boolean);
  const [loading,  setLoading]  = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);

  function toggleTerm(i: number) {
    setCheckedTerms((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecked) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        setError(json.error ?? "Ocurrió un error. Intentá de nuevo.");
        return;
      }
      // Refresh the session so the new JWT carries updated user_metadata.
      // Without this, the middleware's getUser() still sees the old JWT claims
      // and keeps redirecting back here.
      const supabase = createClient();
      await supabase.auth.refreshSession();
      router.push(next);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
          Aceptación de términos
        </h1>
        <p className="text-sm text-text-secondary font-sans">
          Necesitamos que aceptes los términos para continuar usando CardStash.ar
        </p>
      </div>

      <div className="surface-raised p-6 sm:p-8">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3 mb-5"
          >
            <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">
              !
            </span>
            <p className="text-sm text-error font-sans">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
            <Info size={16} className="shrink-0 mt-0.5 text-primary/60" />
            <p className="text-xs font-sans text-text-secondary">
              Actualizamos nuestros términos y condiciones. Leélos y aceptalos para continuar usando CardStash.ar.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCheckedTerms([true, true, true, true])}
                className="text-xs font-sans text-primary hover:text-accent transition-colors underline"
              >
                Seleccionar todo
              </button>
            </div>

            {TERMS.map((term, i) => (
              <label
                key={term.id}
                className={cn(
                  "flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all select-none",
                  term.highlight
                    ? checkedTerms[i]
                      ? "border-primary bg-primary/5"
                      : "border-primary/40 hover:bg-primary/5"
                    : checkedTerms[i]
                    ? "border-border bg-secondary/20"
                    : "border-border hover:bg-secondary/30",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checkedTerms[i]}
                  onChange={() => toggleTerm(i)}
                />
                <div
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-all",
                    checkedTerms[i] ? "bg-primary border-primary" : "bg-transparent border-border"
                  )}
                >
                  {checkedTerms[i] && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
                <span
                  className={cn(
                    "text-xs font-sans leading-relaxed",
                    term.highlight ? "text-text-primary font-medium" : "text-text-secondary"
                  )}
                >
                  {term.linkHref ? (
                    <>
                      {term.text}
                      <a
                        href={term.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary font-semibold underline decoration-primary/40 hover:text-accent transition-colors"
                      >
                        {term.linkText}
                      </a>
                    </>
                  ) : (
                    term.text
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="relative group mt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!allChecked || loading}
            >
              Confirmar y continuar
            </Button>
            {!allChecked && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-[#1a2744] text-white text-xs font-sans px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  Debés aceptar todos los puntos para continuar
                </div>
                <div className="w-2 h-2 bg-[#1a2744] rotate-45 mx-auto -mt-1" />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  return <React.Suspense><AcceptTermsPage /></React.Suspense>;
}
