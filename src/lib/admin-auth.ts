// Admin authentication: credential check + signed session cookie.
//
// Two credential pairs are supported (`ADMIN_USER_1` + `ADMIN_PASS_1` and
// `ADMIN_USER_2` + `ADMIN_PASS_2`) so Brooks and Angela have independent
// access. Either pair authenticates.
//
// Session state lives in a signed cookie. The signing secret is derived from
// `ADMIN_PASS_1 + ADMIN_PASS_2` so that rotating either password invalidates
// existing sessions automatically — that means we don't need a separate
// `ADMIN_SESSION_SECRET` env var, and "logout everywhere" is two `wrangler
// secret put` commands rather than a custom invalidation flow.

import {
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type JWTVerifyResult,
} from "jose";

export const ADMIN_SESSION_COOKIE = "admin-session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24; // 24 hours

const textEncoder = new TextEncoder();

export type CredentialCheckResult =
  | { ok: true; username: string }
  | { ok: false };

type AdminCredential = { user: string; pass: string };

function readAdminCredentials(): AdminCredential[] {
  const creds: AdminCredential[] = [];
  for (const suffix of ["1", "2"] as const) {
    const user = process.env[`ADMIN_USER_${suffix}`];
    const pass = process.env[`ADMIN_PASS_${suffix}`];
    if (user && pass) creds.push({ user, pass });
  }
  if (creds.length === 0) {
    throw new Error(
      "No admin credentials configured. Set ADMIN_USER_1/ADMIN_PASS_1 (and optionally _2)."
    );
  }
  return creds;
}

/**
 * Constant-time comparison of two strings. Avoids leaking match length via
 * timing — a low-stakes paranoia given the threat model (~80 guests, no real
 * adversary expected) but cheap to do right.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validate a username/password against either configured credential pair.
 * Returns the matched username on success — never echo the input straight back
 * because case-insensitive match isn't guaranteed.
 */
export function verifyAdminCredentials(
  username: string,
  password: string
): CredentialCheckResult {
  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false };
  }
  for (const cred of readAdminCredentials()) {
    if (
      timingSafeEqual(cred.user, username) &&
      timingSafeEqual(cred.pass, password)
    ) {
      return { ok: true, username: cred.user };
    }
  }
  return { ok: false };
}

function getSessionSigningKey(): Uint8Array {
  // Derive the secret from both passwords concatenated. Rotating either
  // password invalidates all existing sessions (a feature, not a bug).
  const seed =
    (process.env.ADMIN_PASS_1 ?? "") + ":" + (process.env.ADMIN_PASS_2 ?? "");
  if (seed.length < 2) {
    throw new Error(
      "Admin session secret seed is empty — set ADMIN_PASS_1/ADMIN_PASS_2."
    );
  }
  return textEncoder.encode(seed);
}

export type AdminSession = {
  username: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expires-at, seconds since epoch. */
  exp: number;
};

/** Mint a signed session token. Encodes `{username, iat, exp}` as a JWT. */
export async function signAdminSession(username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(username)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_LIFETIME_SECONDS)
    .sign(getSessionSigningKey());
}

/**
 * Verify a session cookie value. Returns the payload on success or null on
 * any failure (expired, tampered, bad signature, missing). Never throws.
 */
export async function verifyAdminSession(
  token: string | undefined
): Promise<AdminSession | null> {
  if (!token) return null;
  let result: JWTVerifyResult<JWTPayload>;
  try {
    result = await jwtVerify(token, getSessionSigningKey(), {
      algorithms: ["HS256"],
    });
  } catch {
    return null;
  }
  const payload = result.payload;
  if (
    typeof payload.sub !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  return { username: payload.sub, iat: payload.iat, exp: payload.exp };
}

/**
 * Build the Set-Cookie header value for the session. Worker-friendly Path/
 * Domain (none — defaults to current host), HttpOnly, Secure (in production),
 * SameSite=Strict.
 */
export function buildSessionCookie(token: string): string {
  return [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_LIFETIME_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Build a Set-Cookie header that immediately clears the session. */
export function buildClearSessionCookie(): string {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
