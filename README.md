# angelaandbrooks.com

Wedding website for Angela and Brooks. Ceremony Friday October 23 and dinner reception Saturday October 24, 2026 at Che Fico in San Francisco.

## Stack

- Next.js 16 (App Router) with TypeScript strict mode
- Cloudflare Pages via [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages) (edge runtime)
- CSS custom properties for theming (swappable palettes via `theme.config.ts` — see issue #5)
- Google Sheets API v4 for RSVP submissions (see issue #12)

## Development

```bash
pnpm install
pnpm dev          # local dev at http://localhost:3000
pnpm lint         # eslint
pnpm build        # next build (no Pages bundling)
pnpm pages:build  # next-on-pages — produces .vercel/output/static
pnpm preview      # pages:build + wrangler pages dev
pnpm deploy       # pages:build + wrangler pages deploy (manual deploys only)
```

CI deploys are wired through the Cloudflare Pages → GitHub integration — pushes to `main` deploy automatically once Infra issue #2 closes.

## Environment variables

Real values live in Cloudflare Pages dashboard env vars, never in the repo. See `.env.example` for the full list and meaning of each var.

- `GOOGLE_SHEETS_ID` — RSVP destination sheet
- `GOOGLE_SERVICE_ACCOUNT_KEY` — base64-encoded JSON key for the `wedding-rsvp-writer` service account
- `ADMIN_USER_1` / `ADMIN_PASS_1` — admin credentials, pair 1
- `ADMIN_USER_2` / `ADMIN_PASS_2` — admin credentials, pair 2

## Repo conventions

- Every App Router page or route handler must declare `export const runtime = 'edge'` — Cloudflare Pages does not support the Node.js runtime on this project.
- Theme tokens (CSS custom properties) are the only allowed source of color and font values in components. No hardcoded hex codes or font names.
- Issues are tracked at <https://github.com/brooksryan/angelaandbrooks/issues>.
