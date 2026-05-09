# angelaandbrooks.com

Wedding website for Angela and Brooks. Ceremony Friday October 23 and dinner reception Saturday October 24, 2026 at Che Fico in San Francisco.

## Stack

- Next.js 15.5.16 (App Router) with TypeScript strict mode — pinned to 15.x because Next 16 has a live bug (#1258) where every dynamic route 500s on the OpenNext adapter, and 15.5.16 specifically because that release is the fix for an App Router middleware auth CVE (CVE-2026-44575).
- Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — the previously-used `@cloudflare/next-on-pages` was archived in September 2025 and Cloudflare Pages itself is being retired in favor of Workers + static assets.
- CSS custom properties for theming.
- Google Sheets API v4 for RSVP submissions.

## Development

```bash
pnpm install
pnpm dev        # local dev at http://localhost:3000
pnpm lint       # eslint
pnpm build      # next build (sanity check; doesn't bundle for Workers)
pnpm cf:build   # opennextjs-cloudflare build — produces .open-next/worker.js
pnpm preview    # cf:build + wrangler dev (preview the Worker locally)
pnpm deploy     # cf:build + wrangler deploy (manual deploys only — CI is the normal path)
```

CI deploys run on push to `main` via GitHub Actions invoking `wrangler deploy` (Infra owns the workflow setup).

## Environment variables

Real values live in Cloudflare Workers env vars (set via `wrangler secret put` or the dashboard), never in the repo. See `.env.example` for the full list and meaning of each var.

- `GOOGLE_SHEETS_ID` — RSVP destination sheet
- `GOOGLE_SERVICE_ACCOUNT_KEY` — base64-encoded JSON key for the `wedding-rsvp-writer` service account
- `ADMIN_USER_1` / `ADMIN_PASS_1` — admin credentials, pair 1
- `ADMIN_USER_2` / `ADMIN_PASS_2` — admin credentials, pair 2

For local dev, copy `.env.example` to `.env.local` and fill values.

## Repo conventions

- **No `export const runtime = 'edge'`.** OpenNext on Cloudflare runs the standard Node.js compatibility layer in Workers — edge-runtime exports cause the build to fail (`OpenNext requires edge runtime function to be defined in a separate function`). Pages run on the default (Node-compat) runtime.
- **No Node-runtime middleware.** Middleware must use the edge runtime if we add any; OpenNext doesn't support Node-runtime middleware.
- Theme tokens (CSS custom properties) are the only allowed source of color and font values in components — no hardcoded hex codes or font names.
- Issues are tracked at <https://github.com/brooksryan/angelaandbrooks/issues>.
