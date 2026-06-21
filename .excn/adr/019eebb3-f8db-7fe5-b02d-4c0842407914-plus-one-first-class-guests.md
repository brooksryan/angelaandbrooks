---
id: 019eebb3-f8db-7fe5-b02d-4c0842407914
status: accepted
date: 2026-06-21
---
# Named plus-ones become first-class Guests via idempotent RSVP write-back

A named **Plus-one** stops being a write-only `rsvps` row with an empty `guest_id`. At RSVP submit, a named +1 is (a) minted a real `guest_id`, stamped on its `rsvps` row, and (b) appended to the **Guest List** (`official-guest-list` tab) carrying the host's `party_id`, the host's `side`, `plus_one_allowed = FALSE`, and a new `source` marker. This **reverses two Sprint-1 decisions on purpose**: the Sprint-1 PRD listed "RSVP write-back onto Guest rows" as out of scope, and ADR 019eeb28 made `is_plus_one` *derivable from an empty `guest_id`*. Both change here at the Team Lead's request so the couple gets a single, complete Guest List (invited + actual +1s) with stable ids for every attendee.

## Considered Options

- **Keep +1s as empty-`guest_id` rows (Sprint-1 status quo).** Simplest, but the +1 never gets a stable id and never appears on the Guest List, so the couple can't see or manage actual attendees in one place. Rejected per the new requirement.
- **Mint the id but DON'T write back to the Guest List.** Stamps the `rsvps` row only. Half-measure — the admin roster still can't show the +1 as a guest. Rejected.
- **Write back, dedupe on a new `source` column (chosen).** Append the +1 to the Guest List with `source = "plus-one"` (original rows are blank / `"invitation"`). The reader treats blank as invitation, so the existing 65 rows are untouched and backward-compatible.
- **Overwrite/edit existing rows to mark +1 status.** Rejected — destructive, not reversible, and races with the couple's manual Sheet edits.

## Decision detail

- **Minting `guest_id`:** server-side at submit, read the current Guest List, take `max(gNNN) + 1`. Acceptable at wedding scale (low concurrency); idempotency (below) absorbs the rare race.
- **Idempotency key = (`party_id` + normalized +1 name).** Before appending, look up whether a +1 with that normalized name already exists for that host's `party_id`. If yes, **reuse** its `guest_id` (no second append); if no, mint + append. A +1 named twice across re-submits resolves to one Guest List row and one stable id. `rsvps` stays append-only (re-submits add rows; latest-wins on read).
- **`source` column** is additive on the Guest List (new trailing column). Blank ⇒ invitation; `"plus-one"` ⇒ added via RSVP. The `guest-list.ts` reader parses it with a blank default.
- **`is_plus_one` is no longer derived from an empty `guest_id`.** It is now `source == "plus-one"` on the Guest List (or, equivalently for the admin join, a Guest whose row was RSVP-added). The admin roster (eb6f) keys `rsvps` ↔ Guest List on `guest_id` and classifies by `source`.

## Consequences

- **Reversible.** All writes are append-only (new Guest List rows, new `rsvps` rows) plus one additive column — no destructive edits. Rolling back = delete the `source != "invitation"` rows and revert the code; the `sprint-1-stable` tag + the saved `scripts/guest-list-preview.tsv` restore the pre-Sprint-2 Guest List exactly.
- **Contract updates required.** CONTEXT.md (the `is_plus_one` definition and a new `source` term) and ADR 019eeb28's "`is_plus_one` derivable / no write-back" statements are superseded by this ADR — note the supersession rather than rewriting history.
- **Admin roster must read `source`.** eb6f's join and the "added plus-one" classification depend on the new column; build eb6f after this slice's reader change lands.
- **Plus_one_allowed stays FALSE for added +1s** so an added +1 cannot themselves invite a further +1.
