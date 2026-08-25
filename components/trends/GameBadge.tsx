import * as React from "react";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/database";

interface Props {
  game: Game;
  className?: string;
}

const STYLES: Record<Game, string> = {
  pokemon:  "bg-[#fff3e0] text-[#b54000] border border-[#f5c89a]",
  magic:    "bg-[#f0eefa] text-[#5b40b0] border border-[#c9baef]",
  onepiece: "bg-[#fdeaea] text-[#b02020] border border-[#f0b8b8]",
  dbz:      "bg-[#fff0e0] text-[#c05a00] border border-[#f5c298]",
};

const LABELS: Record<Game, string> = {
  pokemon:  "Pokémon",
  magic:    "Magic",
  onepiece: "One Piece",
  dbz:      "Dragon Ball",
};

export function GameBadge({ game, className }: Props) {
  return (
    <span className={cn("inline-flex items-center text-2xs font-medium px-2 py-0.5 rounded", STYLES[game], className)}>
      {LABELS[game]}
    </span>
  );
}
