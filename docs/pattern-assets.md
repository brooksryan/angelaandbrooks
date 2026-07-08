# Invitation pattern assets (`public/pattern/`)

All three assets derive from the invitation's seamless pattern tile
(`docs/source_material/invitation-pattern-tile.png`, 1254×1254 — kept untouched
as the source of record). Regenerate by re-deriving from that source; don't
edit these files in place.

| Asset | Size | Intended zone |
| --- | --- | --- |
| `tile-full.webp` | 1254×1254, ~259 KB | Full-color art tiled as the page "wall". Painted at full saturation on the gate wall; on Home the same file is muted to a 35%-strength wall by a CSS cream veil layered over it (see below), so both pages share one cache entry. Never behind body text — panels carry the text. |
| `motif-fig-branch.webp` | 350×340, ~28 KB | Standalone fig-branch vignette for corner/divider ornament use. |
| `motif-bridge.webp` | 370×240, ~19 KB | Standalone Golden Gate vignette for corner/divider ornament use. |

## Derivation

**`tile-full.webp`:** the source tile re-encoded as WebP (quality 78), no other
changes. This single file backs both patterned pages:

- **Gate wall** — painted at full saturation (`src/app/gate/page.module.css`),
  so the entry reads as the vivid printed pattern.
- **Home wall** — the same file muted in CSS (`src/app/page.module.css`). A cream
  veil of `var(--color-background)` at 65% opacity is layered over the tile via
  `linear-gradient(color-mix(...cream 65%...))`, which composites to
  `cream*0.65 + tile*0.35` — the soft 35%-strength wall where figs read faintly
  colored and the solid panels dominate. The muting cream is sourced from the
  theme token, so a `PALETTE.background` change carries through with no asset
  regeneration (the earlier baked wall tile hard-coded the literal `#ECDFD1`).

Because Home reuses the gate's exact image URL, a guest who passes the gate
already holds the tile in browser cache when Home renders — one download, not
two. The source's faint left/right wrap seam stays below visibility at the
Home wall's 35% strength; a 2×2 tiled composite was re-inspected on both axes
at 1:1 with no visible wrap line.

### Retired

**`wall-tile.webp`** was a separately-baked soft copy (the full-color source
blended over cream at 35% via `Image.blend`, baking the literal `#ECDFD1`). It
was removed once Home's wall moved to muting `tile-full.webp` in CSS: the CSS
route gives the same look, shares the gate's cache entry, and keeps the cream
token-sourced.

**Motif crops:** regions cropped from the source; the tile's ground color is
normalized to exactly the theme background cream `#ECDFD1` so each ornament
melts into a token-cream page, and the crop edges carry a ~42px alpha feather
so border-cut foliage fades out instead of ending hard. They are designed to
sit on `--color-background` (or `surface`) — on any other color the cream
ground shows.
