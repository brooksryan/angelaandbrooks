// Read RSVP submissions from the configured Google Sheet for the admin
// dashboard. Same service-account auth flow as the writer (see google-auth.ts);
// uses the read-only Sheets scope so an account compromise can't be turned into
// an arbitrary write via this code path.

import { getGoogleAccessToken, readEnv } from "./google-auth";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_READ_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export type RsvpRow = {
  /** Original ISO timestamp string from the sheet. */
  timestampIso: string;
  /** Parsed Date — null if the cell wasn't a parseable timestamp. */
  timestamp: Date | null;
  fullName: string;
  attending: boolean | null;
  plusOneName: string;
  dietaryRestrictions: string;
};

export type RsvpReader = () => Promise<RsvpRow[]>;

/**
 * Fetch all RSVP rows from the configured sheet. Skips empty rows and any row
 * whose first cell looks like a header (case-insensitive "timestamp" or "name"
 * — matches whatever Brooks/Angela add to row 1 by hand).
 */
export async function readRsvpsFromSheet(): Promise<RsvpRow[]> {
  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabName = readEnv("GOOGLE_SHEET_TAB");
  const accessToken = await getGoogleAccessToken(SHEETS_READ_SCOPE);

  const range = `${tabName}!A:E`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // Always read fresh — no Worker-edge caching of guest list state.
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Sheets read failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  const body = (await response.json()) as { values?: string[][] };
  const rows = body.values ?? [];
  return rows.map(rawRowToRsvp).filter((row): row is RsvpRow => row !== null);
}

function rawRowToRsvp(raw: string[]): RsvpRow | null {
  const [
    timestampCell = "",
    fullName = "",
    attendingCell = "",
    plusOneName = "",
    dietaryRestrictions = "",
  ] = raw;

  // Strip empty rows.
  if (
    !timestampCell.trim() &&
    !fullName.trim() &&
    !attendingCell.trim() &&
    !plusOneName.trim() &&
    !dietaryRestrictions.trim()
  ) {
    return null;
  }

  // Strip a header row if present.
  const firstCellLower = timestampCell.trim().toLowerCase();
  const secondCellLower = fullName.trim().toLowerCase();
  if (
    (firstCellLower === "timestamp" || firstCellLower === "submitted at") &&
    (secondCellLower === "full name" ||
      secondCellLower === "name" ||
      secondCellLower === "full_name")
  ) {
    return null;
  }

  const parsedDate = new Date(timestampCell);
  const validDate = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;

  const attendingNormalized = attendingCell.trim().toLowerCase();
  const attending =
    attendingNormalized === "yes" || attendingNormalized === "y" || attendingNormalized === "true"
      ? true
      : attendingNormalized === "no" || attendingNormalized === "n" || attendingNormalized === "false"
      ? false
      : null;

  return {
    timestampIso: timestampCell,
    timestamp: validDate,
    fullName: fullName.trim(),
    attending,
    plusOneName: plusOneName.trim(),
    dietaryRestrictions: dietaryRestrictions.trim(),
  };
}
