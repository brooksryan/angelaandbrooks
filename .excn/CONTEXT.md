# Angela & Brooks Wedding Website — Domain Context

A pure glossary of this project's domain terms and its team roster — one context, nothing else: no specs, no scratch, no implementation decisions. The Setup Grill seeds it; `execution-context-grill` and scribe add terms as they resolve; deletions need Team Lead approval. Format authority: `.claude/skills/execution-context-grill/CONTEXT-FORMAT.md`.

Scope is the **website only** (the `site/` Next.js app at angelaandbrooks.com). The venue search and vendor outreach in `../venues/` are out of scope for this team — informal, tracked separately.

## Glossary

### Guest
A person invited to the wedding who interacts with the public site. The unit an **RSVP** is about; identified by a **guest_id** on the **Guest List** and grouped into a **Party**.
_Avoid_: "user" (reserve for the technical sense), "attendee".

### RSVP
A guest's submitted reply — attending or not, plus-one name, dietary needs — captured by the **RSVP Form** and written to the **RSVP Sheet**. One submission can answer for a whole **Party**, writing one RSVP row per person, each stamped its **guest_id** and `party_id`.
_Avoid_: "response", "reply form" (the form is the RSVP Form; the data is an RSVP).

### Plus-one
A guest a primary invitee brings, named on the RSVP so the couple can plan seating — allowed only when the inviting Guest's **plus_one_allowed** is TRUE. Not a separate invite. When named, a Plus-one becomes a first-class **Guest**: it is minted a real **guest_id**, stamped on its RSVP row, and appended to the **Guest List** with the host's `party_id`, the host's `side`, `plus_one_allowed` FALSE, and **source** = `plus-one` (ADR 019eebb3-f8db). Write-back is idempotent on `party_id` + normalized name, so naming the same Plus-one twice does not duplicate them.
_Avoid_: "is_plus_one from an empty guest_id" — that Sprint-1 derivation is superseded; **is_plus_one** is now derived from **source** = `plus-one` (this supersedes the matching line in ADR 019eeb28).

### RSVP Sheet
The Google Sheet (`GOOGLE_SHEETS_ID`) that is the system of record for RSVPs, written via the `wedding-rsvp-writer` service account; the same spreadsheet also holds the **Guest List** (`official-guest-list` tab). The site has no other database.
_Avoid_: "the database", "the backend" (it is a Google Sheet).

### Guest List
The allowlist of invited people — one row per known **Guest** — in the `official-guest-list` tab of the **RSVP Sheet**, that the **Name gate** matches a typed name against. Built once from the Invitations tab; the live source thereafter.
_Avoid_: "the guest list" used for the old head-count scratch tab; "allowlist" used loosely.

### Name gate
The whole-site access screen every unauthenticated visitor is rewritten to: a **Guest** types their name, the matcher resolves it against the **Guest List**, and a match issues a signed ~90-day access cookie. Distinct from **Admin Dashboard** auth — the two never cross.
_Avoid_: "login", "password" (there is no guest password; access is by name match).

### Party
The set of **Guests** on one invitation, sharing a `party_id`; the unit one **RSVP** can answer for (one person can RSVP for the whole Party).
_Avoid_: "household", "invitation" (the paper artifact), "couple".

### guest_id
The stable, server-assigned identifier (e.g. `g042`) for one **Guest** — the key the **RSVP** stamp and the **Admin Dashboard** join use, never the name.
_Avoid_: joining or matching on name.

### plus_one_allowed
The per-**Guest** flag on the **Guest List** marking whether that Guest may bring an unlisted **Plus-one**, named at RSVP time. TRUE for a solo invitee with a +1; FALSE for a named couple (each is the other's date).
_Avoid_: "plus-one flag" without the field name — use the column label `plus_one_allowed`.

### source
The **Guest List** column (col F) recording how a **Guest** entered the list: blank or `invitation` for the original allowlist (the first 65 rows), `plus-one` for a Guest added via RSVP write-back (ADR 019eebb3-f8db). The reader defaults blank to `invitation`, so the original rows are untouched. **is_plus_one** is derived from `source == "plus-one"`.
_Avoid_: deriving plus-one status from an empty `guest_id` (the superseded Sprint-1 rule).

### Admin Dashboard
The auth-gated `/admin` area where the couple reads the RSVP roster (the **Guest List** joined to RSVPs) and may append new **Guests** to the **Guest List**. Single shared credential pair. Distinct from the public, guest-facing site.
_Avoid_: "the CMS" — its only write is appending to the Guest List; RSVP data and guest-facing content stay read-only.

### Ceremony
The wedding ceremony event. Date and venue are NOT locked — see Flagged ambiguities. Rendered on the **Details** page, currently a placeholder.

### Reception
The Saturday Oct 24, 2026 dinner reception at **Che Fico** (838 Divisadero St, SF). The one event whose venue, address, and time (5:30–10:30 PM) are confirmed and live on the site.
_Avoid_: "the party", "dinner" used alone when Ceremony is also in scope.

### Theme tokens
The CSS custom properties (`--color-…`, `--font-…`) that are the *only* allowed source of color and font values in components — no hardcoded hex or font names. Active theme: "Classic Mediterranean".
_Avoid_: "styles", "CSS vars" used loosely — tokens specifically means the themed `:root` properties.

### Page
One of the site's guest-facing routes: **Home, RSVP, Details, Travel, Registry, FAQs**. Each is an App Router route under `src/app/`. Registry and FAQs ship a "coming soon" / placeholder state until content is approved.

## Relationships

- A **Guest** belongs to one **Party** and is identified by a **guest_id** on the **Guest List**.
- The **Name gate** matches a typed name against the **Guest List**; a match grants access to every **Page**.
- A **Guest** submits one **RSVP** (optionally naming a **Plus-one** when **plus_one_allowed**); one submission can answer for a whole **Party**. The RSVP lands in the **RSVP Sheet**.
- The **Admin Dashboard** reads the **RSVP Sheet** (Guest List joined to RSVPs) and may append new **Guests** to the **Guest List** — it never writes RSVP data or guest-facing content.
- Every **Page** renders color and font through **Theme tokens** only.
- **Ceremony** and **Reception** are the two events the **Details** page describes.

## Example dialogue

> **Dev:** "Should the admin dashboard let them edit a guest's dietary note?"
> **Brooks:** "No — the Admin Dashboard is read-only over the RSVP Sheet. Edits happen in the sheet."
> **Dev:** "And the Reception time on Details — confirmed?"
> **Brooks:** "Reception yes, Che Fico 5:30–10:30. Ceremony is still open."

## Flagged ambiguities

- **Grouping unit — RESOLVED: Party.** The unit sharing `party_id`; "household", "invitation", and "couple" are avoided aliases.
- **Guest List vs scratch tab — RESOLVED.** The **Guest List** is the `official-guest-list` allowlist tab, distinct from the old head-count "Guest List" scratch tab. Rename the scratch tab to avoid collision (Sheet housekeeping, not a code change).
- **Admin read-only — RELAXED (scoped).** The **Admin Dashboard** may append to the **Guest List** only; RSVP data and guest-facing content stay read-only. The matching `TEAM_DIRECTIVE.md` rule update is chartered with the admin add-guest slice (ADR-0004), not this grill.
- **Ceremony date & venue (UNRESOLVED).** The live site copy says "Ceremony Friday Oct 23 at Che Fico"; the separate venue tracker says "Ceremony Saturday Oct 24 at Sunnyside Conservatory (applied)." These conflict. Deferred to the Work Grill — do not treat either as authoritative until the couple confirms. The **Reception** (Sat Oct 24, Che Fico) is the only confirmed event.

## Team roster

| Teammate | Role | Owns |
|---|---|---|
| scribe | structured artifacts | sprint/issue JSON, CONTEXT.md term additions, the Retro Loop |
| product-manager | backlog | priority, sprint scope, acceptance (scribe writes the records) |
| architect | technical planning | slice design, cross-cutting trade-offs, ADRs |
| site-builder | implementation | `site/src/**` code, components, RSVP/admin logic, tests, token usage |
| content-steward | copy & content | guest-facing wording, `src/data/*` content files, tone |
| design-reviewer | visual/UX quality | token application, accessibility, responsive/mobile review |
| devops | deploy & infra | CI/wrangler pipeline, Cloudflare resources, env vars/secrets |
