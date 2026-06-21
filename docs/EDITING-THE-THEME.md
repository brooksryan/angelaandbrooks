# Editing the theme & home photo (self-serve)

Two things you can change yourself, each in one place. Edit → save → rebuild, and
the site picks it up. No developer needed.

> Rebuild/redeploy: these are static pages, so a change shows up after the next
> deploy (push to `main` triggers it), not instantly on the live site.

---

## 1. Colors and fonts

**File to edit:** [`site/theme.config.ts`](../theme.config.ts)

Everything the site renders gets its color and font from this one file. There is
nothing else to touch — changing a value here flows to every page and the admin
area automatically.

### Colors — the nine roles

Near the top, find the block labeled **`1. PALETTE`**. Each line is one color
role with a hex value. Replace the hex; keep the name on the left untouched.

| Role | What it controls | Current value |
|---|---|---|
| `background` | Page background ("wall") | `#F1E7DD` |
| `surface` | Cards, panels, raised surfaces | `#FAF4EE` |
| `text-primary` | Default body + heading text | `#1F1209` |
| `text-muted` | Captions, helper copy, metadata | `#6B5A50` |
| `primary` | CTAs, nav active, primary buttons, key links | `#97271A` |
| `primary-hover` | Hover/focus state for `primary` | `#7A1D14` |
| `accent-1` | Secondary buttons, key borders (~half as often as primary) | `#2C3D2E` |
| `accent-2` | Decorative ornamental touches (~half as often as accent-1) | `#B8893E` |
| `border` | Hairline dividers, input borders, table rules | `#D4C4B6` |

**Format:** a hex color string in quotes, e.g. `primary: "#97271A",`. Keep the
quotes and the trailing comma.

**Contrast re-check (do this after changing colors):** paste the two pairs into
any WCAG contrast checker (e.g. webaim.org/resources/contrastchecker):

- `text-primary` over `background` — must pass **AAA** (ratio ≥ 7:1).
- `primary` over `background` — must pass **AA** (ratio ≥ 4.5:1).

If either fails, darken/lighten the foreground until it passes.

### Fonts — heading and body

In the same file, find the block labeled **`2. FONTS`**. To swap a font:

1. Change the **import line** at the top of the file to the font you want, e.g.
   `import { Playfair_Display, Inter } from "next/font/google";`
2. Change the matching **loader call** in the FONTS block to the new name.
3. **Leave the `variable` value exactly as-is** (`--font-heading` for headings,
   `--font-body` for body) — that's the wire the rest of the site reads.

**Format:** font names use underscores for spaces — "DM Serif Display" becomes
`DM_Serif_Display`. Browse names at <https://fonts.google.com>.

Current: heading = **DM Serif Display**, body = **Inter**.

---

## 2. Home hero photo

**Where the photo goes:** drop a file named exactly **`hero.jpg`** into
**`site/public/`** (so its path becomes `/hero.jpg`).

- **Filename:** `hero.jpg` (exact).
- **Recommended:** a landscape **16:9** engagement photo, ~2000px wide.
- **Alt text:** handled for you — it reads "Angela and Brooks" for any photo of
  the couple, so there's nothing to edit. (To change wording, edit
  `HERO_IMAGE_ALT` in [`site/src/lib/hero-image.ts`](../src/lib/hero-image.ts).)

**Behavior:** with no file present, the home page shows a graceful "Photo coming
soon" placeholder in the exact spot. Drop in `hero.jpg` and it replaces the
placeholder in the same 16:9 box — no layout shift, no code change. Save →
rebuild → it renders.

Other pages stay text-only for now.
