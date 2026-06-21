---
id: 019eebb3-fedc-70b9-8974-169d21246144
status: accepted
date: 2026-06-21
---
# angelaandbrooks.com is served via a Cloudflare Workers Custom Domain

The site currently answers on `angelaandbrooks.brooksryan19.workers.dev`. Go-live binds the apex `angelaandbrooks.com` (and `www`) to the existing `angelaandbrooks` Worker using a **Cloudflare Workers Custom Domain**, not a Route on a separately-proxied DNS record. The Custom Domain makes Cloudflare create/manage the proxied DNS record and edge cert for the Worker automatically, which is the lowest-config, most reversible cutover.

## Considered Options

- **Workers Custom Domain (chosen).** Bind `angelaandbrooks.com` to the Worker in the dashboard or `wrangler.jsonc` `routes` with `custom_domain: true`. Cloudflare provisions the DNS record + TLS. One declarative binding; removal cleanly reverts.
- **Worker Route + manual proxied DNS record.** More moving parts (a separate A/AAAA/CNAME proxied record plus a route pattern); easy to misconfigure. Rejected as unnecessary.
- **Page Rules / redirect from workers.dev.** Doesn't serve the apex; only redirects. Rejected.

## Decision detail

- **Precondition:** `angelaandbrooks.com` must be a zone on this Cloudflare account (`8b02e6c0c3ab72f486d83a89a06c2c3d`). devops verifies the zone exists and nameservers point to Cloudflare BEFORE cutover. If the domain is registered elsewhere with non-CF nameservers, that DNS move is the real gate — surface it, do not force it.
- **Binding:** prefer declaring the custom domain in `wrangler.jsonc` (`routes: [{ pattern: "angelaandbrooks.com", custom_domain: true }, { pattern: "www.angelaandbrooks.com", custom_domain: true }]`) so it's version-controlled and re-applied on every `wrangler deploy`. Dashboard binding is the fallback if the zone/account scoping needs it.
- **`www` → apex:** redirect `www` to the apex (or bind both) so either resolves.
- **Verification:** after binding, confirm `https://angelaandbrooks.com/` returns the gate screen (200, name screen rendered), TLS is valid, and `/admin` still reaches admin auth — i.e. the same smoke test that passed on the workers.dev URL.

## Consequences

- **Reversible.** Removing the custom-domain binding (delete the `routes` entry or unbind in the dashboard) reverts to the `workers.dev` URL with no data impact. DNS changes are revertable; keep a note of any prior records before editing.
- **The workers.dev URL keeps working** as a fallback during/after cutover; no need to disable it.
- **Cert provisioning latency:** Cloudflare-managed edge certs are typically issued in minutes but can lag; verification must wait for an active cert, not just the DNS record.
- **QR + printed assets target the apex.** The QR (issue 88b8) and any printed URL must encode `https://angelaandbrooks.com`, so the QR slice depends on this cutover being the agreed live URL (it can be generated against the apex before the cert is fully active, since the URL string is fixed).
