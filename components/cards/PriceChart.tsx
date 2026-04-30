"use client";

import * as React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PriceHistory, PriceSource } from "@/types/database";

// ─── Register Chart.js modules ────────────────────────────────────────────────

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceChartProps {
  history:   PriceHistory[];
  currency?: "USD" | "ARS";
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<PriceSource, { line: string; fill: string }> = {
  tcgplayer: { line: "rgb(26,39,68)",    fill: "rgba(26,39,68,0.07)"    },
  scryfall:  { line: "rgb(181,134,42)",  fill: "rgba(181,134,42,0.07)"  },
  listing:   { line: "rgb(26,122,74)",   fill: "rgba(26,122,74,0.07)"   },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceChart({ history, currency = "USD", className }: PriceChartProps) {
  const priceKey: keyof PriceHistory = currency === "ARS" ? "price_ars" : "price_usd";

  // Group by source
  const bySource = history.reduce<Record<string, PriceHistory[]>>((acc, row) => {
    (acc[row.source] ??= []).push(row);
    return acc;
  }, {});

  // Build a unified label set from all dates, sorted ascending
  const allDates = [...new Set(history.map((h) => h.recorded_at.split("T")[0]))]
    .sort();

  if (allDates.length === 0) {
    return (
      <div className={`flex items-center justify-center h-36 text-sm text-text-muted font-sans ${className ?? ""}`}>
        Sin datos de precio disponibles
      </div>
    );
  }

  const labels = allDates.map((d) =>
    format(new Date(d + "T12:00:00"), "d MMM", { locale: es })
  );

  // One dataset per source
  const datasets = Object.entries(bySource).map(([source, rows]) => {
    const colors = SOURCE_COLORS[source as PriceSource] ?? SOURCE_COLORS.listing;

    // Map each label date to a price (null if no data that day)
    const priceByDate: Record<string, number | null> = {};
    rows.forEach((r) => {
      const d = r.recorded_at.split("T")[0];
      priceByDate[d] = (r[priceKey] as number | null);
    });

    return {
      label:           source,
      data:            allDates.map((d) => priceByDate[d] ?? null),
      borderColor:     colors.line,
      backgroundColor: colors.fill,
      borderWidth:     2,
      pointRadius:     3,
      pointHoverRadius: 5,
      fill:            true,
      tension:         0.35,
      spanGaps:        true,
    };
  });

  const options: ChartOptions<"line"> = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#fff",
        borderColor:     "#d8dde8",
        borderWidth:     1,
        titleColor:      "#1a2030",
        bodyColor:       "#4a5578",
        titleFont:       { family: "var(--font-dm-sans)", size: 12, weight: "600" },
        bodyFont:        { family: "var(--font-dm-sans)", size: 12 },
        padding:         10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            if (val == null) return "";
            return currency === "ARS"
              ? `$ ${val.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`
              : `USD ${val.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid:   { color: "rgba(216,221,232,0.5)" },
        ticks:  { color: "#8a96b0", font: { size: 11, family: "var(--font-dm-sans)" } },
        border: { dash: [4, 2] },
      },
      y: {
        grid:   { color: "rgba(216,221,232,0.5)" },
        ticks:  {
          color: "#8a96b0",
          font:  { size: 11, family: "var(--font-dm-sans)" },
          callback: (val) =>
            currency === "ARS"
              ? `$${Number(val).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
              : `$${Number(val).toFixed(2)}`,
        },
        border: { dash: [4, 2] },
      },
    },
  };

  return (
    <div className={`relative h-44 w-full ${className ?? ""}`}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
}
