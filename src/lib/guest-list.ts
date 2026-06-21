// Guest List reader — fetches the `official-guest-list` tab and parses it to a
// Guest shape. Same service-account auth as the RSVP reader/writer (google-auth)
// and the read-only Sheets scope, so a key compromise can't be turned into a
// write through this path. Reuses GOOGLE_SHEETS_ID.
//
// This reader runs ONLY at the gate-submit API (issuing the cookie), never in
// middleware — the cookie-verify hot path stays Sheet-free (gate ADR).
//
// The tab is referenced by env var GOOGLE_SHEET_TAB_OFFICIAL_GUEST_LIST. Its
// value is the tab's stable numeric gid (rename-proof — the old scratch tab gets
// renamed, see CONTEXT). The Sheets values API addresses ranges by tab *title*,
// not gid, so a numeric value is resolved gid -> title once via spreadsheet
// metadata; a non-numeric value is treated as a literal tab name (mirrors
// GOOGLE_SHEET_TAB=rsvps), so either form works.

import { getGoogleAccessToken, readEnv } from "./google-auth";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_READ_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";

// Columns, in order: guest_id, name, party_id, side, plus_one_allowed.
export type Guest = {
  guestId: string;
  name: string;
  /**
   * The party this guest shares an invitation with. A blank party_id in the
   * sheet means "party of one" — normalized here to the guest's own guestId so
   * every guest carries a stable, non-empty party key and solos never collapse
   * into one another. Consumers should group by this `partyId`, not re-read the
   * raw (possibly blank) sheet cell.
   */
  partyId: string;
  side: string;
  plusOneAllowed: boolean;
};

/** Fetch and parse the live Guest List. Throws only on a failed sheet fetch. */
export async function readGuestList(): Promise<Guest[]> {
  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabRef = readEnv("GOOGLE_SHEET_TAB_OFFICIAL_GUEST_LIST");
  const accessToken = await getGoogleAccessToken(SHEETS_READ_SCOPE);
  const tabTitle = await resolveTabTitle(sheetId, tabRef, accessToken);

  const range = `${tabTitle}!A:E`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    // Always read fresh — flipping plus_one_allowed or adding a guest must take
    // effect without waiting on an edge cache.
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
 * Resolve a tab reference to a usable A1 title. Numeric -> looked up as a gid
 * via spreadsheet metadata; anything else is returned as a literal tab name.
 */
async function resolveTabTitle(
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
 * rows missing a guest_id or name (can't identify/match them), and never throws
 * on a malformed cell — a bad plus_one_allowed value just reads as FALSE.
 * Exported for unit testing without a live sheet.
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
  ] = raw;

  const guestId = guestIdCell.trim();
  const name = nameCell.trim();
  const partyId = partyIdCell.trim();
  const side = sideCell.trim();

  // Empty row.
  if (!guestId && !name && !partyId && !side && !plusOneCell.trim()) {
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
  };
}

function parseBoolean(cell: string): boolean {
  const value = cell.trim().toLowerCase();
  return value === "true" || value === "yes" || value === "y" || value === "1";
}
