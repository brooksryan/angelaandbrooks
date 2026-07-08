// Guest List reader/writer — the `official-guest-list` tab. Same service-account
// auth as the RSVP reader/writer (google-auth); reuses GOOGLE_SHEETS_ID. The
// READ path uses the read-only scope; the APPEND path (adding a +1 as a guest,
// ADR 019eebb3-f8db) uses the read-write scope.
//
// The read runs ONLY at the gate-submit API and the RSVP submit/admin paths,
// never in middleware — the cookie-verify hot path stays Sheet-free (gate ADR).
//
// Tab reference: env var GOOGLE_SHEET_TAB_OFFICIAL_GUEST_LIST. Its value is the
// tab's stable numeric gid (rename-proof); the Sheets values API addresses
// ranges by tab *title*, so a numeric value is resolved gid -> title once via
// spreadsheet metadata; a non-numeric value is treated as a literal tab name.
//
// Columns A:F — guest_id, name, party_id, side, plus_one_allowed, source.
// `source` is additive (ADR 019eebb3-f8db): blank ⇒ "invitation" (the original
// 65 rows), "plus-one" ⇒ a guest added via RSVP write-back. is_plus_one is now
// derived from source == "plus-one" (no longer from an empty guest_id).

import { getGoogleAccessToken, readEnv } from "./google-auth";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_READ_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_RW_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type Guest = {
  guestId: string;
  name: string;
  /**
   * The party this guest shares an invitation with. A blank party_id in the
   * sheet means "party of one" — normalized here to the guest's own guestId so
   * every guest carries a stable, non-empty party key and solos never collapse
   * into one another. Consumers should group by this `partyId`.
   */
  partyId: string;
  side: string;
  plusOneAllowed: boolean;
  /**
   * How this guest entered the list. "invitation" for the original allowlist
   * rows (blank in the sheet), "plus-one" for guests added via RSVP write-back.
   * Optional in the type so other constructors need not set it; the reader
   * always populates it (blank ⇒ "invitation").
   */
  source?: string;
};

/** A guest added via RSVP write-back (vs. an originally-invited guest). */
export function isAddedPlusOne(guest: Guest): boolean {
  return guest.source === "plus-one";
}

/** Fields for a new Guest List row appended via RSVP write-back. */
export type NewGuestListEntry = {
  guestId: string;
  name: string;
  partyId: string;
  side: string;
  plusOneAllowed: boolean;
  source: string;
};

/** Fetch and parse the live Guest List. Throws only on a failed sheet fetch. */
export async function readGuestList(): Promise<Guest[]> {
  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabRef = readEnv("GOOGLE_SHEET_TAB_OFFICIAL_GUEST_LIST");
  const accessToken = await getGoogleAccessToken(SHEETS_READ_SCOPE);
  const tabTitle = await resolveTabTitle(sheetId, tabRef, accessToken);

  const range = `${tabTitle}!A:F`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    // Always read fresh — a flipped plus_one_allowed or a just-added guest must
    // take effect without waiting on an edge cache.
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Guest list read failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  const body = (await response.json()) as { values?: string[][] };
  return parseGuestRows(body.values ?? []);
}

/**
 * Append a guest to the Guest List (RSVP write-back for a named +1). Append-only
 * — never edits existing rows. Throws on a failed write; the caller maps it.
 */
export async function appendGuestToList(
  entry: NewGuestListEntry
): Promise<void> {
  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabRef = readEnv("GOOGLE_SHEET_TAB_OFFICIAL_GUEST_LIST");
  const accessToken = await getGoogleAccessToken(SHEETS_RW_SCOPE);
  const tabTitle = await resolveTabTitle(sheetId, tabRef, accessToken);

  const range = `${tabTitle}!A:F`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const row = [
    entry.guestId,
    entry.name,
    entry.partyId,
    entry.side,
    entry.plusOneAllowed ? "TRUE" : "FALSE",
    entry.source,
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Guest list append failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }
}

/**
 * Next sequential guest_id (`gNNN`) given the current list — `max(NNN) + 1`,
 * zero-padded to the widest existing id (min 3). Pure; exported for testing.
 */
export function nextGuestId(guests: Guest[]): string {
  let max = 0;
  let width = 3;
  for (const guest of guests) {
    const match = /^g(\d+)$/i.exec(guest.guestId);
    if (!match) continue;
    const value = Number(match[1]);
    if (value > max) max = value;
    if (match[1].length > width) width = match[1].length;
  }
  return `g${String(max + 1).padStart(width, "0")}`;
}

/**
 * Resolve a tab reference to a usable A1 title. Numeric -> looked up as a gid
 * via spreadsheet metadata; anything else is returned as a literal tab name.
 * Shared with the plus_one_names reference log (ADR 019f4079-fa3a).
 */
export async function resolveTabTitle(
  sheetId: string,
  tabRef: string,
  accessToken: string
): Promise<string> {
  const ref = tabRef.trim();
  if (!/^\d+$/.test(ref)) {
    return ref;
  }
  const gid = Number(ref);
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}?fields=sheets(properties(sheetId,title))`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Guest list tab lookup failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }
  const body = (await response.json()) as {
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  };
  const match = (body.sheets ?? []).find(
    (sheet) => sheet.properties?.sheetId === gid
  );
  if (!match?.properties?.title) {
    throw new Error(`Guest list tab not found for gid ${gid}.`);
  }
  return match.properties.title;
}

/**
 * Pure parse of raw sheet rows to Guests. Skips empty and header rows, drops
 * rows missing a guest_id or name, and never throws on a malformed cell — a bad
 * plus_one_allowed reads FALSE, a blank source reads "invitation". Exported for
 * unit testing without a live sheet.
 */
export function parseGuestRows(rows: string[][]): Guest[] {
  return rows
    .map(rawRowToGuest)
    .filter((guest): guest is Guest => guest !== null);
}

function rawRowToGuest(raw: string[]): Guest | null {
  const [
    guestIdCell = "",
    nameCell = "",
    partyIdCell = "",
    sideCell = "",
    plusOneCell = "",
    sourceCell = "",
  ] = raw;

  const guestId = guestIdCell.trim();
  const name = nameCell.trim();
  const partyId = partyIdCell.trim();
  const side = sideCell.trim();

  // Empty row.
  if (
    !guestId &&
    !name &&
    !partyId &&
    !side &&
    !plusOneCell.trim() &&
    !sourceCell.trim()
  ) {
    return null;
  }

  // Header row (matches the generator's `guest_id, name, …` header).
  const lowerId = guestId.toLowerCase();
  const lowerName = name.toLowerCase();
  if (
    (lowerId === "guest_id" || lowerId === "guestid" || lowerId === "id") &&
    (lowerName === "name" || lowerName === "full name" || lowerName === "full_name")
  ) {
    return null;
  }

  // A guest we can't identify or match against is not usable — drop, don't throw.
  if (!guestId || !name) {
    return null;
  }

  return {
    guestId,
    name,
    // Blank party_id => party of one, keyed by the guest's own id.
    partyId: partyId || guestId,
    side,
    plusOneAllowed: parseBoolean(plusOneCell),
    // Blank source => an originally-invited guest.
    source: sourceCell.trim().toLowerCase() || "invitation",
  };
}

function parseBoolean(cell: string): boolean {
  const value = cell.trim().toLowerCase();
  return value === "true" || value === "yes" || value === "y" || value === "1";
}
