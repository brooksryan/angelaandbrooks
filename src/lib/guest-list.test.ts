// Tests for the pure Guest List row parser: header/empty skipping, blank
// party_id => party of one, plus_one_allowed parsing, malformed-cell tolerance.

import { describe, expect, it } from "vitest";
import { parseGuestRows } from "./guest-list";

describe("parseGuestRows", () => {
  it("parses well-formed rows and skips the header", () => {
    const guests = parseGuestRows([
      ["guest_id", "name", "party_id", "side", "plus_one_allowed"],
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
      },
      {
        guestId: "g002",
        name: "Jane Smith",
        partyId: "p001",
        side: "bride",
        plusOneAllowed: false,
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
      ["  g012 ", "  Trim Me ", " p003 ", " groom ", " true "],
    ]);
    expect(guest).toEqual({
      guestId: "g012",
      name: "Trim Me",
      partyId: "p003",
      side: "groom",
      plusOneAllowed: true,
    });
  });
});
