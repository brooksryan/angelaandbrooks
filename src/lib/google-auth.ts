// Shared Google service-account auth — used by both the RSVP writer
// (src/lib/sheets.ts) and the admin reader (src/lib/admin-sheet.ts).
// Decodes the base64 service-account JSON, signs a short-lived RS256 JWT
// with `jose`, and exchanges it for an OAuth access token. Workers-friendly:
// no `Buffer`, no `googleapis`, just `atob` + native fetch + Web Crypto.

import { importPKCS8, SignJWT } from "jose";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWT_LIFETIME_SECONDS = 3600;

export type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

/**
 * Mint an access token for the given OAuth scope using the service account
 * private key. Tokens are short-lived (1 hour) and minted per-request because
 * traffic is tiny enough that caching adds complexity without saving anything
 * meaningful.
 */
export async function getGoogleAccessToken(scope: string): Promise<string> {
  const account = parseServiceAccountKey(
    readEnv("GOOGLE_SERVICE_ACCOUNT_KEY")
  );
  const privateKey = await importPKCS8(account.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const tokenEndpoint = account.token_uri ?? TOKEN_ENDPOINT;

  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(tokenEndpoint)
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_LIFETIME_SECONDS)
    .sign(privateKey);

  const response = await fetch(tokenEndpoint, {
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

export function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
