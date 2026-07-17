import { describe, expect, it } from "vitest";
import type { RsvpRow } from "./admin-sheet";
import type { Guest } from "./guest-list";
import {
  latestRsvpsByGuestId,
  resolvePartyRsvpState,
} from "./party-rsvp-state";

function guest(
  guestId: string,
  name: string,
  source = "invitation"
): Guest {
  return {
    guestId,
    name,
    partyId: "p001",
    side: "groom",
    plusOneAllowed: false,
    source,
  };
}

function rsvp(
  guestId: string,
  attending: boolean,
  iso: string,
  dietaryRestrictions = ""
): RsvpRow {
  return {
    timestampIso: iso,
    timestamp: new Date(iso),
    fullName: guestId,
    attending,
    plusOneName: "",
    dietaryRestrictions,
    partyId: "p001",
    guestId,
  };
}

const PARTY = [guest("g001", "John Smith"), guest("g002", "Jane Smith")];

describe("resolvePartyRsvpState", () => {
  it("classifies a Party with no matching RSVPs as unanswered", () => {
    const state = resolvePartyRsvpState(PARTY, []);

    expect(state.status).toBe("unanswered");
    expect(state.unansweredGuests.map((entry) => entry.guestId)).toEqual([
      "g001",
      "g002",
    ]);
  });

  it("classifies a Party with one answered Guest as partial", () => {
    const state = resolvePartyRsvpState(PARTY, [
      rsvp("g001", true, "2026-07-10T10:00:00Z"),
    ]);

    expect(state.status).toBe("partial");
    expect([...state.answeredGuestIds]).toEqual(["g001"]);
    expect(state.unansweredGuests.map((entry) => entry.guestId)).toEqual([
      "g002",
    ]);
  });

  it("classifies a Party where every Guest answered as complete", () => {
    const state = resolvePartyRsvpState(PARTY, [
      rsvp("g001", true, "2026-07-10T10:00:00Z"),
      rsvp("g002", false, "2026-07-10T10:00:00Z"),
    ]);

    expect(state.status).toBe("complete");
    expect(state.unansweredGuests).toEqual([]);
  });

  it("uses the latest RSVP row for each guest_id", () => {
    const latest = latestRsvpsByGuestId([
      rsvp("g001", false, "2026-07-10T10:00:00Z"),
      rsvp("g001", true, "2026-07-11T10:00:00Z", "Vegan"),
    ]);

    expect(latest.get("g001")?.attending).toBe(true);
    expect(latest.get("g001")?.dietaryRestrictions).toBe("Vegan");
  });

  it("counts an RSVP-added Plus-one as an answered Party Guest", () => {
    const party = [
      guest("g001", "John Smith"),
      guest("g066", "Sam Lee", "plus-one"),
    ];
    const state = resolvePartyRsvpState(party, [
      rsvp("g001", true, "2026-07-10T10:00:00Z"),
      rsvp("g066", true, "2026-07-10T10:00:00Z"),
    ]);

    expect(state.status).toBe("complete");
  });
});
