import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { TopbarGuard } from "@/components/layout/TopbarGuard";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Card Stash — Marketplace de cartas TCG",
  description:
    "Comprá y vendé singles de Pokémon, Magic: The Gathering y One Piece TCG en Argentina.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <BetaBanner />
        <TopbarGuard />
        {children}
        <WhatsAppButton />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background:  "var(--color-surface)",
              border:      "1px solid var(--color-border)",
              color:       "var(--color-text-primary)",
              fontFamily:  "var(--font-dm-sans)",
              fontSize:    "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
