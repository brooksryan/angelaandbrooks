// Tests for the guest gate session: access-cookie sign/verify + cookie builders.
// Mirrors admin-auth.test.ts — valid issue/verify, tamper rejection, expiry.

import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildClearGateCookie,
  buildGateCookie,
  GATE_SESSION_COOKIE,
  signGateSession,
  verifyGateSession,
} from "./gate-auth";

const ORIGINAL_ENV = { ...process.env };
const GATE_SECRET = "test-gate-secret-please-rotate";

beforeEach(() => {
  process.env.GATE_SECRET = GATE_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("gate session sign/verify", () => {
  it("round-trips a valid access token with its identity", async () => {
    const token = await signGateSession({
      guestId: "g042",
      partyId: "p007",
    });
    const session = await verifyGateSession(token);
    expect(session?.guestId).toBe("g042");
    expect(session?.partyId).toBe("p007");
    expect(session?.exp).toBeGreaterThan(session?.iat ?? 0);
    // matchedAt defaults to issue time when not supplied.
    expect(session?.matchedAt).toBe(session?.iat);
  });

  it("preserves an explicit matchedAt", async () => {
    const matchedAt = 1_700_000_000;
    const token = await signGateSession({
      guestId: "g1",
      partyId: "p1",
      matchedAt,
    });
    const session = await verifyGateSession(token);
    expect(session?.matchedAt).toBe(matchedAt);
  });

  it("returns null for an undefined/empty token", async () => {
    expect(await verifyGateSession(undefined)).toBeNull();
    expect(await verifyGateSession("")).toBeNull();
  });

  it("returns null for a tampered token (signature mismatch)", async () => {
    const token = await signGateSession({ guestId: "g1", partyId: "p1" });
    const tampered = token.slice(0, -3) + "AAA";
    expect(await verifyGateSession(tampered)).toBeNull();
  });

  it("returns null when the signing secret has changed", async () => {
    const token = await signGateSession({ guestId: "g1", partyId: "p1" });
    // Rotating GATE_SECRET invalidates every existing access cookie.
    process.env.GATE_SECRET = "a-different-secret";
    expect(await verifyGateSession(token)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Hand-sign a token whose exp is already in the past, same secret.
    const expired = await new SignJWT({ gid: "g1", pid: "p1", mat: now - 200 })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now - 200)
      .setExpirationTime(now - 100)
      .sign(new TextEncoder().encode(GATE_SECRET));
    expect(await verifyGateSession(expired)).toBeNull();
  });

  it("returns null for a token missing the identity claims", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Valid signature + expiry, but no gid/pid/mat — must be rejected.
    const bare = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new TextEncoder().encode(GATE_SECRET));
    expect(await verifyGateSession(bare)).toBeNull();
  });

  it("verify fails closed when GATE_SECRET is missing (no throw)", async () => {
    const token = await signGateSession({ guestId: "g1", partyId: "p1" });
    delete process.env.GATE_SECRET;
    // Middleware calls verify on every request; a missing secret must mean
    // "show the gate", never a thrown 500.
    expect(await verifyGateSession(token)).toBeNull();
  });

  it("signing throws when GATE_SECRET is missing", async () => {
    delete process.env.GATE_SECRET;
    await expect(
      signGateSession({ guestId: "g1", partyId: "p1" })
    ).rejects.toThrow(/GATE_SECRET/);
  });
});

describe("gate cookie builders", () => {
  it("buildGateCookie carries HttpOnly + SameSite=Lax + the cookie name", async () => {
    const token = await signGateSession({ guestId: "g1", partyId: "p1" });
    const cookie = buildGateCookie(token);
    expect(cookie.startsWith(`${GATE_SESSION_COOKIE}=${token}`)).toBe(true);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("buildClearGateCookie expires the cookie immediately", () => {
    const cookie = buildClearGateCookie();
    expect(cookie).toContain(`${GATE_SESSION_COOKIE}=`);
    expect(cookie).toContain("Max-Age=0");
  });
});
