// Theme configuration — single source of truth for colors and fonts.
//
// One theme ships: Classic Mediterranean. Brooks locked it after evaluating
// alternatives, so the multi-theme swap mechanism the original PRD asked for
// is now scaffolding rather than active design surface. The structure is
// preserved — `themes` is still a record, `activeTheme` still re-points at
// one entry — so adding a second palette later is mechanical.
//
// Color values were contrast-checked when the palette was authored; don't
// edit them without re-checking AAA on text-primary/background and AA on
// primary/background.
//
// The 50% rule for accents: `primary` is the workhorse (CTAs, nav active,
// primary buttons, key links). `accent-1` (forest green) appears half as
// often as primary — secondary buttons, key borders, some iconography.
// `accent-2` (bronze) appears half as often as accent-1 — decorative
// ornamental touches.

import type { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { DM_Serif_Display, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

export type ThemeColors = {
  /** Page background — the cream "wall" the rest of the page lives on. */
  background: string;
  /** Cards, panels, and other raised surfaces above the background. */
  surface: string;
  /** Default body and heading color — must hit AAA on `background`. */
  "text-primary": string;
  /** Secondary text: captions, helper copy, distance/price metadata. */
  "text-muted": string;
  /** Workhorse accent — CTAs, nav active state, primary buttons, key links. */
  primary: string;
  /** Hover/focus state for primary. */
  "primary-hover": string;
  /** Used about half as often as primary — secondary buttons, key borders. */
  "accent-1": string;
  /** Used about half as often as accent-1 — decorative ornamental touches. */
  "accent-2": string;
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
  /** Human-readable theme name. */
  name: string;
  /** Short rationale for the visual direction. */
  rationale: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
};

export const themes: Record<string, Theme> = {
  "classic-mediterranean": {
    name: "Classic Mediterranean",
    rationale:
      "Trattoria-warm cream and tile-red, lifted by forest green and bronze. DM Serif Display anchors the headings with a confident editorial serif; Inter keeps the body sharp on every device. Tuned to feel at home with Che Fico's Italian-modern atmosphere.",
    colors: {
      background: "#F1E7DD",
      surface: "#FAF4EE",
      "text-primary": "#1F1209",
      "text-muted": "#6B5A50",
      primary: "#97271A",
      "primary-hover": "#7A1D14",
      "accent-1": "#2C3D2E",
      "accent-2": "#B8893E",
      border: "#D4C4B6",
    },
    fonts: {
      heading: dmSerifDisplay,
      body: inter,
    },
  },
};

// The single line that drives the entire site's appearance.
export const activeTheme: Theme = themes["classic-mediterranean"];

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
