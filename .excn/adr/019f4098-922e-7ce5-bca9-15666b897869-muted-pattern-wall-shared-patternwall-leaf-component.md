---
id: 019f4098-922e-7ce5-bca9-15666b897869
status: accepted
date: 2026-07-08
---
# Muted pattern wall is a shared PatternWall leaf component that guest content pages opt into

The muted invitation-pattern wall (the full-color `public/pattern/tile-full.webp` tiled under a CSS cream veil, with all text floating on solid `--color-surface` panels above it) lives in one place: a `PatternWall` leaf component in `src/ui/`, co-located with its `.module.css`. Guest content pages — Home, Details, Travel, RSVP, Registry, FAQs, Gallery — opt in by wrapping their content in `<PatternWall>`; the component is the single source of the treatment, so changing it is a one-file edit (per the swappable-leaf-components philosophy). Two surfaces deliberately do NOT opt in: the **gate** keeps its own full-color, unveiled `tile-full.webp` treatment (the vivid printed-invitation entry screen), and the **admin surfaces** (`/admin`, `/admin/login`) stay plain (utility, not guest-facing). Because opt-in is per-page, those exclusions are the default state, not overrides someone must maintain.

`tile-full.webp` is now the one pattern image shared across the gate and every guest page. A guest who passes the gate already holds it in browser cache, so the wall paints site-wide with no additional download. The two standalone `motif-*.webp` crops are pruned — the ruled treatment is wall-only, with no motif zones.

## Considered Options

- **Shared `PatternWall` leaf component, per-page opt-in (chosen).** One file owns the treatment; gate and admin are excluded by simply not wrapping; touches `rsvp/` minimally (outer container + header only), which matters because the RSVP +1 feature was being built concurrently in `RsvpForm.tsx`.
- **Hoist the wall to the root layout's `<main>`.** Rejected: `<main>` is shared by the gate and both admin routes, so the muted wall would paint behind all three and require explicit per-route overrides to undo — the opposite of exclusion-by-default.
- **`(guest)` route-group layout.** The idiomatic Next.js way to share a wall across a route set, but it forces every guest page's directory to move — including `rsvp/`, the one path we needed to keep still during concurrent work. Cost outweighed the benefit; a leaf component gives the same single-source-of-truth without the moves.
- **Duplicate the wall CSS per page.** Rejected: violates swappable-leaf / single-source-of-truth — a treatment change would then thread through six files.

## Consequences

- All body/intro text sits on `--color-surface` panels, so each page's contrast ratios are inherited from Home's already-verified panels rather than re-derived against the pattern.
- Nav and Footer render outside `PatternWall` (in the root layout, around `<main>`), so they keep sitting on plain body cream exactly as on Home today.
- A future dev who wants the wall behind admin, or wants to unify the gate onto the muted treatment, is doing so against a recorded decision — both exclusions are intentional, not oversights.
- `tile-full.webp` is load-bearing for the whole site; the two `motif-*.webp` crops are gone but regenerable from `docs/source_material/invitation-pattern-tile.png` if a motif direction is ever revived.
