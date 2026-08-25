import type { Game, CardLanguage } from "@/types/database";

// ─── Listing languages ────────────────────────────────────────────────────────
// The physical print language of the seller's copy — independent from the
// card catalog's source language (cards.lang).

export const LANGUAGES_BY_GAME: Record<Game, CardLanguage[]> = {
  pokemon:  ["es", "pt", "en", "ja"],
  onepiece: ["en", "ja"],
  magic:    ["es", "pt", "en", "ja"],
  dbz:      ["en"],
};

export const LANGUAGE_LABELS: Record<CardLanguage, string> = {
  en: "Inglés",
  es: "Español",
  pt: "Portugués",
  ja: "Japonés",
};

export const LANGUAGE_FLAGS: Record<CardLanguage, string> = {
  en: "🇺🇸",
  es: "🇦🇷",
  pt: "🇧🇷",
  ja: "🇯🇵",
};

// Hover-tooltip descriptions for rarity and color values shown across the app.

export const RARITY_DESCRIPTIONS: Record<string, string> = {
  "Common":       "La rareza más común. Abundante en sobres.",
  "Uncommon":     "Rareza intermedia. ~3 por sobre.",
  "Rare":         "Poco frecuente. ~1 por sobre.",
  "Super Rare":   "Con foil especial. ~1 cada 3 sobres.",
  "Mythic Rare":  "La rareza más alta en Magic. ~1 por cada 8 rares.",
  "Secret Rare":  "Rareza oculta. Muy difícil de conseguir.",
  "Leader":       "Carta de Líder — tipo especial en One Piece TCG y Dragon Ball.",
  "Promo":        "Carta promocional de torneos o eventos especiales.",
  "Special":      "Edición especial limitada.",
  "Bonus":        "Carta bonus incluida en productos especiales.",
};

export const COLOR_DESCRIPTIONS: Record<string, string> = {
  // MTG + One Piece shared names
  "White":      "Blanco — Orden, protección y ley.",
  "Blue":       "Azul — Conocimiento, control e intelecto.",
  "Black":      "Negro — Poder, ambición y efectos oscuros.",
  "Red":        "Rojo — Agresión, velocidad y ataque directo.",
  "Green":      "Verde — Naturaleza, crecimiento e instinto.",
  // One Piece exclusives
  "Purple":     "Morado — Efectos de contador y manipulación.",
  "Yellow":     "Amarillo — Manipulación de vidas y efectos tardíos.",
  // Note: Dragon Ball Fusion World's 5 colors (Red, Blue, Green, Yellow, Black)
  // reuse the shared White/Blue/Black/Red/Green + Yellow entries above.
  // Pokémon types
  "Fire":       "Fuego — Fuerte contra Planta y Acero.",
  "Water":      "Agua — Fuerte contra Fuego y Tierra.",
  "Grass":      "Planta — Fuerte contra Agua y Tierra.",
  "Lightning":  "Eléctrico — Fuerte contra Agua y Volador.",
  "Fighting":   "Lucha — Fuerte contra Normal y Acero.",
  "Psychic":    "Psíquico — Fuerte contra Lucha y Veneno.",
  "Darkness":   "Oscuridad — Fuerte contra Psíquico y Fantasma.",
  "Metal":      "Metal/Acero — Alta resistencia.",
  "Dragon":     "Dragón — Poderoso y versátil.",
  "Fairy":      "Hada — Fuerte contra Dragón.",
  "Colorless":  "Incoloro — Sin tipo específico.",
};
