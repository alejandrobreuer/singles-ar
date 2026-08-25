"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TrendPeriod } from "@/lib/trends";

interface FilterBarProps {
  currentGame:   string;
  currentPeriod: TrendPeriod;
}

const GAMES = [
  { value: "all",      label: "Todos los juegos",      dot: "#6b7a9e" },
  { value: "pokemon",  label: "Pokémon TCG",            dot: "#e86c2c" },
  { value: "magic",    label: "Magic: The Gathering",   dot: "#7b5ea7" },
  { value: "onepiece", label: "One Piece TCG",          dot: "#c0392b" },
  { value: "dbz",      label: "Dragon Ball Super TCG",  dot: "#e08a1e" },
] as const;

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: "7d",  label: "7 días"   },
  { value: "30d", label: "30 días"  },
  { value: "3m",  label: "3 meses"  },
];

const GAME_LABELS: Record<string, string> = {
  all:      "Mostrando todos los juegos",
  pokemon:  "Filtrando: Pokémon TCG",
  magic:    "Filtrando: Magic: The Gathering",
  onepiece: "Filtrando: One Piece TCG",
  dbz:      "Filtrando: Dragon Ball Super TCG",
};

export function FilterBar({ currentGame, currentPeriod }: FilterBarProps) {
  const router     = useRouter();
  const params     = useSearchParams();

  function navigate(game: string, period: TrendPeriod) {
    const ps = new URLSearchParams(params.toString());
    if (game === "all") ps.delete("game"); else ps.set("game", game);
    if (period === "30d") ps.delete("period"); else ps.set("period", period);
    router.push(`/trends?${ps.toString()}`);
  }

  return (
    <div className="bg-surface border-b border-border sticky top-20 z-30 shadow-[0_2px_8px_rgba(26,39,68,0.06)]">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-12 overflow-x-auto">

          <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted whitespace-nowrap shrink-0">
            Juego
          </span>

          <div className="flex gap-0.5 flex-1">
            {GAMES.map((g) => (
              <button
                key={g.value}
                onClick={() => navigate(g.value, currentPeriod)}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-md whitespace-nowrap transition-all duration-150 border",
                  currentGame === g.value
                    ? "text-text-primary bg-secondary border-border font-semibold"
                    : "text-text-muted border-transparent hover:text-text-secondary hover:bg-secondary/60"
                )}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: g.dot }}
                />
                {g.label}
              </button>
            ))}
          </div>

          <div className="text-2xs text-text-muted whitespace-nowrap shrink-0 pl-4 border-l border-border hidden sm:block">
            {GAME_LABELS[currentGame] ?? GAME_LABELS.all}
          </div>
        </div>
      </div>

      {/* Period tabs — inside the sticky bar, right-aligned */}
      <div className="hidden" id="period-tabs-ref" />
    </div>
  );
}

export function PeriodTabs({ currentPeriod, currentGame }: { currentPeriod: TrendPeriod; currentGame: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function navigate(period: TrendPeriod) {
    const ps = new URLSearchParams(params.toString());
    if (currentGame !== "all") ps.set("game", currentGame); else ps.delete("game");
    if (period === "30d") ps.delete("period"); else ps.set("period", period);
    router.push(`/trends?${ps.toString()}`);
  }

  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => navigate(p.value)}
          className={cn(
            "text-xs font-medium px-4 py-1.5 rounded-md border transition-all duration-150",
            currentPeriod === p.value
              ? "bg-accent border-accent text-white"
              : "border-white/15 text-white/50 hover:text-white hover:border-white/30"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
