// =============================================================================
// THEME — the single edit surface for the whole site's colors and fonts.
// =============================================================================
//
// Everything the site renders gets its color and font from this file. Change a
// value here and it propagates to every guest-facing page and the admin area —
// no component edits, nowhere else to touch.
//
// There are exactly two things to edit:
//   1. PALETTE  — the nine color roles (hex strings).            ↓ see below
//   2. FONTS    — the heading font and the body font.            ↓ see below
//
// Active theme: "Classic Mediterranean". The values below are placeholders that
// already render correctly; drop in the real palette/fonts whenever ready.
//
// A step-by-step guide for non-developers lives in: docs/EDITING-THE-THEME.md
//
// -----------------------------------------------------------------------------

import type { NextFontWithVariable } from "next/dist/compiled/@next/font";
// To change a font, see the FONTS section near the bottom of this file — the
// import line and the loader call are the two things to swap.
import { DM_Serif_Display, Inter } from "next/font/google";

// =============================================================================
// 1. PALETTE — the nine color roles. Edit the hex values; keep the keys.
// =============================================================================
//
// Each value is a hex color (e.g. "#97271A"). Replace any of them with the real
// palette. After editing, re-check contrast (see CONTRAST below):
//   • text-primary on background must pass WCAG AAA (ratio ≥ 7:1).
//   • primary on background must pass WCAG AA (ratio ≥ 4.5:1).
//
const PALETTE: ThemeColors = {
  // Page background — the cream "wall" the rest of the page lives on.
  background: "#F1E7DD",
  // Cards, panels, and other raised surfaces above the background.
  surface: "#FAF4EE",
  // Default body + heading text. Must hit AAA on `background`.
  "text-primary": "#1F1209",
  // Secondary text: captions, helper copy, distance/price metadata.
  "text-muted": "#6B5A50",
  // Workhorse accent — CTAs, nav active state, primary buttons, key links.
  primary: "#97271A",
  // Hover/focus state for `primary`.
  "primary-hover": "#7A1D14",
  // Used ~half as often as primary — secondary buttons, key borders.
  "accent-1": "#2C3D2E",
  // Used ~half as often as accent-1 — decorative ornamental touches.
  "accent-2": "#B8893E",
  // Hairline dividers, input borders, table rules.
  border: "#D4C4B6",
};

// =============================================================================
// 2. FONTS — one heading font, one body font, both from Google Fonts.
// =============================================================================
//
// These use Next.js's `next/font/google` loader, which self-hosts the fonts at
// build time (no layout shift, no external requests at runtime). To swap a font:
//
//   a. Change the import at the top of this file to the font you want, e.g.
//        import { Playfair_Display, Inter } from "next/font/google";
//   b. Change the matching loader call below to the new name, keeping the
//        `variable` value EXACTLY as-is ("--font-heading" / "--font-body") so
//        the rest of the site keeps reading it.
//
// Font names use underscores for spaces: "DM Serif Display" → DM_Serif_Display.
// Browse names at https://fonts.google.com.
//
// --- Heading font (display type: the names, page titles) ---------------------
const headingFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-heading", // do not change this line
  display: "swap",
});

// --- Body font (everything else: paragraphs, labels, UI) ---------------------
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body", // do not change this line
  display: "swap",
});

// =============================================================================
// Wiring — below here is plumbing. No edits needed for a palette/font swap.
// =============================================================================

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
    colors: PALETTE,
    fonts: {
      heading: headingFont,
      body: bodyFont,
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
