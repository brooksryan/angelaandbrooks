// Pure name matcher for the gate: a typed name + the Guest List resolve to
// matched | ambiguous | none. No I/O here — the caller (the gate API) reads the
// list and hands it in, so this is fully unit-testable and never touches the
// Sheet or the request hot path.
//
// Strategy:
//   1. Exact full-name match (after normalization). One hit = matched, several
//      identical full names = ambiguous.
//   2. Otherwise a token match tolerating a single typo per token: every typed
//      token must be within one edit of some distinct guest token. This catches
//      one-typo full names ("Jonh Smith") and first-name-only entries ("John").
//   One surviving candidate = matched, several = ambiguous, none = none.
// Exact-first means a precise full name always beats a fuzzy near-collision.

import type { Guest } from "./guest-list";

export type MatchResult =
  | { status: "matched"; guest: Guest }
  | { status: "ambiguous"; candidates: Guest[] }
  | { status: "none" };

/**
 * Normalize a name for comparison: lowercase, strip accents, drop punctuation,
 * collapse whitespace. "José  P. Núñez" and "jose p nunez" compare equal.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    // Strip combining accent marks (U+0300–U+036F, the NFD-decomposed diacritics).
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Anything that isn't a letter, digit, or space becomes a space.
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}

export function matchGuest(typedName: string, guests: Guest[]): MatchResult {
  const typedNorm = normalizeName(typedName);
  if (typedNorm.length === 0) {
    return { status: "none" };
  }

  // 1. Exact full-name match.
  const exact = guests.filter((guest) => normalizeName(guest.name) === typedNorm);
  if (exact.length === 1) {
    return { status: "matched", guest: exact[0] };
  }
  if (exact.length > 1) {
    return { status: "ambiguous", candidates: exact };
  }

  // 2. Token match tolerating one typo per token.
  const typedTokens = tokenize(typedNorm);
  const candidates = guests.filter((guest) =>
    everyTypedTokenCovered(typedTokens, tokenize(normalizeName(guest.name)))
  );
  if (candidates.length === 1) {
    return { status: "matched", guest: candidates[0] };
  }
  if (candidates.length > 1) {
    return { status: "ambiguous", candidates };
  }
  return { status: "none" };
}

/**
 * True when every typed token matches (within one edit) a distinct guest token.
 * "John" covers ["john","smith"]; "Jon Smith" covers it too; "Bob Smith" does
 * not (no guest token is within one edit of "bob").
 */
function everyTypedTokenCovered(
  typedTokens: string[],
  guestTokens: string[]
): boolean {
  if (typedTokens.length === 0 || typedTokens.length > guestTokens.length) {
    return false;
  }
  const remaining = [...guestTokens];
  for (const typed of typedTokens) {
    const index = remaining.findIndex((guestToken) =>
      withinOneEdit(typed, guestToken)
    );
    if (index === -1) {
      return false;
    }
    // Consume the matched guest token so two typed tokens can't share one.
    remaining.splice(index, 1);
  }
  return true;
}

/**
 * Single-typo check: true when `a` and `b` are equal or one edit apart, where an
 * edit is a substitution, insertion, deletion, OR an adjacent transposition
 * (Damerau / optimal-string-alignment distance ≤ 1). Transpositions matter —
 * "Jonh"→"John" is the commonest real typo and a plain Levenshtein scores it 2.
 * Bounded and allocation-light: skip the common prefix, then the remainder must
 * resolve under exactly one edit.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  // Skip the shared prefix; the first divergence is where the single edit is.
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;

  // Adjacent transposition (same length): swap a[i],a[i+1] and the tail matches.
  if (
    la === lb &&
    i + 1 < la &&
    a[i] === b[i + 1] &&
    a[i + 1] === b[i] &&
    a.slice(i + 2) === b.slice(i + 2)
  ) {
    return true;
  }

  if (la === lb) {
    // Substitution: drop the diverging char on both sides; tail must match.
    return a.slice(i + 1) === b.slice(i + 1);
  }
  if (la < lb) {
    // Insertion into `a`: skip one char of the longer `b`; tail must match.
    return a.slice(i) === b.slice(i + 1);
  }
  // Deletion from `a`: skip one char of the longer `a`; tail must match.
  return a.slice(i + 1) === b.slice(i);
}
