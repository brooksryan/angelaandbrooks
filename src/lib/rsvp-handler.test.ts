// Tests for the POST /api/rsvp handler: gate-cookie auth, live-party load, and
// fan-out wiring (the row planning itself is covered in party-rsvp.test.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signGateSession } from "./gate-auth";
import type { Guest } from "./guest-list";
import {
  __resetRsvpDepsForTesting,
  __setGuestListLoaderForTesting,
  __setRsvpWriterForTesting,
  handleRsvpPost,
} from "./rsvp-handler";

const ORIGINAL_ENV = { ...process.env };

function guest(
  guestId: string,
  name: string,
  partyId: string,
  plusOneAllowed = false
): Guest {
  return { guestId, name, partyId, side: "unknown", plusOneAllowed };
}

const PARTY: Guest[] = [
  guest("g001", "John Smith", "p001"),
  guest("g002", "Jane Smith", "p001"),
  // A guest in a different party — must never leak into g001's party.
  guest("g050", "Someone Else", "p050"),
];

async function makeRequest(body: unknown, token?: string): Promise<Request> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.cookie = `gate-session=${token}`;
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.GATE_SECRET = "test-gate-secret";
  __setGuestListLoaderForTesting(async () => PARTY);
});

afterEach(() => {
  __resetRsvpDepsForTesting();
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("handleRsvpPost", () => {
  it("fans out a couple-for-both submission to one row per member", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    __setRsvpWriterForTesting(writer);
    const token = await signGateSession({ guestId: "g001", partyId: "p001" });

    const response = await handleRsvpPost(
      await makeRequest(
        {
          members: [
            { guestId: "g001", attending: "yes", dietaryRestrictions: "" },
            { guestId: "g002", attending: "yes", dietaryRestrictions: "Vegan" },
          ],
        },
        token
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(writer).toHaveBeenCalledTimes(1);
    const rows = writer.mock.calls[0][0];
    expect(rows.map((r: { guestId: string }) => r.guestId)).toEqual([
      "g001",
      "g002",
    ]);
    expect(rows.every((r: { partyId: string }) => r.partyId === "p001")).toBe(
      true
    );
  });

  it("returns 401 and does not write without a valid gate cookie", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      await makeRequest({ members: [{ guestId: "g001", attending: "yes" }] })
    );

    expect(response.status).toBe(401);
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 409 when the cookie's guest is not on the list", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);
    const token = await signGateSession({ guestId: "gXXX", partyId: "pXXX" });

    const response = await handleRsvpPost(
      await makeRequest({ members: [{ guestId: "gXXX", attending: "yes" }] }, token)
    );

    expect(response.status).toBe(409);
    expect(writer).not.toHaveBeenCalled();
  });

  it("only loads the submitter's own party (no cross-party leak)", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    __setRsvpWriterForTesting(writer);
    const token = await signGateSession({ guestId: "g001", partyId: "p001" });

    // Try to answer for g050, who is in a different party — must be ignored.
    await handleRsvpPost(
      await makeRequest(
        {
          members: [
            { guestId: "g001", attending: "yes" },
            { guestId: "g050", attending: "yes" },
          ],
        },
        token
      )
    );

    const rows = writer.mock.calls[0][0];
    expect(rows.map((r: { guestId: string }) => r.guestId)).toEqual(["g001"]);
  });

  it("returns 503 and does not write when the guest list read fails", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);
    __setGuestListLoaderForTesting(async () => {
      throw new Error("sheet down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await signGateSession({ guestId: "g001", partyId: "p001" });

    const response = await handleRsvpPost(
      await makeRequest({ members: [{ guestId: "g001", attending: "yes" }] }, token)
    );

    expect(response.status).toBe(503);
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty answer set without writing", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);
    const token = await signGateSession({ guestId: "g001", partyId: "p001" });

    const response = await handleRsvpPost(
      await makeRequest({ members: [{ guestId: "g001", attending: "" }] }, token)
    );

    expect(response.status).toBe(400);
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 500 with a generic message when the writer throws", async () => {
    const writer = vi.fn().mockRejectedValue(new Error("Sheets append failed"));
    __setRsvpWriterForTesting(writer);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await signGateSession({ guestId: "g001", partyId: "p001" });

    const response = await handleRsvpPost(
      await makeRequest({ members: [{ guestId: "g001", attending: "yes" }] }, token)
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("Sheets append failed");
  });
});
