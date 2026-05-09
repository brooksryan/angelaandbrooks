// Theme configuration — single source of truth for colors and fonts.
//
// Swapping themes is a one-line change: re-point `activeTheme` at a different
// entry in `themes`. Nothing else in the app references theme values directly;
// every component reads from CSS custom properties wired up in the root layout.
//
// Adding a new theme:
//   1. Add a font loader call here if it introduces a new typeface.
//   2. Add a new entry to the `themes` record matching the `Theme` shape.
//   3. (Optional) Re-point `activeTheme` to verify it.
//
// Color values were contrast-checked by the Content workstream (issue #16);
// don't edit them without re-checking AAA on text-primary/background and AA on
// accent/background.

import type { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { Cormorant_Garamond, Fraunces, Inter } from "next/font/google";

// Inter is the body face for every theme. Defining it once keeps font loading
// efficient — Next.js will only ship the heading font that the active theme
// actually references.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-heading",
  display: "swap",
});

export type ThemeColors = {
  /** Page background — the canvas every other element sits on. */
  background: string;
  /** Cards, panels, and other raised surfaces over the background. */
  surface: string;
  /** Default body and heading color — must hit AAA on `background`. */
  "text-primary": string;
  /** Secondary text: captions, helper copy, distance/price metadata. */
  "text-muted": string;
  /** Primary accent for interactive elements and highlights. */
  accent: string;
  /** Accent state on hover/focus. */
  "accent-hover": string;
  /** Hairline dividers, input borders, table rules. */
  border: string;
};

export type ThemeFonts = {
  /** next/font instance powering display/heading type. */
  heading: NextFontWithVariable;
  /** next/font instance powering body and UI type. */
  body: NextFontWithVariable;
};

export type Theme = {
  /** Human-readable theme name, e.g. "Warm Ivory". */
  name: string;
  /** Short rationale for the visual direction — used in design review. */
  rationale: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
};

export const themes: Record<string, Theme> = {
  "warm-ivory": {
    name: "Warm Ivory",
    rationale:
      "Candlelit and Italian-trattoria warm — leans into Che Fico's actual atmosphere. Cormorant Garamond gives the headings a romantic, editorial feel; Inter keeps the body text neutral and sharp on every device.",
    colors: {
      background: "#F7F1E6",
      surface: "#FCF8F0",
      "text-primary": "#2A1F18",
      "text-muted": "#6B5D4F",
      accent: "#A04826",
      "accent-hover": "#7E3719",
      border: "#E5D9C4",
    },
    fonts: {
      heading: cormorantGaramond,
      body: inter,
    },
  },
  "modern-sage": {
    name: "Modern Sage",
    rationale:
      "Cooler and more contemporary — sage green and slate. Fraunces brings modern variable-serif character to headings, pairs cleanly with Inter for body.",
    colors: {
      background: "#F5F4EF",
      surface: "#FFFFFF",
      "text-primary": "#1F2A24",
      "text-muted": "#6B7770",
      accent: "#4A6553",
      "accent-hover": "#324638",
      border: "#D8DCD3",
    },
    fonts: {
      heading: fraunces,
      body: inter,
    },
  },
};

// The single line that swaps the entire site's appearance.
export const activeTheme: Theme = themes["warm-ivory"];

/**
 * Build the CSS custom property declarations for a theme. Used by the root
 * layout to render a `<style>` block with `:root` overrides — every component
 * downstream consumes these via `var(--color-…)` and `var(--font-…)`.
 */
export function buildThemeCss(theme: Theme): string {
  const colorVars = Object.entries(theme.colors)
    .map(([token, value]) => `  --color-${token}: ${value};`)
    .join("\n");
  return `:root {\n${colorVars}\n}`;
}
