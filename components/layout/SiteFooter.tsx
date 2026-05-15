import * as React from "react";
import Link from "next/link";

interface Props {
  variant?: "light" | "dark";
}

export function SiteFooter({ variant = "light" }: Props) {
  const year = new Date().getFullYear();

  if (variant === "dark") {
    return (
      <footer className="bg-[#111827] py-5 px-6 sm:px-12 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/CardStashWhiteText.png" alt="Card Stash" className="h-6 w-auto object-contain opacity-60" />
        </Link>

        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/contact" className="text-xs font-sans no-underline transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>
            Contacto
          </Link>
          <p className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.3)" }}>
            © {year} Card Stash · Marketplace TCG Argentina
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link href="/" className="no-underline inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/CardStashBlackText.png" alt="Card Stash" className="h-7 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-5 flex-wrap">
            <Link
              href="/contact"
              className="text-xs text-text-muted hover:text-text-primary font-sans no-underline transition-colors"
            >
              Contacto
            </Link>
            <p className="text-xs text-text-muted font-sans">
              © {year} Card Stash — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
