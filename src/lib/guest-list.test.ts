// Tests for the pure Guest List row parser: header/empty skipping, blank
// party_id => party of one, plus_one_allowed parsing, source (col F) parsing,
// malformed-cell tolerance, plus guest_id minting.

import { describe, expect, it } from "vitest";
import { isAddedPlusOne, nextGuestId, parseGuestRows } from "./guest-list";

describe("parseGuestRows", () => {
  it("parses well-formed rows and skips the header", () => {
    const guests = parseGuestRows([
      ["guest_id", "name", "party_id", "side", "plus_one_allowed", "source"],
      ["g001", "John Smith", "p001", "groom", "TRUE"],
      ["g002", "Jane Smith", "p001", "bride", "false"],
    ]);
    expect(guests).toEqual([
      {
        guestId: "g001",
        name: "John Smith",
        partyId: "p001",
        side: "groom",
        plusOneAllowed: true,
        source: "invitation",
      },
      {
        guestId: "g002",
        name: "Jane Smith",
        partyId: "p001",
        side: "bride",
        plusOneAllowed: false,
        source: "invitation",
      },
    ]);
  });

  it("treats a blank party_id as a party of one keyed by the guest id", () => {
    const [guest] = parseGuestRows([["g009", "Solo Guest", "", "unknown", "no"]]);
    expect(guest.partyId).toBe("g009");
  });

  it("skips empty rows and rows missing a guest_id or name", () => {
    const guests = parseGuestRows([
      ["", "", "", "", ""], // empty
      ["", "No Id Person", "p001", "groom", "yes"], // missing guest_id
      ["g010", "", "p001", "groom", "yes"], // missing name
      ["g011", "Real Guest", "p002", "bride", "yes"], // kept
    ]);
    expect(guests.map((g) => g.guestId)).toEqual(["g011"]);
  });

  it("reads various truthy/falsy plus_one_allowed values without throwing", () => {
    const [yesTrue, yesYes, yesOne, noBlank, noGarbage] = parseGuestRows([
      ["g1", "A", "p1", "x", "TRUE"],
      ["g2", "B", "p2", "x", "Yes"],
      ["g3", "C", "p3", "x", "1"],
      ["g4", "D", "p4", "x", ""],
      ["g5", "E", "p5", "x", "maybe"],
    ]);
    expect(yesTrue.plusOneAllowed).toBe(true);
    expect(yesYes.plusOneAllowed).toBe(true);
    expect(yesOne.plusOneAllowed).toBe(true);
    expect(noBlank.plusOneAllowed).toBe(false);
    expect(noGarbage.plusOneAllowed).toBe(false);
  });

  it("trims surrounding whitespace on every field", () => {
    const [guest] = parseGuestRows([
      ["  g012 ", "  Trim Me ", " p003 ", " groom ", " true ", " plus-one "],
    ]);
    expect(guest).toEqual({
      guestId: "g012",
      name: "Trim Me",
      partyId: "p003",
      side: "groom",
      plusOneAllowed: true,
      source: "plus-one",
    });
  });

  it("parses source with a blank default; existing 5-column rows read invitation", () => {
    const [added, invited, legacy] = parseGuestRows([
      ["g066", "Sam Lee", "p005", "bride", "FALSE", "plus-one"],
      ["g067", "Pat Doe", "p006", "groom", "FALSE", ""], // blank source
      ["g001", "John Smith", "p001", "groom", "TRUE"], // no col F at all
    ]);
    expect(added.source).toBe("plus-one");
    expect(isAddedPlusOne(added)).toBe(true);
    expect(invited.source).toBe("invitation");
    expect(isAddedPlusOne(invited)).toBe(false);
    expect(legacy.source).toBe("invitation");
  });
});

describe("nextGuestId", () => {
  it("mints the next id after the current max, padded to existing width", () => {
    const guests = parseGuestRows([
      ["g001", "A", "p1", "x", "FALSE"],
      ["g065", "B", "p2", "x", "FALSE"],
    ]);
    expect(nextGuestId(guests)).toBe("g066");
  });

  it("starts at g001 for an empty list", () => {
    expect(nextGuestId([])).toBe("g001");
  });

  it("preserves wider numbering and ignores non-gNNN ids", () => {
    const guests = parseGuestRows([
      ["g099", "A", "p1", "x", "FALSE"],
      ["g100", "B", "p2", "x", "FALSE"],
      ["weird", "C", "p3", "x", "FALSE"],
    ]);
    expect(nextGuestId(guests)).toBe("g101");
  });
});
