import * as React from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tendencias — CardStash.ar",
  description:
    "Lo que se compra, lo que se busca y lo que sube en el mercado TCG argentino. Datos en tiempo real de Magic, Pokémon y One Piece.",
};

import {
  getMarketPulse,
  getTopSales,
  getMostWanted,
  getBackInStock,
  getPriceMovers,
  getTopSellers,
  getRecentTransactions,
  type TrendPeriod,
} from "@/lib/trends";
import type { Game } from "@/types/database";

import { FilterBar, PeriodTabs } from "@/components/trends/FilterBar";
import { MarketPulse }           from "@/components/trends/MarketPulse";
import { TopSales }              from "@/components/trends/TopSales";
import { MostWanted }            from "@/components/trends/MostWanted";
import { BackInStock }           from "@/components/trends/BackInStock";
import { PriceMovers }           from "@/components/trends/PriceMovers";
import { TopSellers }            from "@/components/trends/TopSellers";
import { LiveFeed }              from "@/components/trends/LiveFeed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_PERIODS: TrendPeriod[] = ["7d", "30d", "3m"];
const VALID_GAMES = ["all", "pokemon", "magic", "onepiece"] as const;

// ─── Section shell ────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow, title, desc, link,
}: {
  eyebrow: string; title: string; desc: string; link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
      <div>
        <div className="text-2xs font-semibold uppercase tracking-widest text-accent mb-1">{eyebrow}</div>
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-text-primary leading-tight">{title}</h2>
        <p className="text-sm text-text-muted font-sans mt-0.5">{desc}</p>
      </div>
      {link && (
        <Link
          href={link.href}
          className="text-xs font-medium text-text-muted hover:text-text-primary font-sans no-underline flex items-center gap-1 transition-colors"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mb-12">{children}</section>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: { game?: string; period?: string };
}) {
  const rawGame   = searchParams.game   ?? "all";
  const rawPeriod = searchParams.period ?? "30d";

  const game   = (VALID_GAMES.includes(rawGame as (typeof VALID_GAMES)[number]) ? rawGame : "all") as Game | "all";
  const period = (VALID_PERIODS.includes(rawPeriod as TrendPeriod) ? rawPeriod : "30d") as TrendPeriod;

  const [pulse, topSales, wanted, backInStock, movers, sellers, liveFeed] = await Promise.all([
    getMarketPulse(period, game),
    getTopSales(period, game, 3),
    getMostWanted(game, 5),
    getBackInStock(game, 8),
    getPriceMovers(period, game, 4),
    getTopSellers(period, game, 4),
    getRecentTransactions(game, 10),
  ]);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-primary relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 size-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #b5862a 0%, transparent 70%)" }}
        />
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-11">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="block w-5 h-px bg-accent" />
                <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-accent">
                  Datos del mercado
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-[1.15] mb-2">
                Tendencias del mercado
              </h1>
              <p className="text-sm text-white/50 font-sans">
                Lo que se compra, lo que se busca y lo que sube — en CardStash.ar.
              </p>
            </div>
            <Suspense>
              <PeriodTabs currentPeriod={period} currentGame={game} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── Game filter bar ───────────────────────────────────────────── */}
      <Suspense>
        <FilterBar currentGame={game} currentPeriod={period} />
      </Suspense>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-8">

        {/* Market Pulse */}
        <Section>
          <MarketPulse data={pulse} />
        </Section>

        {/* Top Sales */}
        <Section>
          <SectionHeader
            eyebrow="🔥 Lo más vendido"
            title="Top ventas del período"
            desc="Cartas con mayor cantidad de transacciones completadas"
            link={{ href: "/cards", label: "Ver ranking completo →" }}
          />
          <TopSales items={topSales} />
        </Section>

        {/* Most Wanted */}
        <Section>
          <SectionHeader
            eyebrow="🎯 Más buscadas"
            title="Cartas con más buy orders"
            desc="Las cartas que los compradores quieren pero no encuentran al precio que buscan"
            link={{ href: "/cards", label: "Ver todas →" }}
          />
          <MostWanted items={wanted} />
        </Section>

        {/* Back in Stock */}
        <Section>
          <SectionHeader
            eyebrow="✨ Volvieron al stock"
            title="Sin stock → con stock"
            desc="Cartas que no tenían listings y acaban de aparecer"
            link={{ href: "/cards", label: "Ver todas →" }}
          />
          <BackInStock items={backInStock} />
        </Section>

        {/* Price Movers */}
        <Section>
          <SectionHeader
            eyebrow="📈 Movimientos de precio"
            title="Mayores subidas y bajadas"
            desc="Comparado con el período anterior en CardStash.ar"
          />
          <PriceMovers data={movers} />
        </Section>

        {/* Top Sellers */}
        <Section>
          <SectionHeader
            eyebrow="⭐ Comunidad"
            title="Vendedores destacados"
            desc="Los vendedores con mejor reputación y más ventas del período"
          />
          <TopSellers items={sellers} />
        </Section>

        {/* Live Feed */}
        <Section>
          <SectionHeader
            eyebrow="⚡ En vivo"
            title="Últimas transacciones"
            desc="Ventas completadas recientemente en CardStash.ar"
          />
          {/* Live indicator in header area */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="size-[7px] rounded-full bg-success animate-pulse" />
            <span className="text-2xs text-text-muted font-sans">En vivo</span>
          </div>
          <LiveFeed initialItems={liveFeed} game={game} />
        </Section>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Link href="/" className="no-underline inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/CardStashBlackText.png" alt="Card Stash" className="h-7 w-auto object-contain" />
            </Link>
            <p className="text-xs text-text-muted font-sans">
              © {new Date().getFullYear()} Card Stash — Todos los derechos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
