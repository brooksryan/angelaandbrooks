// Tests for middleware: HTTPS redirect + HSTS (slice 019eebbd-bce2) without
// breaking the gate rewrite or the /admin + /api/admin exemptions.

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { middleware } from "./middleware";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Unauthed paths don't need it, but set it so verify never throws.
  process.env.GATE_SECRET = "test-gate-secret";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function request(url: string, proto?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (proto) headers["x-forwarded-proto"] = proto;
  return new NextRequest(url, { headers });
}

const HSTS = "Strict-Transport-Security";

describe("middleware HTTPS + HSTS", () => {
  it("308-redirects a plain-http request to https", async () => {
    const response = await middleware(
      request("http://angelaandbrooks.com/rsvp", "http")
    );
    expect(response.status).toBe(308);
    const location = response.headers.get("location");
    expect(location).toBe("https://angelaandbrooks.com/rsvp");
  });

  it("adds HSTS to an exempt (gate) response and does not redirect", async () => {
    const response = await middleware(
      request("https://angelaandbrooks.com/gate", "https")
    );
    expect(response.status).not.toBe(308);
    expect(response.headers.get(HSTS)).toContain("max-age=");
    expect(response.headers.get(HSTS)).toContain("includeSubDomains");
  });

  it("keeps /admin and /api/admin exempt (no gate rewrite), with HSTS", async () => {
    for (const path of ["/admin", "/admin/login", "/api/admin/login"]) {
      const response = await middleware(
        request(`https://angelaandbrooks.com${path}`, "https")
      );
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get(HSTS)).toContain("max-age=");
    }
  });

  it("rewrites an unauthenticated guest route to /gate, with HSTS", async () => {
    const response = await middleware(
      request("https://angelaandbrooks.com/details", "https")
    );
    const rewrite = response.headers.get("x-middleware-rewrite");
    expect(rewrite).toContain("/gate");
    expect(response.headers.get(HSTS)).toContain("max-age=");
  });

  it("passes through when x-forwarded-proto is absent (local dev)", async () => {
    const response = await middleware(request("http://localhost:3000/gate"));
    // No redirect on a missing proto header — only an explicit "http" redirects.
    expect(response.status).not.toBe(308);
  });
});
