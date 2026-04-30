import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#1a2744",
          foreground: "#ffffff",
          50:  "#edf0f7",
          100: "#d2d9ec",
          200: "#a5b3d9",
          300: "#788cc5",
          400: "#4b66b2",
          500: "#1a2744",
          600: "#16203a",
          700: "#12192e",
          800: "#0d1222",
          900: "#080b16",
        },
        secondary: {
          DEFAULT: "#f7f5f0",
          foreground: "#1a2030",
        },
        accent: {
          DEFAULT: "#b5862a",
          foreground: "#ffffff",
          light: "#d4a84b",
          dark:  "#8c6520",
        },

        // Semantic
        background: "#f7f5f0",
        surface:    "#ffffff",
        border:     "#d8dde8",

        // Text
        text: {
          primary:   "#1a2030",
          secondary: "#4a5578",
          muted:     "#8a96b0",
        },

        // States
        success: {
          DEFAULT:    "#1a7a4a",
          foreground: "#ffffff",
          subtle:     "#e8f5ee",
        },
        warning: {
          DEFAULT:    "#b45309",
          foreground: "#ffffff",
          subtle:     "#fef3c7",
        },
        error: {
          DEFAULT:    "#c0392b",
          foreground: "#ffffff",
          subtle:     "#fde8e6",
        },

        // TCG game badges
        tcg: {
          poke:  { bg: "#fde68a", text: "#92400e" },
          magic: { bg: "#ddd6fe", text: "#4c1d95" },
          op:    { bg: "#fecaca", text: "#991b1b" },
        },
      },

      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      boxShadow: {
        card:    "0 1px 3px 0 rgba(26,39,68,0.08), 0 1px 2px -1px rgba(26,39,68,0.06)",
        "card-md": "0 4px 12px -2px rgba(26,39,68,0.10), 0 2px 4px -2px rgba(26,39,68,0.06)",
        "card-lg": "0 8px 24px -4px rgba(26,39,68,0.12), 0 4px 8px -4px rgba(26,39,68,0.08)",
        "gold":    "0 0 0 2px rgba(181,134,42,0.35)",
      },

      borderRadius: {
        "4xl": "2rem",
      },

      transitionTimingFunction: {
        "ease-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.2s ease-smooth both",
        "spin-slow": "spin-slow 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
