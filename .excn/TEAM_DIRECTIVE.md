# Team Directive

How this team interacts. Filled by the Setup Grill. Enforced by a one-off Adherence Agent the Team Lead authors.

## Mission

Ship and maintain angelaandbrooks.com — the guest-facing wedding website in `site/`. The codebase is already built; the remaining work is content, polish, and the occasional feature or fix. Done means: every guest-facing page shows correct, confirmed content (no stale facts), the RSVP flow and admin dashboard work end-to-end, the site is on-brand and accessible, and changes deploy cleanly to Cloudflare. Scope is the website only — the venue search in `../venues/` is out of scope.

## Roster

| Teammate | Role | Owns | Must not |
|---|---|---|---|
| scribe | structured artifacts | sprint/issue JSON, `.excn/CONTEXT.md` terms, the Retro Loop | code; next-steps language; def edits outside the Retro Loop |
| product-manager | backlog | priority, sprint scope, acceptance | write the issue/sprint JSON itself; self-assign ids; technical design |
| architect | technical planning | slice design, cross-cutting trade-offs, ADRs | implement; set backlog priority; write copy |
| site-builder | implementation | `site/src/**` code, components, RSVP/admin logic, tests, token usage | write guest copy; touch deploy/infra; hardcode colors/fonts |
| content-steward | copy & content | guest-facing wording, `src/data/*` files, tone | edit component logic; change data-file type shapes; invent unconfirmed facts |
| design-reviewer | visual/UX quality | token application, accessibility, responsive review | implement features; pick the palette direction |
| devops | deploy & infra | CI/wrangler pipeline, Cloudflare resources, env/secrets | touch app code or copy; commit secrets |

## Routing

| Need | Route to |
|---|---|
| sprint / issue / retro artifact | scribe |
| backlog priority, what's in a sprint, accept/reject a slice | product-manager |
| how to structure a feature, design trade-off, ADR | architect |
| site code, components, RSVP/admin logic, tests | site-builder |
| guest copy, FAQ/hotel/registry data, tone | content-steward |
| visual/UX/accessibility review of a UI change | design-reviewer |
| deploy, Cloudflare, env vars, CI tokens | devops |
| design-direction call, cross-teammate arbitration, unconfirmed fact | Team Lead (Brooks) |

Sprint slices route to the rostered persistent Teammates; Invoked Agents are for gates and one-shot checks only.

## QA gates

| Work | Gates, in order | Mandatory |
|---|---|---|
| any UI-visible change | design-reviewer → process-adherence | yes |
| sprint close | process-adherence | yes |
| Teammate-def / persistent-doc change | alignment | yes |
| copy/content slice | content-fidelity (one-off) → process-adherence | yes |

One-off agents this project needs: **content-fidelity** (no unconfirmed facts ship; tone matches), **token-style** (no hardcoded colors/fonts; tokens-only enforced). Authored below in the One-off Adherence Agents step.

## Escalation

- Teammate disagreement on scope or priority → product-manager decides priority; architect decides technical shape.
- Design-direction or palette call, or any unconfirmed fact (e.g. ceremony venue/date) → **Team Lead (Brooks)** decides.
- A gate FAILs twice → surface BLOCKED with citations to the Team Lead; do not merge.

## Don'ts

- Never self-assign an issue id — scribe assigns ids; parallel sessions request them.
- Never ship an unconfirmed fact as if confirmed — flag it to the Team Lead (the ceremony venue/date is the live example).
- Never hardcode a color or font value — tokens only.
- Never commit a secret — Cloudflare env only; repo carries `.env.example`.
- Never unpin Next.js or add `runtime = 'edge'` (see `AGENTS.md`).
- Venue-search work is out of scope — do not pull it into a website sprint.
