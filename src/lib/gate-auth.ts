// Guest gate session: an HMAC-signed access cookie carrying who came in.
//
// Mirrors the admin-auth crypto pattern (jose HS256 JWT in a cookie) but is a
// completely separate system — its own cookie name and its own GATE_SECRET — so
// the guest gate and the admin login never cross (see the gate ADR).
//
// Two deliberate differences from admin-auth:
//   1. The signing secret is a dedicated `GATE_SECRET`, not derived from a
//      password. There is no guest password to derive from; access is by name
//      match, and the secret only needs to outlive the ~90-day cookie.
//   2. SameSite=Lax (admin uses Strict). A guest may arrive via an emailed or
//      QR-code link to a deep page; Lax lets the existing access cookie ride a
//      top-level GET navigation so they don't hit the gate again. Strict would
//      drop the cookie on a cross-site click and re-wall an already-let-in guest.
//
// The cookie is a snapshot of access (guestId/partyId/matchedAt), not of live
// state — staleness is bounded by the ~90-day expiry. `plus_one_allowed` is the
// one value /rsvp re-reads live; the cookie never carries it.

import {
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type JWTVerifyResult,
} from "jose";

export const GATE_SESSION_COOKIE = "gate-session";

// ~90 days. The access window the couple is comfortable with before a guest has
// to re-enter their name; also the staleness bound on the cookie's snapshot.
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 90;

const textEncoder = new TextEncoder();

function getGateSigningKey(): Uint8Array {
  const seed = process.env.GATE_SECRET ?? "";
  if (seed.length === 0) {
    throw new Error("Gate session secret is empty — set GATE_SECRET.");
  }
  return textEncoder.encode(seed);
}

/** The identity resolved by a name match, carried in the access cookie. */
export type GateSessionInput = {
  guestId: string;
  partyId: string;
  /** When the name matched, seconds since epoch. Defaults to issue time. */
  matchedAt?: number;
};

export type GateSession = {
  guestId: string;
  partyId: string;
  /** When the name matched, seconds since epoch. */
  matchedAt: number;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expires-at, seconds since epoch. */
  exp: number;
};

/**
 * Mint a signed access token. Encodes `{guestId, partyId, matchedAt}` plus
 * standard iat/exp as a JWT. The claims use short keys (gid/pid/mat) only to
 * keep the cookie small.
 */
export async function signGateSession(
  input: GateSessionInput
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const matchedAt = input.matchedAt ?? now;
  return new SignJWT({
    gid: input.guestId,
    pid: input.partyId,
    mat: matchedAt,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_LIFETIME_SECONDS)
    .sign(getGateSigningKey());
}

/**
 * Verify an access cookie value. Returns the session on success or null on any
 * failure (expired, tampered, bad signature, missing, or misconfigured secret).
 * Never throws — middleware verifies on every request and must fail closed
 * (a null here means "show the gate").
 */
export async function verifyGateSession(
  token: string | undefined
): Promise<GateSession | null> {
  if (!token) return null;
  let result: JWTVerifyResult<JWTPayload>;
  try {
    result = await jwtVerify(token, getGateSigningKey(), {
      algorithms: ["HS256"],
    });
  } catch {
    return null;
  }
  const payload = result.payload;
  if (
    typeof payload.gid !== "string" ||
    typeof payload.pid !== "string" ||
    typeof payload.mat !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  return {
    guestId: payload.gid,
    partyId: payload.pid,
    matchedAt: payload.mat,
    iat: payload.iat,
    exp: payload.exp,
  };
}

/**
 * Build the Set-Cookie header value for the access cookie. HttpOnly, SameSite=
 * Lax (see header note), Secure in production, ~90-day Max-Age.
 */
export function buildGateCookie(token: string): string {
  return [
    `${GATE_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_LIFETIME_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Build a Set-Cookie header that immediately clears the access cookie. */
export function buildClearGateCookie(): string {
  return [
    `${GATE_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
