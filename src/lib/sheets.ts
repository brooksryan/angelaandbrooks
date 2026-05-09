// Google Sheets writer — appends a single row to the configured RSVP sheet.
//
// The auth flow (service-account JWT → OAuth access token) lives in
// google-auth.ts and is shared with the admin reader. We deliberately do not
// use the `googleapis` npm package — it pulls in Node net/http internals that
// don't run cleanly on Cloudflare Workers. `jose` for JWT signing + native
// `fetch` keeps the Worker bundle small.

import { getGoogleAccessToken, readEnv } from "./google-auth";
import type { RsvpSubmission } from "./rsvp";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type SheetsWriter = (submission: RsvpSubmission) => Promise<void>;

/**
 * Append an RSVP submission to the configured Google Sheet. Throws on any
 * non-2xx response from Google's APIs — the route handler is responsible for
 * mapping the failure to a user-facing error.
 */
export async function appendRsvpToSheet(
  submission: RsvpSubmission
): Promise<void> {
  const sheetId = readEnv("GOOGLE_SHEETS_ID");
  const tabName = readEnv("GOOGLE_SHEET_TAB");
  const accessToken = await getGoogleAccessToken(SHEETS_SCOPE);

  const range = `${tabName}!A:E`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const row = [
    new Date().toISOString(),
    submission.fullName,
    submission.attending ? "Yes" : "No",
    submission.plusOneName,
    submission.dietaryRestrictions,
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
      `Sheets append failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }
}
