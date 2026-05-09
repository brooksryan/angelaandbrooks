// Google Sheets writer — appends a single row to the configured RSVP sheet.
//
// Authentication uses a service account: a JWT is signed with the account's
// private key, exchanged for an OAuth access token, and the token is used to
// hit the Sheets `values.append` endpoint. We deliberately do not use the
// `googleapis` npm package — it pulls in Node net/http internals that don't
// run cleanly on Cloudflare Workers. `jose` for JWT signing + native `fetch`
// keeps the Worker bundle small.

import { importPKCS8, SignJWT } from "jose";
import type { RsvpSubmission } from "./rsvp";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const JWT_LIFETIME_SECONDS = 3600;

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

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
  const serviceAccount = parseServiceAccountKey(
    readEnv("GOOGLE_SERVICE_ACCOUNT_KEY")
  );

  const accessToken = await fetchAccessToken(serviceAccount);

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

/**
 * Sign a JWT with the service account's private key and exchange it for an
 * OAuth access token. Tokens are short-lived (1 hour); we mint a fresh one
 * per submission since RSVP volume is tiny (~80 expected over the whole
 * lifecycle of the site).
 */
async function fetchAccessToken(account: ServiceAccountKey): Promise<string> {
  const privateKey = await importPKCS8(account.private_key, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(account.token_uri ?? TOKEN_ENDPOINT)
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_LIFETIME_SECONDS)
    .sign(privateKey);

  const response = await fetch(account.token_uri ?? TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Google token exchange failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("Google token exchange returned no access_token.");
  }
  return body.access_token;
}

function parseServiceAccountKey(base64Key: string): ServiceAccountKey {
  let decoded: string;
  try {
    decoded = atob(base64Key);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid base64. Did you base64-encode the JSON?"
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY decoded base64 is not valid JSON."
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY decoded JSON is not an object.");
  }

  const account = parsed as Partial<ServiceAccountKey>;
  if (!account.client_email || !account.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email or private_key."
    );
  }
  return account as ServiceAccountKey;
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
