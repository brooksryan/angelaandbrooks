// Tests for admin auth: credential validation + session cookie sign/verify.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  signAdminSession,
  verifyAdminCredentials,
  verifyAdminSession,
  ADMIN_SESSION_COOKIE,
} from "./admin-auth";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_USER_1 = "brooks";
  process.env.ADMIN_PASS_1 = "brooks-password";
  process.env.ADMIN_USER_2 = "angela";
  process.env.ADMIN_PASS_2 = "angela-password";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("verifyAdminCredentials", () => {
  it("accepts the first credential pair", () => {
    expect(verifyAdminCredentials("brooks", "brooks-password")).toEqual({
      ok: true,
      username: "brooks",
    });
  });

  it("accepts the second credential pair", () => {
    expect(verifyAdminCredentials("angela", "angela-password")).toEqual({
      ok: true,
      username: "angela",
    });
  });

  it("rejects a known username with the wrong password", () => {
    expect(
      verifyAdminCredentials("brooks", "angela-password")
    ).toEqual({ ok: false });
  });

  it("rejects an unknown username", () => {
    expect(
      verifyAdminCredentials("someone-else", "brooks-password")
    ).toEqual({ ok: false });
  });

  it("is case-sensitive on username", () => {
    expect(verifyAdminCredentials("Brooks", "brooks-password")).toEqual({
      ok: false,
    });
  });

  it("rejects non-string inputs without throwing", () => {
    // Force the values past the function's type check.
    expect(
      verifyAdminCredentials(
        undefined as unknown as string,
        "brooks-password"
      )
    ).toEqual({ ok: false });
  });

  it("throws when no credentials are configured", () => {
    delete process.env.ADMIN_USER_1;
    delete process.env.ADMIN_PASS_1;
    delete process.env.ADMIN_USER_2;
    delete process.env.ADMIN_PASS_2;
    expect(() => verifyAdminCredentials("brooks", "brooks-password")).toThrow(
      /No admin credentials/
    );
  });
});

describe("admin session cookie", () => {
  it("round-trips a valid session token", async () => {
    const token = await signAdminSession("brooks");
    const session = await verifyAdminSession(token);
    expect(session?.username).toBe("brooks");
    expect(session?.exp).toBeGreaterThan(session?.iat ?? 0);
  });

  it("returns null for an undefined/empty token", async () => {
    expect(await verifyAdminSession(undefined)).toBeNull();
    expect(await verifyAdminSession("")).toBeNull();
  });

  it("returns null for a tampered token (signature mismatch)", async () => {
    const token = await signAdminSession("brooks");
    const tampered = token.slice(0, -3) + "AAA";
    expect(await verifyAdminSession(tampered)).toBeNull();
  });

  it("returns null when the signing seed has changed", async () => {
    const token = await signAdminSession("brooks");
    // Rotate a password — new signing key means existing session is invalid.
    process.env.ADMIN_PASS_1 = "rotated-password";
    expect(await verifyAdminSession(token)).toBeNull();
  });

  it("buildSessionCookie carries HttpOnly + SameSite=Strict + the cookie name", async () => {
    const token = await signAdminSession("brooks");
    const cookie = buildSessionCookie(token);
    expect(cookie.startsWith(`${ADMIN_SESSION_COOKIE}=${token}`)).toBe(true);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
  });

  it("buildClearSessionCookie expires the cookie immediately", () => {
    const cookie = buildClearSessionCookie();
    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
    expect(cookie).toContain("Max-Age=0");
  });
});
