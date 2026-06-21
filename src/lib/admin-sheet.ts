// Read RSVP submissions from the configured Google Sheet for the admin
// dashboard, and join them against the Guest List into a roster. Same
// service-account auth flow as the writer (see google-auth.ts); uses the
// read-only Sheets scope so an account compromise can't be turned into an
// arbitrary write via this code path.
//
// rsvps columns A:G — timestamp, full_name, attending, plus_one_name (legacy,
// empty), dietary_restrictions, party_id, guest_id. The join keys on guest_id.

import { getGoogleAccessToken, readEnv } from "./google-auth";
import { isAddedPlusOne, type Guest } from "./guest-list";

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
  partyId: string;
  guestId: string;
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

  const range = `${tabName}!A:G`;
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
    partyId = "",
    guestId = "",
  ] = raw;

  // Strip empty rows.
  if (
    !timestampCell.trim() &&
    !fullName.trim() &&
    !attendingCell.trim() &&
    !plusOneName.trim() &&
    !dietaryRestrictions.trim() &&
    !partyId.trim() &&
    !guestId.trim()
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
    partyId: partyId.trim(),
    guestId: guestId.trim(),
  };
}

// ── Roster join (eb6f) ──────────────────────────────────────────────────────

export type RosterClass =
  | "invited-replied"
  | "invited-not-replied"
  | "added-plus-one"
  | "legacy-orphan";

export type RosterEntry = {
  guestId: string;
  name: string;
  partyId: string;
  side: string;
  classification: RosterClass;
  /** Latest reply's attending value, or null if not yet replied. */
  attending: boolean | null;
  dietaryRestrictions: string;
  repliedAt: Date | null;
};

export type RosterCounts = {
  invited: number;
  replied: number;
  notReplied: number;
  addedPlusOnes: number;
};

export type Roster = {
  entries: RosterEntry[];
  counts: RosterCounts;
  /** Invited guests who have not replied — for chasing missing RSVPs. */
  notReplied: RosterEntry[];
};

/**
 * Join the Guest List against RSVPs on guest_id (latest-wins per guest_id) and
 * classify every row — none dropped. Pure; exported for testing.
 *
 * - invited-replied / invited-not-replied: an originally-invited guest with or
 *   without a matching RSVP.
 * - added-plus-one: a guest whose Guest List `source == "plus-one"`.
 * - legacy-orphan: an RSVP row whose guest_id matches no guest (or is blank —
 *   e.g. a pre-write-back +1 row). Shown so nothing is silently lost.
 */
export function buildRoster(guests: Guest[], rsvps: RsvpRow[]): Roster {
  // Latest RSVP per non-empty guest_id.
  const latestByGuestId = new Map<string, RsvpRow>();
  for (const row of rsvps) {
    if (!row.guestId) continue;
    const existing = latestByGuestId.get(row.guestId);
    if (!existing || isNewer(row, existing)) {
      latestByGuestId.set(row.guestId, row);
    }
  }

  const entries: RosterEntry[] = [];
  const matchedGuestIds = new Set<string>();

  for (const guest of guests) {
    const reply = latestByGuestId.get(guest.guestId);
    if (reply) matchedGuestIds.add(guest.guestId);

    const classification: RosterClass = isAddedPlusOne(guest)
      ? "added-plus-one"
      : reply
      ? "invited-replied"
      : "invited-not-replied";

    entries.push({
      guestId: guest.guestId,
      name: guest.name,
      partyId: guest.partyId,
      side: guest.side,
      classification,
      attending: reply ? reply.attending : null,
      dietaryRestrictions: reply?.dietaryRestrictions ?? "",
      repliedAt: reply?.timestamp ?? null,
    });
  }

  // Legacy orphans: RSVP rows not consumed by a guest join (blank guest_id, or a
  // guest_id absent from the list). De-dupe by guest_id-or-normalized-name,
  // latest-wins.
  const orphanByKey = new Map<string, { entry: RosterEntry; row: RsvpRow }>();
  for (const row of rsvps) {
    if (row.guestId && matchedGuestIds.has(row.guestId)) continue;
    const key = row.guestId || `name:${row.fullName.trim().toLowerCase()}`;
    const prior = orphanByKey.get(key);
    if (prior) {
      if (isNewer(row, prior.row)) {
        prior.entry.name = row.fullName;
        prior.entry.partyId = row.partyId;
        prior.entry.attending = row.attending;
        prior.entry.dietaryRestrictions = row.dietaryRestrictions;
        prior.entry.repliedAt = row.timestamp;
        prior.row = row;
      }
      continue;
    }
    const entry: RosterEntry = {
      guestId: row.guestId,
      name: row.fullName,
      partyId: row.partyId,
      side: "",
      classification: "legacy-orphan",
      attending: row.attending,
      dietaryRestrictions: row.dietaryRestrictions,
      repliedAt: row.timestamp,
    };
    entries.push(entry);
    orphanByKey.set(key, { entry, row });
  }

  const invited = entries.filter(
    (entry) =>
      entry.classification === "invited-replied" ||
      entry.classification === "invited-not-replied"
  );
  const replied = invited.filter(
    (entry) => entry.classification === "invited-replied"
  );
  const notReplied = invited.filter(
    (entry) => entry.classification === "invited-not-replied"
  );
  const addedPlusOnes = entries.filter(
    (entry) => entry.classification === "added-plus-one"
  );

  return {
    entries,
    counts: {
      invited: invited.length,
      replied: replied.length,
      notReplied: notReplied.length,
      addedPlusOnes: addedPlusOnes.length,
    },
    notReplied,
  };
}

function isNewer(a: RsvpRow, b: RsvpRow): boolean {
  const at = a.timestamp ? a.timestamp.getTime() : 0;
  const bt = b.timestamp ? b.timestamp.getTime() : 0;
  return at >= bt;
}
