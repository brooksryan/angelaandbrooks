# Invitation pattern assets (`public/pattern/`)

All four assets derive from the invitation's seamless pattern tile
(`docs/source_material/invitation-pattern-tile.png`, 1254×1254 — kept untouched
as the source of record). Regenerate by re-deriving from that source; don't
edit these files in place.

| Asset | Size | Intended zone |
| --- | --- | --- |
| `wall-tile.webp` | 1254×1254, ~49 KB | Page-background "wall" behind cream content panels. Tile with `background-repeat: repeat`; display width ~600–900px per tile on desktop (native 1254px keeps it retina-crisp at 2x). |
| `tile-full.webp` | 1254×1254, ~259 KB | Full-color art for text-free accent zones only: hero band, section dividers. Never behind body text. |
| `motif-fig-branch.webp` | 350×340, ~28 KB | Standalone fig-branch vignette for corner/divider ornament use. |
| `motif-bridge.webp` | 370×240, ~19 KB | Standalone Golden Gate vignette for corner/divider ornament use. |

## Derivation

**`wall-tile.webp` (muted duotone):** greyscale of the source, levels set so the
tile's ground maps to white, then a linear two-color ramp from the theme
background cream `#ECDFD1` (light end) down to `rgb(193,191,181)` — a 45% blend
of cream toward the theme sage `#8D9792` (`--color-accent-2`). The darkest art
elements sit ~12 L* below the cream ground, so the pattern reads as
near-watermark texture, not full art. The source's faint left/right wrap seam
falls below visibility at this contrast; a 2×2 tiled composite was inspected at
1:1 and display scale on both axes with no visible wrap line.

**`tile-full.webp`:** the source tile re-encoded as WebP (quality 78), no other
changes.

**Motif crops:** regions cropped from the source; the tile's ground color is
normalized to exactly the theme background cream `#ECDFD1` so each ornament
melts into a token-cream page, and the crop edges carry a ~42px alpha feather
so border-cut foliage fades out instead of ending hard. They are designed to
sit on `--color-background` (or `surface`) — on any other color the cream
ground shows.
