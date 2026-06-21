// Tests for the pure RSVP fan-out: couple-for-both, solo-with-named-+1, partial
// answer, attending=no — asserting the stamped party_id/guest_id keys, plus the
// eligibility and anti-spoof guards.

import { describe, expect, it } from "vitest";
import type { Guest } from "./guest-list";
import { planRsvpRows, resolvePlusOneGuestId } from "./party-rsvp";

function guest(
  guestId: string,
  name: string,
  partyId: string,
  plusOneAllowed = false,
  source = "invitation"
): Guest {
  return { guestId, name, partyId, side: "unknown", plusOneAllowed, source };
}

const COUPLE: Guest[] = [
  guest("g001", "John Smith", "p001"),
  guest("g002", "Jane Smith", "p001"),
];

// A plus_one_allowed solo — party of one keyed by its own guest_id.
const SOLO_WITH_PLUS_ONE: Guest[] = [
  guest("g010", "Denise Park", "g010", true),
];

function rows(result: ReturnType<typeof planRsvpRows>) {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result.rows;
}

describe("planRsvpRows", () => {
  it("couple-for-both: one row per member, each stamped party_id + guest_id", () => {
    const result = planRsvpRows(
      {
        members: [
          { guestId: "g001", attending: "yes", dietaryRestrictions: "No nuts" },
          { guestId: "g002", attending: "yes", dietaryRestrictions: "" },
        ],
      },
      COUPLE
    );
    const out = rows(result);
    expect(out).toEqual([
      {
        fullName: "John Smith",
        attending: true,
        dietaryRestrictions: "No nuts",
        partyId: "p001",
        guestId: "g001",
        isPlusOne: false,
      },
      {
        fullName: "Jane Smith",
        attending: true,
        dietaryRestrictions: "",
        partyId: "p001",
        guestId: "g002",
        isPlusOne: false,
      },
    ]);
  });

  it("solo-with-named-+1: a member row plus a plus-one row flagged for write-back", () => {
    const result = planRsvpRows(
      {
        members: [{ guestId: "g010", attending: "yes" }],
        plusOneName: "  Sam Lee  ",
        plusOneDietary: "Vegan",
      },
      SOLO_WITH_PLUS_ONE
    );
    const out = rows(result);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      fullName: "Denise Park",
      attending: true,
      dietaryRestrictions: "",
      partyId: "g010",
      guestId: "g010",
      isPlusOne: false,
    });
    // The plus-one row: party_id present, guest_id empty here (the handler mints
    // it), isPlusOne true so the handler knows to write it back.
    expect(out[1]).toEqual({
      fullName: "Sam Lee",
      attending: true,
      dietaryRestrictions: "Vegan",
      partyId: "g010",
      guestId: "",
      isPlusOne: true,
    });
  });

  it("partial answer: an unanswered member produces no row", () => {
    const result = planRsvpRows(
      {
        members: [
          { guestId: "g001", attending: "yes" },
          { guestId: "g002", attending: "" }, // not answered
        ],
      },
      COUPLE
    );
    const out = rows(result);
    expect(out).toHaveLength(1);
    expect(out[0].guestId).toBe("g001");
  });

  it("attending=no: writes a row with attending false and the right keys", () => {
    const result = planRsvpRows(
      { members: [{ guestId: "g001", attending: "no" }] },
      COUPLE
    );
    const out = rows(result);
    expect(out).toEqual([
      {
        fullName: "John Smith",
        attending: false,
        dietaryRestrictions: "",
        partyId: "p001",
        guestId: "g001",
        isPlusOne: false,
      },
    ]);
  });

  it("uses the roster name, ignoring any client-sent name (anti-spoof)", () => {
    const result = planRsvpRows(
      {
        members: [
          { guestId: "g001", attending: "yes", fullName: "Hacker McSpoof" },
        ],
      },
      COUPLE
    );
    expect(rows(result)[0].fullName).toBe("John Smith");
  });

  it("ignores answers for guest_ids not in the party", () => {
    const result = planRsvpRows(
      {
        members: [
          { guestId: "g999", attending: "yes" }, // not in party
          { guestId: "g001", attending: "yes" },
        ],
      },
      COUPLE
    );
    const out = rows(result);
    expect(out).toHaveLength(1);
    expect(out[0].guestId).toBe("g001");
  });

  it("drops a plus-one when no party member is plus_one_allowed", () => {
    const result = planRsvpRows(
      {
        members: [{ guestId: "g001", attending: "yes" }],
        plusOneName: "Uninvited Guest",
      },
      COUPLE
    );
    const out = rows(result);
    expect(out).toHaveLength(1);
    expect(out.every((row) => row.guestId !== "")).toBe(true);
  });

  it("returns an error when nothing was answered and no plus-one named", () => {
    const result = planRsvpRows(
      { members: [{ guestId: "g001", attending: "" }] },
      COUPLE
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors._root).toBeTruthy();
  });

  it("rejects over-long dietary notes without writing", () => {
    const result = planRsvpRows(
      {
        members: [
          {
            guestId: "g001",
            attending: "yes",
            dietaryRestrictions: "x".repeat(1001),
          },
        ],
      },
      COUPLE
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["dietary:g001"]).toBeTruthy();
  });
});

describe("resolvePlusOneGuestId", () => {
  const LIST: Guest[] = [
    guest("g001", "John Smith", "p001"),
    guest("g010", "Denise Park", "p005", true),
    // An already-added +1 for party p005.
    guest("g066", "Sam Lee", "p005", false, "plus-one"),
  ];

  it("mints the next id for a brand-new plus-one", () => {
    const result = resolvePlusOneGuestId(LIST, "p005", "Casey New");
    expect(result).toEqual({ guestId: "g067", isNew: true });
  });

  it("reuses the existing id for the same +1 name in the same party (idempotent)", () => {
    const result = resolvePlusOneGuestId(LIST, "p005", "  sam   LEE ");
    expect(result).toEqual({ guestId: "g066", isNew: false });
  });

  it("does not reuse a +1 from a different party", () => {
    const result = resolvePlusOneGuestId(LIST, "p001", "Sam Lee");
    expect(result.isNew).toBe(true);
    expect(result.guestId).toBe("g067");
  });

  it("does not reuse an invitation guest who happens to share the name", () => {
    const result = resolvePlusOneGuestId(LIST, "p001", "John Smith");
    expect(result.isNew).toBe(true); // John is source=invitation, not a +1
  });
});
