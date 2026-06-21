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
// Sampled from the invitation art (docs/source_material/Final-Proof-For-Zazzle.png):
// blush-cream ground, fig-burgundy figs, forest + sage foliage, Golden-Gate
// coral pops, near-black foliage shadow for text. Contrast verified (WCAG, on
// `background` #ECDFD1): text-primary 10.24:1 (AAA >= 7), primary 7.12:1
// (AA >= 4.5), text-muted 4.91:1 (AA >= 4.5), accent-1 forest 7.88:1.
const PALETTE: ThemeColors = {
  // Page background — the blush-cream "wall" the rest of the page lives on
  // (the invitation's arch interior).
  background: "#ECDFD1",
  // Cards, panels, and other raised surfaces above the background (lighter cream).
  surface: "#F4E7D9",
  // Default body + heading text — near-black foliage shadow. AAA on `background` (10.24:1).
  "text-primary": "#2A3127",
  // Secondary text: captions, helper copy, distance/price metadata — muted fig-leaf green. AA (4.91:1).
  "text-muted": "#586159",
  // Workhorse accent — CTAs, nav active state, primary buttons, key links — rich fig-burgundy. AA (7.12:1).
  primary: "#7A2E2C",
  // Hover/focus state for `primary` — a deeper fig-burgundy.
  "primary-hover": "#5E2220",
  // Used ~half as often as primary — secondary buttons, key borders — forest green.
  "accent-1": "#3C423B",
  // Used ~half as often as accent-1 — decorative ornamental touches — soft sage.
  "accent-2": "#8D9792",
  // Hairline dividers, input borders, table rules — warm taupe.
  border: "#BAAFA6",
};

// =============================================================================
// TYPE SCALE — the harmonized font-size token set. Edit a step here and it
// propagates to every component reading `var(--font-size-…)`.
// =============================================================================
//
// One ladder for the whole site, so type sizing is consistent instead of a
// drift of ad-hoc rem values. Two families:
//
//   • Fixed steps (body + UI): 2xs → 3xl. Plain rem values.
//   • Fluid display sizes: hero / h1 / h2 / h3 / section. `clamp()` so headings
//     scale smoothly between phone and desktop with no media queries.
//
// Components reference these as `var(--font-size-sm)`, `var(--font-size-h2)`,
// etc. Don't reintroduce raw rem font-sizes in components — add or adjust a
// step here instead.
//
const TYPE_SCALE: Record<string, string> = {
  // Fixed body + UI steps.
  "2xs": "0.75rem",
  xs: "0.8125rem",
  sm: "0.875rem",
  md: "0.9375rem",
  base: "1rem",
  lg: "1.0625rem",
  xl: "1.125rem",
  "2xl": "1.25rem",
  "3xl": "1.5rem",
  // Large fixed step for stat figures (admin dashboard summary numbers).
  "4xl": "2rem",
  // Fluid display sizes (clamp: min, preferred, max).
  hero: "clamp(2.5rem, 6vw + 1rem, 5rem)",
  h1: "clamp(2.25rem, 5vw + 1rem, 4rem)",
  h2: "clamp(1.75rem, 3vw + 1rem, 2.75rem)",
  h3: "clamp(1.25rem, 1.5vw + 1rem, 1.75rem)",
  // In-page section titles — consolidates the per-page section-head sizes.
  section: "clamp(1.5rem, 2.5vw + 0.75rem, 2rem)",
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
    name: "Fig & Foliage",
    rationale:
      "Sampled straight from the invitation art: blush-cream ground, rich fig-burgundy, forest and sage foliage, with Golden-Gate coral as the accent pop. DM Serif Display anchors the headings with a confident editorial serif; Inter keeps the body sharp on every device. The site now reads as one piece with the printed invitation.",
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
  const fontSizeVars = Object.entries(TYPE_SCALE)
    .map(([token, value]) => `  --font-size-${token}: ${value};`)
    .join("\n");
  return `:root {\n${colorVars}\n${fontSizeVars}\n}`;
}
