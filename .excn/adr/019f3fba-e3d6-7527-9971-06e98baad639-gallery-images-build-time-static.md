---
id: 019f3fba-e3d6-7527-9971-06e98baad639
status: accepted
date: 2026-07-07
---
# Gallery images are pre-generated at build time and served as static assets — no runtime image optimization

The Gallery's photos are a curated, repo-committed set (~15–30 at launch, ~50–100 post-wedding). A build-time `sharp` script generates the responsive variants — an AVIF+WebP width ladder plus a tiny blur placeholder — into `public/gallery/`, and OpenNext ships them as Cloudflare Workers static assets, which are served free and unlimited. Components render them with `<picture>`/`srcset` markup (or `next/image` with a custom loader mapping widths to pre-generated files). We deliberately do NOT use the documented OpenNext runtime path (Cloudflare Images / `/cdn-cgi/image` loader): the set is small and known at build time, so runtime transformation buys nothing while adding a zone feature to enable, a 5,000-unique-transforms/month free-tier cap, an open CPU/billing bug in the images binding (opennextjs-cloudflare#1125), and the attack surface class patched in CVE-2026-3125.

## Considered Options

- **Build-time `sharp` variants + static assets (chosen).** Zero runtime cost, zero new infrastructure, deterministic output, no transformation quota, no `/cdn-cgi/image` surface. ~100 photos × 4 variants ≈ 400 files against the 20,000-file Workers static-asset limit.
- **Runtime Cloudflare Images loader.** The documented OpenNext path; earns its keep only for unbounded or user-uploaded images. Rejected for the runtime dependency and footguns above, not cost (400 unique transforms fits the free tier).
- **Extend the hero's `unoptimized` single-file pattern.** Correct for one hero image; wrong for a grid — `unoptimized` emits no `srcset`, so every phone downloads full-size files. Rejected.

## Consequences

- Adding a photo = drop the master in, run the generation script (wired into `prebuild`), commit, deploy. No admin upload path exists or is planned.
- The hero keeps its existing `unoptimized` pattern; this ADR governs the Gallery set.
- If a future feature needs unbounded/user-submitted images, this decision does not extend to it — that's when the runtime loader conversation reopens.
