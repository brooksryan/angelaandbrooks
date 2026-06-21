// Tests for the admin roster join (eb6f): classify invited-replied,
// invited-not-replied, added-plus-one, legacy-orphan; latest-wins on guest_id;
// counts and the not-replied list.

import { describe, expect, it } from "vitest";
import { buildRoster, type RsvpRow } from "./admin-sheet";
import type { Guest } from "./guest-list";

function guest(
  guestId: string,
  name: string,
  partyId: string,
  source = "invitation"
): Guest {
  return { guestId, name, partyId, side: "groom", plusOneAllowed: false, source };
}

function rsvp(
  guestId: string,
  fullName: string,
  attending: boolean | null,
  iso: string,
  partyId = "p001"
): RsvpRow {
  return {
    timestampIso: iso,
    timestamp: iso ? new Date(iso) : null,
    fullName,
    attending,
    plusOneName: "",
    dietaryRestrictions: "",
    partyId,
    guestId,
  };
}

describe("buildRoster", () => {
  it("classifies invited-replied, invited-not-replied, and added-plus-one", () => {
    const guests = [
      guest("g001", "John Smith", "p001"),
      guest("g002", "Jane Smith", "p001"),
      guest("g066", "Sam Lee", "p001", "plus-one"),
    ];
    const rsvps = [
      rsvp("g001", "John Smith", true, "2026-06-01T10:00:00Z"),
      rsvp("g066", "Sam Lee", true, "2026-06-01T10:00:00Z"),
      // g002 never replied.
    ];

    const roster = buildRoster(guests, rsvps);
    const byId = Object.fromEntries(
      roster.entries.map((e) => [e.guestId, e.classification])
    );
    expect(byId.g001).toBe("invited-replied");
    expect(byId.g002).toBe("invited-not-replied");
    expect(byId.g066).toBe("added-plus-one");

    expect(roster.counts).toEqual({
      invited: 2, // g001 + g002 (g066 is an added +1, not "invited")
      replied: 1,
      notReplied: 1,
      addedPlusOnes: 1,
    });
    expect(roster.notReplied.map((e) => e.guestId)).toEqual(["g002"]);
  });

  it("takes latest-wins per guest_id", () => {
    const guests = [guest("g001", "John Smith", "p001")];
    const rsvps = [
      rsvp("g001", "John Smith", false, "2026-06-01T10:00:00Z"),
      rsvp("g001", "John Smith", true, "2026-06-05T10:00:00Z"), // newer
    ];
    const roster = buildRoster(guests, rsvps);
    const entry = roster.entries.find((e) => e.guestId === "g001");
    expect(entry?.attending).toBe(true);
    expect(roster.counts.replied).toBe(1); // one guest, not two rows
  });

  it("shows a blank-guest_id RSVP row as a legacy orphan (not dropped)", () => {
    const guests = [guest("g001", "John Smith", "p001")];
    const rsvps = [
      rsvp("g001", "John Smith", true, "2026-06-01T10:00:00Z"),
      rsvp("", "Mystery Plus One", true, "2026-06-02T10:00:00Z"),
    ];
    const roster = buildRoster(guests, rsvps);
    const orphans = roster.entries.filter(
      (e) => e.classification === "legacy-orphan"
    );
    expect(orphans).toHaveLength(1);
    expect(orphans[0].name).toBe("Mystery Plus One");
    // Orphans don't count toward invited/replied.
    expect(roster.counts.invited).toBe(1);
  });

  it("treats an RSVP with an unknown guest_id as a legacy orphan", () => {
    const guests = [guest("g001", "John Smith", "p001")];
    const rsvps = [rsvp("g999", "Ghost", true, "2026-06-01T10:00:00Z")];
    const roster = buildRoster(guests, rsvps);
    expect(roster.entries.find((e) => e.name === "Ghost")?.classification).toBe(
      "legacy-orphan"
    );
    expect(roster.counts.notReplied).toBe(1); // g001 still awaiting
  });

  it("performs no writes (pure) — input arrays are not mutated", () => {
    const guests = [guest("g001", "John Smith", "p001")];
    const rsvps = [rsvp("g001", "John Smith", true, "2026-06-01T10:00:00Z")];
    const guestsCopy = JSON.parse(JSON.stringify(guests));
    buildRoster(guests, rsvps);
    expect(guests).toEqual(guestsCopy);
  });
});
