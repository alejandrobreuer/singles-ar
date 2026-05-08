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
import type { PriceHistory } from "@/types/database";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface PriceChartProps {
  history:   PriceHistory[];
  className?: string;
}

export function PriceChart({ history, className }: PriceChartProps) {
  const rows = history.filter((h) => h.price_ars != null);

  if (rows.length === 0) {
    return (
      <div className={`flex items-center justify-center h-36 text-sm text-text-muted font-sans ${className ?? ""}`}>
        Sin transacciones registradas aún
      </div>
    );
  }

  const labels = rows.map((h) =>
    format(new Date(h.recorded_at), "d MMM", { locale: es })
  );

  const dataset = {
    label:            "Card Stash",
    data:             rows.map((h) => h.price_ars as number),
    borderColor:      "rgb(26,122,74)",
    backgroundColor:  "rgba(26,122,74,0.08)",
    borderWidth:      2,
    pointRadius:      4,
    pointHoverRadius: 6,
    fill:             true,
    tension:          0.35,
  };

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
        titleFont:       { family: "var(--font-dm-sans)", size: 12, weight: 600 },
        bodyFont:        { family: "var(--font-dm-sans)", size: 12 },
        padding:         10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            return val == null ? "" : `$ ${val.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`;
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
          callback: (val) => `$${Number(val).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
        },
        border: { dash: [4, 2] },
      },
    },
  };

  return (
    <div className={`relative h-44 w-full ${className ?? ""}`}>
      <Line data={{ labels, datasets: [dataset] }} options={options} />
    </div>
  );
}
