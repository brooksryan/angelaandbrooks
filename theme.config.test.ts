// Theme-token completeness check. Per the PRD: "all required CSS custom
// properties present in each palette config." If a future palette is added
// and forgets a token, this test fails before the site ships with a broken
// `var(--color-…)` reference.

import { describe, expect, it, vi } from "vitest";

// `next/font/google` is a build-time placeholder that the Next.js webpack
// plugin replaces with real font instances during compilation. In vitest the
// placeholder throws, so stub each loader to return the minimal shape the
// theme expects (a `variable` className string).
vi.mock("next/font/google", () => {
  const stub = () => ({
    className: "test-font",
    variable: "--test-font-var",
    style: { fontFamily: "test" },
  });
  return { Inter: stub, DM_Serif_Display: stub };
});

const { themes } = await import("./theme.config");
type ThemeColors = (typeof themes)[string]["colors"];

const REQUIRED_COLOR_TOKENS: ReadonlyArray<keyof ThemeColors> = [
  "background",
  "surface",
  "text-primary",
  "text-muted",
  "primary",
  "primary-hover",
  "accent-1",
  "accent-2",
  "border",
];

// WCAG relative-luminance contrast, so the palette can't silently regress below
// the legibility floors the PRD requires: text-primary on background must hit
// AAA (>= 7:1) and primary on background must hit AA (>= 4.5:1).
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe("theme tokens", () => {
  it("ships at least one theme", () => {
    expect(Object.keys(themes).length).toBeGreaterThanOrEqual(1);
  });

  for (const [themeKey, theme] of Object.entries(themes)) {
    describe(`theme "${themeKey}" contrast`, () => {
      it("text-primary on background passes WCAG AAA (>= 7:1)", () => {
        const ratio = contrastRatio(
          theme.colors["text-primary"],
          theme.colors.background,
        );
        expect(ratio).toBeGreaterThanOrEqual(7);
      });

      it("primary on background passes WCAG AA (>= 4.5:1)", () => {
        const ratio = contrastRatio(
          theme.colors.primary,
          theme.colors.background,
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  for (const [themeKey, theme] of Object.entries(themes)) {
    describe(`theme "${themeKey}"`, () => {
      for (const token of REQUIRED_COLOR_TOKENS) {
        it(`defines color.${token} as a non-empty string`, () => {
          const value = theme.colors[token];
          expect(typeof value).toBe("string");
          expect(value.length).toBeGreaterThan(0);
        });
      }

      it("supplies a heading and body font instance", () => {
        expect(theme.fonts.heading).toBeDefined();
        expect(theme.fonts.body).toBeDefined();
        expect(typeof theme.fonts.heading.variable).toBe("string");
        expect(typeof theme.fonts.body.variable).toBe("string");
      });

      it("has a name and rationale string", () => {
        expect(theme.name.length).toBeGreaterThan(0);
        expect(theme.rationale.length).toBeGreaterThan(0);
      });
    });
  }
});
