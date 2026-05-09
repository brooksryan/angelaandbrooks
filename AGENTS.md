<!-- BEGIN:nextjs-agent-rules -->
# Cloudflare Workers via OpenNext, not Cloudflare Pages

This project deploys to Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — **not** `@cloudflare/next-on-pages` (archived) and **not** Cloudflare Pages (being retired). The build pipeline is `pnpm cf:build` → `.open-next/worker.js`. CI deploys via `wrangler deploy`.

Two non-obvious things this implies:

1. **Do not export `runtime = 'edge'` from any page or route handler.** OpenNext on Cloudflare runs the Node.js compatibility layer in Workers; pages declaring the edge runtime cause `pnpm cf:build` to fail with `OpenNext requires edge runtime function to be defined in a separate function`. Pages run on the default runtime.
2. **Next.js is pinned to `15.5.16` exactly.** Don't upgrade to 16.x — the OpenNext adapter has a live bug (#1258) where every dynamic route 500s. Don't downgrade below 15.5.16 — that release contains the fix for an App Router middleware auth CVE (CVE-2026-44575).

`eslint-config-next` is also pinned to `15.5.16` to match Next, and the eslint flat-config uses `FlatCompat` because the 15.x package ships rule presets as legacy `extends` strings.
<!-- END:nextjs-agent-rules -->
