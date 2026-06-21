// Guest-list-driven RSVP fan-out — the pure core. Given the live party roster
// and one submitter's answers, it plans the rows to append: one rsvps row per
// answered party member, plus one row for a named Plus-one. No I/O, no clock,
// fully unit-testable; the writer (src/lib/sheets.ts) stamps the timestamp.
//
// Row keys:
//   - member row: party_id = the party's id, guest_id = the member's id
//   - plus-one row: party_id = the party's id, guest_id starts "" here and the
//     handler fills the minted/reused id (ADR 019eebb3-f8db). is_plus_one is now
//     derived from the Guest List `source == "plus-one"`, not an empty guest_id.
//
// Append-only and partial-tolerant: a member with no yes/no answer produces no
// row (stays "not replied"); resubmitting just appends again. Names come from
// the roster, not the client, so a member's identity can't be spoofed.

import { nextGuestId, type Guest } from "./guest-list";
import { normalizeName } from "./guest-match";

const MAX_NAME_LENGTH = 200;
const MAX_DIETARY_LENGTH = 1000;

/** A single row to append to the rsvps tab (timestamp added by the writer). */
export type RsvpRowOut = {
  fullName: string;
  attending: boolean;
  dietaryRestrictions: string;
  partyId: string;
  /**
   * The guest_id stamped on the row. For a member it's their id. For a plus-one
   * it starts "" here and the handler fills in the minted/reused id (ADR
   * 019eebb3-f8db) before the row is written.
   */
  guestId: string;
  /** True for the plus-one row, so the handler knows to write it back. */
  isPlusOne: boolean;
};

export type PlanRsvpResult =
  | { ok: true; rows: RsvpRowOut[] }
  | { ok: false; errors: Record<string, string> };

type MemberAnswerInput = {
  guestId?: unknown;
  attending?: unknown;
  dietaryRestrictions?: unknown;
};

/**
 * Plan the rsvps rows for one submission against the live `party` roster.
 *
 * - `members`: array of per-member answers; only entries whose guestId is in the
 *   party AND whose `attending` is yes/no become rows. Unknown ids are ignored
 *   (anti-spoof); unanswered members are skipped (left "not replied").
 * - Plus-one: written as its own row only when the party actually has a
 *   plus_one_allowed member and a non-empty name is given; otherwise dropped.
 */
export function planRsvpRows(input: unknown, party: Guest[]): PlanRsvpResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { _root: "Body must be a JSON object." } };
  }
  if (party.length === 0) {
    return { ok: false, errors: { _root: "No party to RSVP for." } };
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const byId = new Map(party.map((guest) => [guest.guestId, guest]));
  // Every member of a party shares one party_id (solos: their own guestId).
  const partyId = party[0].partyId;
  const plusOneEligible = party.some((guest) => guest.plusOneAllowed);

  const memberRows: RsvpRowOut[] = [];
  const rawMembers = Array.isArray(data.members) ? data.members : [];
  for (const raw of rawMembers) {
    if (typeof raw !== "object" || raw === null) continue;
    const answer = raw as MemberAnswerInput;

    const guestId = typeof answer.guestId === "string" ? answer.guestId : "";
    const member = byId.get(guestId);
    if (!member) continue; // unknown / spoofed id — ignore

    const attending = parseAttending(answer.attending);
    if (attending === null) continue; // not answered — leave "not replied"

    const dietary =
      typeof answer.dietaryRestrictions === "string"
        ? answer.dietaryRestrictions.trim()
        : "";
    if (dietary.length > MAX_DIETARY_LENGTH) {
      errors[`dietary:${guestId}`] = `Dietary notes for ${member.name} must be ${MAX_DIETARY_LENGTH} characters or fewer.`;
    }

    memberRows.push({
      fullName: member.name, // authoritative name from the roster
      attending,
      dietaryRestrictions: dietary,
      partyId,
      guestId,
      isPlusOne: false,
    });
  }

  let plusOneRow: RsvpRowOut | null = null;
  const plusOneName =
    typeof data.plusOneName === "string" ? data.plusOneName.trim() : "";
  // A plus-one is only honored when the party is actually allowed one — flipping
  // plus_one_allowed off in the sheet drops it even if the client still sends it.
  if (plusOneEligible && plusOneName.length > 0) {
    if (plusOneName.length > MAX_NAME_LENGTH) {
      errors.plusOneName = `Plus-one name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    }
    const plusOneDietary =
      typeof data.plusOneDietary === "string"
        ? data.plusOneDietary.trim()
        : "";
    if (plusOneDietary.length > MAX_DIETARY_LENGTH) {
      errors.plusOneDietary = `Plus-one dietary notes must be ${MAX_DIETARY_LENGTH} characters or fewer.`;
    }
    plusOneRow = {
      fullName: plusOneName,
      attending: true, // a named plus-one is, by definition, coming
      dietaryRestrictions: plusOneDietary,
      partyId,
      guestId: "", // filled by the handler via resolvePlusOneGuestId
      isPlusOne: true,
    };
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const rows = plusOneRow ? [...memberRows, plusOneRow] : memberRows;
  if (rows.length === 0) {
    return {
      ok: false,
      errors: { _root: "Please answer for at least one guest." },
    };
  }
  return { ok: true, rows };
}

function parseAttending(value: unknown): boolean | null {
  if (value === true || value === "yes") return true;
  if (value === false || value === "no") return false;
  return null;
}

export type PlusOneResolution = {
  guestId: string;
  /** True when a new id was minted (caller must append the Guest List row). */
  isNew: boolean;
};

/**
 * Resolve the guest_id for a named plus-one against the full Guest List, keyed
 * by (party_id + normalized name) per ADR 019eebb3-f8db. If a plus-one with that
 * normalized name already exists for the host's party, REUSE its id (idempotent
 * — a +1 named twice never duplicates); otherwise mint the next id. Pure.
 */
export function resolvePlusOneGuestId(
  guests: Guest[],
  partyId: string,
  plusOneName: string
): PlusOneResolution {
  const normalized = normalizeName(plusOneName);
  const existing = guests.find(
    (guest) =>
      guest.source === "plus-one" &&
      guest.partyId === partyId &&
      normalizeName(guest.name) === normalized
  );
  if (existing) {
    return { guestId: existing.guestId, isNew: false };
  }
  return { guestId: nextGuestId(guests), isNew: true };
}
