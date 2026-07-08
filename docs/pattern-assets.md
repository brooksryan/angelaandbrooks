# Invitation pattern assets (`public/pattern/`)

All four assets derive from the invitation's seamless pattern tile
(`docs/source_material/invitation-pattern-tile.png`, 1254×1254 — kept untouched
as the source of record). Regenerate by re-deriving from that source; don't
edit these files in place.

| Asset | Size | Intended zone |
| --- | --- | --- |
| `wall-tile.webp` | 1254×1254, ~139 KB | Page-background "wall" behind solid content panels. Tile with `background-repeat: repeat`; display width ~600–900px per tile on desktop (native 1254px keeps it retina-crisp at 2x). |
| `tile-full.webp` | 1254×1254, ~259 KB | Full-color art for text-free accent zones only: hero band, section dividers. Never behind body text. |
| `motif-fig-branch.webp` | 350×340, ~28 KB | Standalone fig-branch vignette for corner/divider ornament use. |
| `motif-bridge.webp` | 370×240, ~19 KB | Standalone Golden Gate vignette for corner/divider ornament use. |

## Derivation

**`wall-tile.webp` (soft full-color, 35% strength):** the full-color source
alpha-composited over a solid theme-background-cream `#ECDFD1` ground at 35%
opacity (`Image.blend(cream, source, 0.35)`, WebP quality 82). Figs read
faintly red and foliage green while every value stays lifted well toward
cream, so the pattern stays a wall, not the content. This replaced the
original sage duotone after the Team Lead's Home-prototype ruling asked for
more of the invitation's color in the wall. A 25%-opacity variant was the
runner-up candidate; regenerate either by re-running the blend at the chosen
opacity. The source's faint left/right wrap seam stays below visibility at
this strength; a 2×2 tiled composite was re-inspected on both axes at 1:1
with no visible wrap line.

**`tile-full.webp`:** the source tile re-encoded as WebP (quality 78), no other
changes.

**Motif crops:** regions cropped from the source; the tile's ground color is
normalized to exactly the theme background cream `#ECDFD1` so each ornament
melts into a token-cream page, and the crop edges carry a ~42px alpha feather
so border-cut foliage fades out instead of ending hard. They are designed to
sit on `--color-background` (or `surface`) — on any other color the cream
ground shows.
