# Invitation pattern assets (`public/pattern/`)

`tile-full.webp` derives from the invitation's seamless pattern tile
(`docs/source_material/invitation-pattern-tile.png`, 1254×1254 — kept untouched
as the source of record). Regenerate by re-deriving from that source; don't
edit the file in place.

| Asset | Size | Intended zone |
| --- | --- | --- |
| `tile-full.webp` | 1254×1254, ~259 KB | Full-color art tiled as the page "wall". Painted at full saturation on the gate wall; on all guest content pages the same file is muted to a 35%-strength wall by a CSS cream veil layered over it (see below), carried by the shared PatternWall (`src/ui/PatternWall`), so every page shares one cache entry. Never behind body text — panels carry the text. |

## Derivation

**`tile-full.webp`:** the source tile re-encoded as WebP (quality 78), no other
changes. This single file backs every patterned surface:

- **Gate wall** — painted at full saturation (`src/app/gate/page.module.css`),
  so the entry reads as the vivid printed pattern.
- **Content-page wall** — the same file muted in CSS by the shared PatternWall
  (`src/ui/PatternWall.module.css`), used on Home and every guest content page.
  A cream veil of `var(--color-background)` at 65% opacity is layered over the
  tile via `linear-gradient(color-mix(...cream 65%...))`, which composites to
  `cream*0.65 + tile*0.35` — the soft 35%-strength wall where figs read faintly
  colored and the solid panels dominate. The muting cream is sourced from the
  theme token, so a `PALETTE.background` change carries through with no asset
  regeneration (the earlier baked wall tile hard-coded the literal `#ECDFD1`).

Because every content page reuses the gate's exact image URL, a guest who passes
the gate already holds the tile in browser cache when the next page renders —
one download, not two. The source's faint left/right wrap seam stays below
visibility at the wall's 35% strength; a 2×2 tiled composite was re-inspected on
both axes at 1:1 with no visible wrap line.

### Retired

**`wall-tile.webp`** was a separately-baked soft copy (the full-color source
blended over cream at 35% via `Image.blend`, baking the literal `#ECDFD1`). It
was removed once the content-page wall moved to muting `tile-full.webp` in CSS:
the CSS route gives the same look, shares the gate's cache entry, and keeps the
cream token-sourced.

**`motif-fig-branch.webp` / `motif-bridge.webp`** were standalone vignettes
(fig-branch and Golden Gate) cropped from the source for corner/divider ornament
use — the crop's cream ground normalized to `#ECDFD1` with a ~42px alpha feather
so border-cut foliage faded out instead of ending hard. The ruled treatment
carries the pattern with the wall alone (no ornaments), so both crops were
removed as zero-referenced.
