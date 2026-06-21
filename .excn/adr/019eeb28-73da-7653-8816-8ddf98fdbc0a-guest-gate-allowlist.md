---
id: 019eeb28-73da-7653-8816-8ddf98fdbc0a
status: accepted
date: 2026-06-21
---
# Guest gate is a whole-site name allowlist over Google Sheets, keyed by guest_id

The site moves from fully public to gated: a `middleware.ts` rewrites every unauthenticated visitor to a name screen, and access is granted by matching a typed name against a new `guests` tab in the existing RSVP spreadsheet — each guest carrying a stable `guest_id` and a `party_id` that groups couples. A match issues a signed, ~90-day cookie (the admin HMAC pattern, own `GATE_SECRET`) that the gate carries as an access token; the cookie holds `guestId`/`partyId` only, and `/rsvp` re-reads the sheet for current `plus_one_allowed` so flipping a flag stays authoritative without a per-request sheet read. We chose this over a shared password (we want to know *who* visited and pre-fill their RSVP) and over a real auth provider (Google Sheets is already the system of record; no second datastore for ~71 guests).

## Considered Options

- **Shared password / passphrase** — near-zero admin, but anonymous: no identity to pre-fill RSVP or join against, and no per-guest control. Rejected.
- **Per-invitation token in the QR** — strongest UX (skip the name screen), but requires unique printed URLs per household and per-token infra. Rejected as overkill for the guest count.
- **Auth provider / separate DB** — heavier than the problem; the sheet is already authoritative. Rejected.
- **Name as the join key** — fragile across misspellings, re-sorts, and two guests sharing a first name. Rejected in favor of a server-assigned `guest_id`.

## Consequences

- **Guest list feeds, RSVPs append, admin joins.** The `guests` tab drives the gate, RSVP pre-fill, and the `+1` decision; RSVP submissions keep appending to the `rsvps` tab (now stamped with `party_id` + `guest_id`); the admin dashboard LEFT-JOINs the two on `guest_id`, de-duping latest-wins, so "who hasn't replied" is a read, not a write-back. No second source of truth, no update-by-row.
- **RSVP fans out to one row per person.** One submitter answers for their whole party (loaded by `party_id`); the form writes one `rsvps` row per answered member, and a named `+1` becomes its own row (`guest_id` empty, `party_id` set). `is_plus_one` is therefore *derivable*, not stored.
- **Admin gains a scoped write surface.** Adding a guest happens through `/admin` (which mints the `guest_id` and offers a party selector), not by hand-editing the sheet. This **relaxes the previously absolute "admin is read-only over the sheet" contract** — the relaxation is scoped to *appending to the `guests` tab only*; RSVP data and guest-facing content stay read-only. CONTEXT.md and TEAM_DIRECTIVE must be updated to match (a context-grill item).
- **New domain terms** this introduces — `Household`/`Party`, `Guest List` (the allowlist, distinct from the RSVP Sheet), `guest_id`, `plus_one_allowed` — need adding to CONTEXT.md before ship.
- **Cookie is a snapshot of access, not of state.** Staleness is bounded by the ~90-day expiry; `plus_one_allowed` is the one live-read exception. Removing a guest after they've been issued a cookie does not revoke access until expiry — acceptable at this scale.
- **Middleware must exempt `/admin` + `/api/admin`** so the two auth systems (guest gate vs. admin login) never push a user through the wrong one.
