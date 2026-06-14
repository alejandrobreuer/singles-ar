import { cn } from "@/lib/utils";
import { LANGUAGES_BY_GAME, LANGUAGE_LABELS, LANGUAGE_FLAGS } from "@/lib/cardAttributes";
import type { Game, CardLanguage } from "@/types/database";

interface LanguageSelectorProps {
  game:     Game;
  value:    CardLanguage;
  onChange: (lang: CardLanguage) => void;
  className?: string;
}

export function LanguageSelector({ game, value, onChange, className }: LanguageSelectorProps) {
  const options = LANGUAGES_BY_GAME[game];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-1.5", className)}>
      {options.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 px-2 transition-all duration-100 font-sans text-xs font-semibold",
            value === lang
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-surface text-text-secondary hover:bg-secondary/60"
          )}
        >
          <span>{LANGUAGE_FLAGS[lang]}</span>
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
