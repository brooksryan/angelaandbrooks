// Tests for the pure name matcher over a fixture Guest List: normalize, exact,
// one-typo, first-name-only, two-name ambiguity, and no-match.

import { describe, expect, it } from "vitest";
import type { Guest } from "./guest-list";
import { matchGuest, normalizeName, withinOneEdit } from "./guest-match";

function guest(guestId: string, name: string, partyId = guestId): Guest {
  return { guestId, name, partyId, side: "unknown", plusOneAllowed: false };
}

const GUESTS: Guest[] = [
  guest("g001", "John Smith", "p001"),
  guest("g002", "Jane Smith", "p001"),
  guest("g003", "José Núñez", "p002"),
  guest("g004", "Mary-Anne O'Brien", "p003"),
  guest("g005", "John Baker", "p004"), // shares first name "John" with g001
  guest("g006", "Priya Patel", "p005"),
];

describe("normalizeName", () => {
  it("lowercases, strips accents and punctuation, collapses whitespace", () => {
    expect(normalizeName("  José  P. Núñez ")).toBe("jose p nunez");
    expect(normalizeName("Mary-Anne O'Brien")).toBe("mary anne o brien");
    expect(normalizeName("")).toBe("");
  });
});

describe("withinOneEdit", () => {
  it("accepts equal, substitution, insertion, deletion, transposition", () => {
    expect(withinOneEdit("john", "john")).toBe(true); // equal
    expect(withinOneEdit("johx", "john")).toBe(true); // substitution
    expect(withinOneEdit("jonh", "john")).toBe(true); // adjacent transposition
    expect(withinOneEdit("jon", "john")).toBe(true); // insertion
    expect(withinOneEdit("johnn", "john")).toBe(true); // deletion
    expect(withinOneEdit("jane", "john")).toBe(false); // > 1 edit
    expect(withinOneEdit("abcd", "dcba")).toBe(false); // not adjacent
  });
});

describe("matchGuest", () => {
  it("matches an exact full name (case/spacing-insensitive)", () => {
    const result = matchGuest("  john   SMITH ", GUESTS);
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.guest.guestId).toBe("g001");
    }
  });

  it("matches an accented name typed without accents", () => {
    const result = matchGuest("jose nunez", GUESTS);
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.guest.guestId).toBe("g003");
    }
  });

  it("matches a full name with a single typo", () => {
    const result = matchGuest("Jane Smtih", GUESTS); // typo in "Smith"
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.guest.guestId).toBe("g002");
    }
  });

  it("matches a unique first-name-only entry", () => {
    const result = matchGuest("Priya", GUESTS);
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.guest.guestId).toBe("g006");
    }
  });

  it("returns ambiguous for a first name shared by two guests", () => {
    const result = matchGuest("John", GUESTS); // John Smith + John Baker
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.map((g) => g.guestId).sort()).toEqual([
        "g001",
        "g005",
      ]);
    }
  });

  it("resolves an ambiguous first name once the full name is given", () => {
    const result = matchGuest("John Baker", GUESTS);
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.guest.guestId).toBe("g005");
    }
  });

  it("returns none for an unlisted name", () => {
    expect(matchGuest("Zebediah Quux", GUESTS).status).toBe("none");
  });

  it("returns none for an empty/whitespace name", () => {
    expect(matchGuest("   ", GUESTS).status).toBe("none");
  });

  it("does not over-match a wrong surname", () => {
    // "John Doe" — first token matches two Johns, but "doe" matches no second
    // token of either, so neither is a candidate.
    expect(matchGuest("John Doe", GUESTS).status).toBe("none");
  });
});
