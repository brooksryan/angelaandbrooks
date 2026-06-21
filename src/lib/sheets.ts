// Google Sheets writer — appends RSVP rows to the configured rsvps tab.
//
// The auth flow (service-account JWT → OAuth access token) lives in
// google-auth.ts and is shared with the admin reader. We deliberately do not
// use the `googleapis` npm package — it pulls in Node net/http internals that
// don't run cleanly on Cloudflare Workers. `jose` for JWT signing + native
// `fetch` keeps the Worker bundle small.
//
// The rsvps tab keeps its original columns A:E (timestamp, full_name, attending,
// plus_one_name, dietary_restrictions) and appends F:G (party_id, guest_id) for
// the guest-list-driven fan-out. Column D (plus_one_name) is legacy — in the
// fan-out model a plus-one is its own row (full name in B), so D is written
// empty; the plus-one's guest_id (col G) is the minted/reused id from the RSVP
// write-back (ADR 019eebb3-f8db), no longer empty. A submission fans out to one
// row per answered party member plus one row for a named plus-one, one timestamp.

import { getGoogleAccessToken, readEnv } from "./google-auth";
import type { RsvpRowOut } from "./party-rsvp";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type RsvpRowsWriter = (rows: RsvpRowOut[]) => Promise<void>;

/**
 * Append RSVP rows to the configured Google Sheet in a single call. All rows
 * share one timestamp (the submit time). No-op for an empty list. Throws on any
 * non-2xx response — the handler maps the failure to a user-facing error.
 */
export async function appendRsvpRows(rows: RsvpRowOut[]): Promise<void> {
  if (rows.length === 0) return;

  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabName = readEnv("GOOGLE_SHEET_TAB");
  const accessToken = await getGoogleAccessToken(SHEETS_SCOPE);

  const range = `${tabName}!A:G`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const timestamp = new Date().toISOString();
  const values = rows.map((row) => [
    timestamp,
    row.fullName,
    row.attending ? "Yes" : "No",
    "", // D: legacy plus_one_name — empty in the fan-out model
    row.dietaryRestrictions,
    row.partyId,
    row.guestId,
  ]);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Sheets append failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }
}
