---
id: 019f4079-fa3a-74da-a797-b210b4e006c5
status: accepted
date: 2026-07-07
---
# Named plus-ones are also logged to an additive `plus_one_names` reference sheet

When a Guest names a **Plus-one** at RSVP, the +1's name is **additionally** appended to a new `plus_one_names` tab in the same spreadsheet (`GOOGLE_SHEETS_ID`) — a flat, human-readable reference log for the couple's off-website planning (seating, etc.). This is purely additive: the existing **official-guest-list** write-back (ADR 019eebb3-f8db) and the `rsvps` recording are untouched ("main sheet recording stays as is"). The write is best-effort and never fails an RSVP, and it is deduped to one row per distinct +1 per party.

## Considered Options

- **Additive reference sink (chosen).** Keep the official-guest-list first-class-Guest write-back exactly as ADR 019eebb3-f8db defines it, and append a second, flat log to `plus_one_names`. The +1 name lands in two places by design — the canonical roster join and a flat reference view — for two different uses. Additive means reversible (delete the tab + revert the code) and it does not touch tested Sprint-2 write-back.
- **Reference sheet *replaces* the official-guest-list write-back.** Route +1 names only to `plus_one_names` and stop minting them as first-class Guests. Rejected — it contradicts "main sheet recording stays as is," loses the stable `guest_id` + roster join the write-back exists to provide, and rips out tested, shipped Sprint-2 code (non-reversible).
- **Make the log a hard, blocking write.** Fail the whole RSVP if the `plus_one_names` append fails. Rejected — a convenience reference log must never block a guest's actual RSVP; the source of record (rsvps + official-guest-list) is already written before the log runs.
- **Append every submit (no dedup).** Simpler, but a guest who re-submits (dietary edits, etc.) produces duplicate +1 rows the couple must reconcile by eye. Rejected in favor of the free dedup below.

## Decision detail

- **Tab & addressing.** New `plus_one_names` tab in the same spreadsheet. Its reference (gid or literal title) is configured via a new `GOOGLE_SHEET_TAB_PLUS_ONE_NAMES` env var and resolved through the existing `resolveTabTitle` path (numeric ⇒ gid lookup, else literal), matching how `official-guest-list` is addressed. No code reads this tab, so it needs no header-strip logic; the couple may add a header row by hand.
- **Columns (A:F).** `timestamp`, `party_id`, `host_guest_id`, `host_name`, `plus_one_name`, `plus_one_guest_id`. Identity fields only — `+1` dietary is deliberately excluded because it lives canonically in `rsvps` (latest-wins) and a point-in-time copy here would go stale on a dietary-only re-submit.
- **When written.** Server-side in the RSVP handler's existing named-`+1` path, **after** the `rsvps` rows are written, so the log never references an RSVP that failed to record. Uses the read-write Sheets scope the `wedding-rsvp-writer` service account already holds — no new secret or permission.
- **Best-effort / non-blocking.** The append is wrapped so a failure is logged server-side and swallowed; the RSVP still returns success. The source of record is already persisted before this runs.
- **Idempotency = one row per distinct +1 per party.** The append is gated on the write-back minting a *new* `guest_id` (`resolvePlusOneGuestId` returning `isNew`). This reuses the idempotency check the handler already performs — no extra sheet read — so re-submitting the same +1 adds no duplicate row, while a genuinely different name adds one. `rsvps` remains the full per-submit audit trail; `plus_one_names` is the deduped reference view.

## Consequences

- **Does NOT amend ADR 019eebb3-f8db.** The official-guest-list write-back — mint/reuse `guest_id`, append the +1 as a first-class Guest with `source = "plus-one"` — is unchanged. This ADR adds a sink alongside it; it does not revise it.
- **The +1 name is recorded in two places by design.** official-guest-list holds the canonical, deduped Guest (the roster join keyed on `guest_id`); `plus_one_names` holds a flat, human-readable log. Redundant but harmless — different shapes for different uses.
- **Reversible.** Append-only to a new tab plus one env var and best-effort code — delete the tab and revert the code to remove it entirely, with no impact on rsvps or the Guest List.
- **Setup prerequisite.** The `plus_one_names` tab must exist and `GOOGLE_SHEET_TAB_PLUS_ONE_NAMES` must be set before the write does anything; until then the best-effort write simply no-ops-with-a-log and RSVPs are unaffected.
- **Distinct from the client slice.** The RSVP form change that makes a named +1 an explicit, required choice (issue 019f4043-bf72) is client-only; this write hooks the pre-existing server-side named-`+1` trigger, so it carries no hard dependency on that slice.
