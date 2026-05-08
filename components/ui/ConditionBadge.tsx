"use client";

import * as React from "react";
import ReactDOM    from "react-dom";
import { cn }      from "@/lib/utils";
import type { Condition } from "@/types/database";

// ─── Condition data ───────────────────────────────────────────────────────────

const CONDITION_DATA: Record<Condition, {
  label:     string;
  longLabel: string;
  fullName:  string;
  subtitle:  string;
  color:     string;
}> = {
  NM:  {
    label:     "NM",
    longLabel: "Near Mint (NM)",
    fullName:  "Near Mint — Casi Nueva",
    subtitle:  "El estándar más alto. Como recién salida del sobre.",
    color:     "bg-success-subtle text-success border-success/25",
  },
  LP:  {
    label:     "LP",
    longLabel: "Lightly Played (LP)",
    fullName:  "Lightly Played — Poco Jugada",
    subtitle:  "Jugada pero bien cuidada. Desgaste muy leve.",
    color:     "bg-blue-50 text-blue-700 border-blue-200",
  },
  MP:  {
    label:     "MP",
    longLabel: "Moderately Played (MP)",
    fullName:  "Moderately Played — Mod. Jugada",
    subtitle:  "Desgaste visible pero estructuralmente en buen estado.",
    color:     "bg-warning-subtle text-warning border-warning/25",
  },
  HP:  {
    label:     "HP",
    longLabel: "Heavily Played (HP)",
    fullName:  "Heavily Played — Muy Jugada",
    subtitle:  "Desgaste significativo en esquinas, bordes y superficie.",
    color:     "bg-orange-50 text-orange-700 border-orange-200",
  },
  DMG: {
    label:     "DMG",
    longLabel: "Damaged (DMG)",
    fullName:  "Damaged — Dañada",
    subtitle:  "Daño estructural. Generalmente no apta para torneos.",
    color:     "bg-error-subtle text-error border-error/25",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ConditionBadgeProps {
  condition:  Condition;
  variant?:   "short" | "long";
  className?: string;
}

export function ConditionBadge({
  condition,
  variant   = "short",
  className,
}: ConditionBadgeProps) {
  const data = CONDITION_DATA[condition] ?? CONDITION_DATA.NM;
  const ref  = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  function handleMouseEnter() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.left + r.width / 2 });
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        className={cn(
          "inline-flex items-center justify-center rounded border font-sans text-2xs shrink-0 cursor-default",
          variant === "short" ? "w-10 h-6 font-bold" : "px-2 py-0.5 font-medium",
          data.color,
          className
        )}
      >
        {variant === "short" ? data.label : data.longLabel}
      </span>

      {pos && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top:       pos.top,
            left:      pos.left,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <div
            className="rounded-lg px-3 py-2.5 shadow-xl text-left"
            style={{ width: "220px", background: "#1a2744" }}
          >
            <p className="text-xs font-semibold font-sans text-white leading-tight">
              {data.fullName}
            </p>
            <p
              className="text-2xs font-sans mt-0.5 leading-snug"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {data.subtitle}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
